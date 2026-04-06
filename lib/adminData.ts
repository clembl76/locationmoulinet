import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabaseAdmin'

// Uses anon key + run_sql RPC (same approach as the Python agent)
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

async function runSql<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const { data, error } = await db().rpc('run_sql', { query: sql })
  if (error) throw new Error(error.message)
  return (data as T[]) ?? []
}

// Exported for use in other server-only modules (e.g. quittance.ts)
export async function runSqlAdmin<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  return runSql<T>(sql)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminApartment = {
  id: string
  number: string
  type: string
  surface_area: number
  floor_label: string | null
  rent_including_charges: number
  building_address: string
  building_short_name: string
  tenant_last_name: string | null
  tenant_first_name: string | null
  tenant_phone: string | null
  tenant_email: string | null
  lease_id: string | null
  move_in_date: string | null
  move_out_date: string | null
  has_rent_this_month: boolean
  paid_this_month: boolean
}

export type AdminTransaction = {
  id: string
  date: string
  amount: number
  direction: 'CREDIT' | 'DEBIT'
  type: string | null
  payment_method: string | null
  description: string | null
  reference: string | null
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export type DashboardStats = {
  total: number
  occupied: number
  available: number
  soon: number
  departures: Array<{
    number: string
    tenant_name: string
    move_out_date: string
    days_until: number
  }>
  paymentPie: {
    countPaid: number
    countUnpaid: number
    amountPaid: number
    amountUnpaid: number
  }
  caYtd: number
  tauxOccupationMoyen: number
  dureeMoyenneAns: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const in30days = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  // Main apartment rows — paid_this_month basé uniquement sur rents.amount_received
  const rows = await runSql<{
    number: string
    has_active_lease: boolean
    move_out_date: string | null
    tenant_last_name: string | null
    tenant_first_name: string | null
    paid_this_month: boolean
    amount_expected: number | null
    amount_received: number | null
  }>(`
    SELECT * FROM (
      SELECT DISTINCT ON (a.id)
        a.number,
        (l.id IS NOT NULL) AS has_active_lease,
        l.move_out_inspection_date AS move_out_date,
        t.last_name AS tenant_last_name,
        t.first_name AS tenant_first_name,
        r.amount_expected,
        r.amount_received,
        (r.amount_received IS NOT NULL) AS paid_this_month
      FROM apartments a
      LEFT JOIN leases l ON l.apartment_id = a.id
        AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
      LEFT JOIN lease_tenants lt ON lt.lease_id = l.id
      LEFT JOIN tenants t ON t.id = lt.tenant_id
      LEFT JOIN rents r ON r.lease_id = l.id AND r.year = ${year} AND r.month = ${month}
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type != 'BUREAU'
      ORDER BY a.id
    ) sub
    ORDER BY number::integer
  `)

  const total = rows.length
  const occupied = rows.filter(r => r.has_active_lease && !r.move_out_date).length
  const soon = rows.filter(r => r.has_active_lease && r.move_out_date).length
  const available = rows.filter(r => !r.has_active_lease).length

  const departures = rows
    .filter(r => r.move_out_date && r.move_out_date >= today && r.move_out_date <= in30days)
    .map(r => ({
      number: r.number,
      tenant_name: [r.tenant_first_name, r.tenant_last_name].filter(Boolean).join(' '),
      move_out_date: r.move_out_date!,
      days_until: Math.ceil((new Date(r.move_out_date!).getTime() - now.getTime()) / (24 * 3600 * 1000)),
    }))

  // Pie chart: locataires actifs sans départ prévu ayant un loyer généré ce mois
  const withRent = rows.filter(r => r.has_active_lease && !r.move_out_date && r.amount_expected != null)
  const paymentPie = {
    countPaid: withRent.filter(r => r.paid_this_month).length,
    countUnpaid: withRent.filter(r => !r.paid_this_month).length,
    amountPaid: withRent.filter(r => r.paid_this_month).reduce((s, r) => s + (r.amount_received ?? 0), 0),
    amountUnpaid: withRent.filter(r => !r.paid_this_month).reduce((s, r) => s + (r.amount_expected ?? 0), 0),
  }

  // CA YTD + average occupation + average duration — one query each
  const [[caRow], [tauxRow], [dureeRow]] = await Promise.all([
    runSql<{ ca_ytd: number }>(`
      SELECT COALESCE(SUM(amount_received), 0) AS ca_ytd
      FROM rents
      WHERE year = ${year} AND amount_received IS NOT NULL
    `),
    runSql<{ taux_moyen: number }>(`
      WITH months AS (
        SELECT generate_series(1, ${month}) AS m
      ),
      total_apts AS (
        SELECT COUNT(DISTINCT a.id)::float AS n
        FROM apartments a
        WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
          AND a.type != 'BUREAU'
      ),
      occ AS (
        SELECT
          m.m,
          COUNT(DISTINCT l.apartment_id)::float AS occupied
        FROM months m
        LEFT JOIN leases l ON
          l.move_in_inspection_date <= make_date(${year}::int, m.m::int, 28)
          AND (l.move_out_inspection_date IS NULL
               OR l.move_out_inspection_date >= make_date(${year}::int, m.m::int, 1))
        JOIN apartments a ON a.id = l.apartment_id AND a.type != 'BUREAU'
        GROUP BY m.m
      )
      SELECT ROUND(
        (AVG(100.0 * occ.occupied / NULLIF((SELECT n FROM total_apts), 0)))::numeric, 0
      ) AS taux_moyen
      FROM occ
    `),
    runSql<{ duree_moy: number }>(`
      SELECT ROUND(
        AVG(
          (COALESCE(move_out_inspection_date, CURRENT_DATE)::date - move_in_inspection_date::date)::float / 365.0
        )::numeric, 1
      ) AS duree_moy
      FROM leases
      WHERE move_in_inspection_date IS NOT NULL
    `),
  ])

  return {
    total,
    occupied,
    available,
    soon,
    departures,
    paymentPie,
    caYtd: Number(caRow?.ca_ytd ?? 0),
    tauxOccupationMoyen: Number(tauxRow?.taux_moyen ?? 0),
    dureeMoyenneAns: Number(dureeRow?.duree_moy ?? 0),
  }
}

// ─── Apartment list ───────────────────────────────────────────────────────────

export async function getAdminApartments(): Promise<AdminApartment[]> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return runSql<AdminApartment>(`
    SELECT * FROM (
      SELECT DISTINCT ON (a.id)
        a.id,
        a.number,
        a.type,
        a.surface_area,
        a.floor_label,
        a.rent_including_charges,
        b.address AS building_address,
        b.short_name AS building_short_name,
        t.last_name AS tenant_last_name,
        t.first_name AS tenant_first_name,
        t.phone AS tenant_phone,
        t.email AS tenant_email,
        l.id AS lease_id,
        l.move_in_inspection_date AS move_in_date,
        l.move_out_inspection_date AS move_out_date,
        EXISTS (
          SELECT 1 FROM rents r
          WHERE r.lease_id = l.id AND r.year = ${year} AND r.month = ${month}
        ) AS has_rent_this_month,
        EXISTS (
          SELECT 1 FROM rents r
          WHERE r.lease_id = l.id AND r.year = ${year} AND r.month = ${month}
            AND r.amount_received IS NOT NULL
        ) AS paid_this_month
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      LEFT JOIN leases l ON l.apartment_id = a.id
        AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
      LEFT JOIN lease_tenants lt ON lt.lease_id = l.id
      LEFT JOIN tenants t ON t.id = lt.tenant_id
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type != 'BUREAU'
      ORDER BY a.id
    ) sub
    ORDER BY number::integer
  `)
}

// ─── Apartment detail ─────────────────────────────────────────────────────────

export type AdminApartmentDetail = AdminApartment & {
  mezzanine: boolean | null
  orientation: string | null
  description: string | null
  rent_excluding_charges: number | null
  charges: number | null
  signing_date: string | null
  tenant_id: string | null
  tenant_title: string | null
}

export async function getAdminApartmentDetail(number: string): Promise<AdminApartmentDetail | null> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const rows = await runSql<AdminApartmentDetail>(`
    SELECT DISTINCT ON (a.id)
      a.id,
      a.number,
      a.type,
      a.surface_area,
      a.floor_label,
      a.mezzanine,
      a.orientation,
      a.description,
      a.rent_including_charges,
      a.rent_excluding_charges,
      a.charges,
      b.address AS building_address,
      b.short_name AS building_short_name,
      t.id AS tenant_id,
      t.title AS tenant_title,
      t.last_name AS tenant_last_name,
      t.first_name AS tenant_first_name,
      t.phone AS tenant_phone,
      t.email AS tenant_email,
      l.id AS lease_id,
      l.signing_date,
      l.move_in_inspection_date AS move_in_date,
      l.move_out_inspection_date AS move_out_date,
      EXISTS (
        SELECT 1 FROM rents r
        WHERE r.lease_id = l.id AND r.year = ${year} AND r.month = ${month}
          AND r.amount_received IS NOT NULL
      ) AS paid_this_month
    FROM apartments a
    JOIN buildings b ON b.id = a.building_id
    LEFT JOIN leases l ON l.apartment_id = a.id
      AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
    LEFT JOIN lease_tenants lt ON lt.lease_id = l.id
    LEFT JOIN tenants t ON t.id = lt.tenant_id
    WHERE a.number = '${number}'
    ORDER BY a.id
    LIMIT 1
  `)

  return rows[0] ?? null
}

export async function getApartmentTransactions(
  number: string,
  tenantLastName: string | null,
  limitCount = 24
): Promise<AdminTransaction[]> {
  // Si pas de locataire courant, aucune transaction à afficher
  if (!tenantLastName) return []

  return runSql<AdminTransaction>(`
    SELECT tx.id, tx.date, tx.amount, tx.direction, tx.type, tx.payment_method, tx.description, tx.reference
    FROM transactions tx
    WHERE tx.apartment_num = '${number}'
      AND tx.supplier ILIKE '%${tenantLastName.replace(/'/g, "''")}%'
      AND tx.type ILIKE ANY(ARRAY['%loyer%', '%caution%'])
    ORDER BY tx.date DESC
    LIMIT ${limitCount}
  `)
}

// ─── Rents (loyers attendus) ──────────────────────────────────────────────────

export type RentRecord = {
  id: string
  lease_id: string
  year: number
  month: number
  amount_expected: number
  is_prorata: boolean
  prorata_days: number | null
  days_in_month: number
  amount_received: number | null
  received_at: string | null
  notes: string | null
}

export async function getRentForMonth(
  leaseId: string,
  year: number,
  month: number
): Promise<RentRecord | null> {
  const rows = await runSql<RentRecord>(`
    SELECT id, lease_id, year, month, amount_expected, is_prorata, prorata_days, days_in_month,
           amount_received, received_at, notes
    FROM rents
    WHERE lease_id = '${leaseId}' AND year = ${year} AND month = ${month}
    LIMIT 1
  `)
  return rows[0] ?? null
}

export async function generateMonthlyRents(
  year: number,
  month: number
): Promise<{ inserted: number; skipped: number; total: number }> {
  // Bornes du mois
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay = new Date(Date.UTC(year, month, 0))
  const daysInMonth = lastDay.getUTCDate()
  const firstDayStr = firstDay.toISOString().slice(0, 10)
  const lastDayStr = lastDay.toISOString().slice(0, 10)

  // Tous les baux actifs ce mois (signing_date pour l'arrivée, move_out pour le départ)
  const leases = await runSql<{
    lease_id: string
    rent_including_charges: number
    signing_date: string | null
    move_out_date: string | null
  }>(`
    SELECT
      l.id AS lease_id,
      l.rent_including_charges,
      l.signing_date::text AS signing_date,
      l.move_out_inspection_date::text AS move_out_date
    FROM leases l
    JOIN apartments a ON a.id = l.apartment_id
    WHERE a.type != 'BUREAU'
      AND l.signing_date <= '${lastDayStr}'::date
      AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= '${firstDayStr}'::date)
  `)

  const records = leases.map(l => {
    // Utiliser UTC pour éviter les décalages de fuseau
    const signing = l.signing_date ? new Date(l.signing_date + 'T00:00:00Z') : null
    const moveOut = l.move_out_date ? new Date(l.move_out_date + 'T00:00:00Z') : null

    const signingThisMonth = signing
      && signing.getUTCFullYear() === year
      && signing.getUTCMonth() + 1 === month

    const moveOutThisMonth = moveOut
      && moveOut.getUTCFullYear() === year
      && moveOut.getUTCMonth() + 1 === month

    let prorataFrom = 1         // jour de début (inclusif)
    let prorataTo = daysInMonth // jour de fin (inclusif)
    let isProrata = false

    if (signingThisMonth && signing) { prorataFrom = signing.getUTCDate(); isProrata = true }
    if (moveOutThisMonth && moveOut) { prorataTo = moveOut.getUTCDate(); isProrata = true }

    const prorataDays = prorataTo - prorataFrom + 1
    const amount = isProrata
      ? Math.round((prorataDays / daysInMonth) * l.rent_including_charges * 100) / 100
      : l.rent_including_charges

    return {
      lease_id: l.lease_id,
      year,
      month,
      amount_expected: amount,
      is_prorata: isProrata,
      prorata_days: isProrata ? prorataDays : null,
      days_in_month: daysInMonth,
    }
  })

  if (records.length === 0) return { inserted: 0, skipped: 0, total: 0 }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rents')
    .upsert(records, { onConflict: 'lease_id,year,month', ignoreDuplicates: true })
    .select('id')

  if (error) throw new Error(error.message)

  const inserted = (data ?? []).length
  return { inserted, skipped: records.length - inserted, total: records.length }
}

// ─── Seed test rents (données de test — à supprimer ensuite) ──────────────────

export async function seedTestRents(): Promise<{ total: number }> {
  // 1. Génère les loyers attendus pour jan/fév/mars 2025 (idempotent)
  for (const { year, month } of [
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
  ]) {
    await generateMonthlyRents(year, month)
  }

  // 2. Récupère toutes les lignes jan/fév/mars 2025 pour connaître amount_expected
  const toUpdate = await runSql<{ id: string; amount_expected: number; year: number; month: number }>(`
    SELECT id, amount_expected, year, month
    FROM rents
    WHERE year = 2026 AND month IN (1, 2, 3)
  `)

  // 3. Met à jour chaque ligne via le client admin (run_sql = SELECT only)
  const admin = createAdminClient()
  for (const row of toUpdate) {
    const receivedAt = `2026-${String(row.month).padStart(2, '0')}-05`
    await admin
      .from('rents')
      .update({
        amount_received: row.amount_expected,
        received_at: receivedAt,
        notes: 'TEST — données de seed',
      })
      .eq('id', row.id)
  }

  return { total: toUpdate.length }
}
