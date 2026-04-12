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
  caCurrentMonth: number
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

  const caCurrentMonth = rows
    .filter(r => r.amount_received != null)
    .reduce((s, r) => s + Number(r.amount_received ?? 0), 0)

  return {
    total,
    occupied,
    available,
    soon,
    departures,
    paymentPie,
    caYtd: Number(caRow?.ca_ytd ?? 0),
    caCurrentMonth,
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
  lease_insurance_attestation: boolean
  lease_id_for_deposit: string | null
  lease_deposit: number | null
  lease_deposit_paid: boolean
  lease_docusign_lease_url: string | null
  lease_docusign_edl_url: string | null
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
      COALESCE(l.insurance_attestation, FALSE) AS lease_insurance_attestation,
      l.id AS lease_id,
      l.id AS lease_id_for_deposit,
      l.deposit AS lease_deposit,
      COALESCE(l.deposit_paid, FALSE) AS lease_deposit_paid,
      l.docusign_lease_url AS lease_docusign_lease_url,
      l.docusign_edl_url AS lease_docusign_edl_url,
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
      AND tx.type::text ILIKE ANY(ARRAY['%loyer%', '%caution%'])
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

// ─── All transactions (page Payments) ────────────────────────────────────────

export type AllTransactionRow = {
  id: string
  date: string
  amount: number
  direction: 'CREDIT' | 'DEBIT'
  supplier: string | null
  type: string | null
  description: string | null
  apartment_num: string | null
  has_active_tenant: boolean
}

export async function getAllTransactions(): Promise<AllTransactionRow[]> {
  return runSql<AllTransactionRow>(`
    SELECT
      tx.id,
      tx.date,
      tx.amount,
      tx.direction,
      tx.supplier,
      tx.type,
      tx.description,
      tx.apartment_num,
      (l.id IS NOT NULL) AS has_active_tenant
    FROM transactions tx
    LEFT JOIN apartments a ON a.number = tx.apartment_num::text
    LEFT JOIN leases l ON l.apartment_id = a.id
      AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
    ORDER BY tx.date DESC, tx.id DESC
  `)
}

// ─── Garant ───────────────────────────────────────────────────────────────────

export type AdminGuarantor = {
  id: string
  title: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

export async function getGuarantorForLease(leaseId: string): Promise<AdminGuarantor | null> {
  // guarantors.tenant_id → tenants, pas de lease_id direct → passer par lease_tenants
  const rows = await runSql<AdminGuarantor>(`
    SELECT g.id, g.title, g.first_name, g.last_name, g.email, g.phone
    FROM guarantors g
    JOIN lease_tenants lt ON lt.tenant_id = g.tenant_id
    WHERE lt.lease_id = '${leaseId}'
    LIMIT 1
  `)
  return rows[0] ?? null
}

// ─── EDL (État des lieux) ─────────────────────────────────────────────────────

export type EdlReport = {
  id: string
  lease_id: string
  entry_date: string | null
  exit_date: string | null
  notes: string | null
  created_at: string
}

export type EdlInstallation = {
  hot_water: string | null
  heating: string | null
}

export type EdlKey = {
  id: string
  key_type: string
  quantity: number
  quantity_exit: number | null
  order_index: number
}

export type EdlElement = {
  id: string
  room: string
  element: string
  condition_entry: string | null
  comment_entry: string | null
  condition_exit: string | null
  comment_exit: string | null
  order_index: number
}

export type EdlItem = {
  id: string
  room: string
  item: string
  quantity_entry: number | null
  condition_entry: string | null
  comment_entry: string | null
  quantity_exit: number | null
  condition_exit: string | null
  comment_exit: string | null
  order_index: number
}

export type EdlTenant = {
  id: string
  title: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  address: string | null
}

export type EdlGuarantor = {
  id: string
  title: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  address: string | null
}

export type EdlPageData = {
  report: EdlReport
  installation: EdlInstallation | null
  keys: EdlKey[]
  elements: EdlElement[]
  items: EdlItem[]
  tenant: EdlTenant | null
  guarantor: EdlGuarantor | null
}

export async function getEdlReport(leaseId: string): Promise<EdlReport | null> {
  const rows = await runSql<EdlReport>(`
    SELECT id, lease_id, entry_date, exit_date, notes, created_at
    FROM check_in_reports
    WHERE lease_id = '${leaseId}'
    LIMIT 1
  `)
  return rows[0] ?? null
}

export async function createEdlReport(leaseId: string, entryDate: string): Promise<EdlReport> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('check_in_reports')
    .upsert({ lease_id: leaseId, entry_date: entryDate }, { onConflict: 'lease_id' })
    .select('id, lease_id, entry_date, exit_date, notes, created_at')
    .single()
  if (error) throw new Error(error.message)
  return data as EdlReport
}

export async function getEdlPageData(reportId: string, apartmentId: string): Promise<EdlPageData | null> {
  // Phase 1 : récupérer le rapport pour avoir lease_id
  const reportRows = await runSql<EdlReport>(`
    SELECT id, lease_id, entry_date, exit_date, notes, created_at
    FROM check_in_reports WHERE id = '${reportId}' LIMIT 1
  `)
  if (!reportRows[0]) return null
  const report = reportRows[0]

  // Phase 2 : tout le reste en parallèle
  const [installRows, keyRows, elementRows, itemRows, tenantRows, guarantorRows] = await Promise.all([
    runSql<EdlInstallation>(`
      SELECT hot_water, heating FROM apartment_installation
      WHERE apartment_id = '${apartmentId}' LIMIT 1
    `),
    runSql<EdlKey>(`
      SELECT id, key_type, quantity, quantity_exit, order_index FROM apartment_keys
      WHERE apartment_id = '${apartmentId}' ORDER BY order_index
    `).catch(() => runSql<EdlKey>(`
      SELECT id, key_type, quantity, NULL::integer AS quantity_exit, order_index FROM apartment_keys
      WHERE apartment_id = '${apartmentId}' ORDER BY order_index
    `)),
    runSql<EdlElement>(`
      SELECT id, room, element, condition_entry, comment_entry,
             condition_exit, comment_exit, order_index
      FROM check_in_elements
      WHERE apartment_id = '${apartmentId}'
      ORDER BY order_index
    `),
    runSql<EdlItem>(`
      SELECT id, room, item, quantity_entry, condition_entry, comment_entry,
             quantity_exit, condition_exit, comment_exit, order_index
      FROM inventory_items
      WHERE apartment_id = '${apartmentId}'
      ORDER BY order_index
    `),
    runSql<EdlTenant>(`
      SELECT t.id, t.title, t.first_name, t.last_name, t.email, t.phone,
             t.birth_date::text AS birth_date, t.birth_place, t.address
      FROM lease_tenants lt
      JOIN tenants t ON t.id = lt.tenant_id
      WHERE lt.lease_id = '${report.lease_id}'
      LIMIT 1
    `).catch(() => [] as EdlTenant[]),
    runSql<EdlGuarantor>(`
      SELECT id, title, first_name, last_name, email, phone,
             birth_date::text AS birth_date, birth_place, address
      FROM guarantors
      WHERE lease_id = '${report.lease_id}'
      LIMIT 1
    `).catch(() => [] as EdlGuarantor[]),
  ])

  return {
    report,
    installation: installRows[0] ?? null,
    keys: keyRows,
    elements: elementRows,
    items: itemRows,
    tenant: tenantRows[0] ?? null,
    guarantor: guarantorRows[0] ?? null,
  }
}

// ─── Visitors ─────────────────────────────────────────────────────────────────

export type AvailableApartment = {
  id: string
  number: string
  type: string
  surface_area: number
  floor_label: string | null
  rent_including_charges: number
  building_address: string
  building_short_name: string
  status: 'available' | 'coming_soon'
  available_from: string | null
}

export async function getAvailableApartments(): Promise<AvailableApartment[]> {
  return runSql<AvailableApartment>(`
    SELECT * FROM (
      SELECT
        a.id, a.number, a.type, a.surface_area, a.floor_label,
        a.rent_including_charges,
        b.address AS building_address,
        b.short_name AS building_short_name,
        'available' AS status,
        NULL::text AS available_from
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type::text != 'BUREAU'
        AND NOT EXISTS (
          SELECT 1 FROM leases l
          WHERE l.apartment_id = a.id
            AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
        )

      UNION ALL

      SELECT
        a.id, a.number, a.type, a.surface_area, a.floor_label,
        a.rent_including_charges,
        b.address AS building_address,
        b.short_name AS building_short_name,
        'coming_soon' AS status,
        l.move_out_inspection_date::text AS available_from
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      JOIN leases l ON l.apartment_id = a.id
        AND l.move_out_inspection_date >= CURRENT_DATE
        AND l.move_out_inspection_date <= CURRENT_DATE + INTERVAL '3 months'
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type::text != 'BUREAU'
    ) sub
    ORDER BY sub.status ASC, sub.number::integer
  `)
}

// ─── Candidats ────────────────────────────────────────────────────────────────

export type CandidateApartment = AvailableApartment & {
  move_out_date: string | null  // alias pour filtrage côté client
}

// Retourne les appartements disponibles pour une candidature (vacant ou bientôt libre)
export async function getApartmentsForCandidature(): Promise<CandidateApartment[]> {
  const apts = await getAvailableApartments()
  return apts.map(a => ({ ...a, move_out_date: a.available_from }))
}

export type AdminVisitor = {
  id: string
  last_name: string
  first_name: string
  email: string
  phone: string | null
  visit_date: string
  visit_time: string
  desired_duration_months: number | null
  comments: string | null
  status: string
  created_at: string
  apartment_numbers: string
}

export async function getAdminVisitors(): Promise<AdminVisitor[]> {
  return runSql<AdminVisitor>(`
    SELECT
      v.id, v.last_name, v.first_name, v.email, v.phone,
      v.visit_date::text, v.visit_time::text,
      v.desired_duration_months, v.comments,
      v.status::text AS status, v.created_at::text,
      COALESCE(
        STRING_AGG(a.number, ', ' ORDER BY a.number::integer),
        '—'
      ) AS apartment_numbers
    FROM visitors v
    LEFT JOIN visitor_apartments va ON va.visitor_id = v.id
    LEFT JOIN apartments a ON a.id = va.apartment_id
    GROUP BY v.id
    ORDER BY v.visit_date DESC, v.visit_time DESC
  `)
}

// ─── Mise en location dashboard ───────────────────────────────────────────────

export type LettingKpis = {
  pending_visits: string
  total_visits: string
  pending_applications: string
  total_applications: string
}

export type LettingApartment = {
  id: string
  number: string
  floor_label: string | null
  rent_including_charges: number
  building_short_name: string
  status: 'available' | 'coming_soon'
  available_from: string | null
  visit_count: string
  candidate_count: string
}

export type LettingCandidate = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  application_id: string
  status: string
  desired_signing_date: string | null
  created_at: string
  apartment_number: string
  floor_label: string | null
  has_guarantor: boolean
}

export type LettingVisit = {
  id: string
  last_name: string
  first_name: string
  email: string
  phone: string | null
  visit_date: string
  visit_time: string
  status: string
  created_at: string
  apartment_numbers: string
}

export type CandidateDetail = {
  candidate_id: string
  title: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  address: string | null
  family_status: string | null
  created_at: string
  application_id: string
  status: string
  desired_signing_date: string | null
  apartment_number: string
  floor_label: string | null
  rent_including_charges: number
  // Visiteur lié (peut être null si pas de lien)
  visitor_id: string | null
  visitor_visit_date: string | null
  visitor_visit_time: string | null
  visitor_total_income: number | null
  visitor_comments: string | null
  visitor_desired_duration_months: number | null
  visitor_studies_at: string | null
}

export type CandidateGuarantor = {
  title: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  birth_date: string | null
  birth_place: string | null
  address: string | null
}

export type CandidateDocument = {
  owner: string
  file_name: string | null
  drive_url: string | null
}

export async function getLettingKpis(): Promise<LettingKpis> {
  const rows = await runSql<LettingKpis>(`
    SELECT
      (SELECT COUNT(*) FROM visitors WHERE status::text = 'pending')::text AS pending_visits,
      (SELECT COUNT(*) FROM visitors)::text AS total_visits,
      (SELECT COUNT(*) FROM candidate_applications WHERE status::text = 'pending')::text AS pending_applications,
      (SELECT COUNT(*) FROM candidate_applications)::text AS total_applications
  `)
  return rows[0] ?? { pending_visits: '0', total_visits: '0', pending_applications: '0', total_applications: '0' }
}

export async function getLettingApartments(): Promise<LettingApartment[]> {
  return runSql<LettingApartment>(`
    SELECT
      sub.id, sub.number, sub.floor_label,
      sub.rent_including_charges,
      sub.building_short_name, sub.status, sub.available_from,
      COUNT(DISTINCT va.visitor_id)::text AS visit_count,
      COUNT(DISTINCT ca.id)::text AS candidate_count
    FROM (
      SELECT
        a.id, a.number, a.floor_label, a.rent_including_charges,
        b.short_name AS building_short_name,
        'available' AS status, NULL::text AS available_from
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type::text != 'BUREAU'
        AND NOT EXISTS (
          SELECT 1 FROM leases l
          WHERE l.apartment_id = a.id
            AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
        )
      UNION ALL
      SELECT
        a.id, a.number, a.floor_label, a.rent_including_charges,
        b.short_name AS building_short_name,
        'coming_soon' AS status,
        l.move_out_inspection_date::text AS available_from
      FROM apartments a
      JOIN buildings b ON b.id = a.building_id
      JOIN leases l ON l.apartment_id = a.id
        AND l.move_out_inspection_date >= CURRENT_DATE
        AND l.move_out_inspection_date <= CURRENT_DATE + INTERVAL '3 months'
      WHERE (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
        AND a.type::text != 'BUREAU'
    ) sub
    LEFT JOIN visitor_apartments va ON va.apartment_id = sub.id
    LEFT JOIN candidate_applications ca ON ca.apartment_id = sub.id
    GROUP BY sub.id, sub.number, sub.floor_label, sub.rent_including_charges,
             sub.building_short_name, sub.status, sub.available_from
    ORDER BY sub.status ASC, sub.number::integer
  `)
}

export async function getRecentCandidates(): Promise<LettingCandidate[]> {
  return runSql<LettingCandidate>(`
    SELECT
      c.id, c.first_name, c.last_name, c.email, c.phone,
      ca.id AS application_id, ca.status::text AS status,
      ca.desired_signing_date::date::text,
      ca.created_at::date::text AS created_at,
      a.number AS apartment_number, a.floor_label,
      EXISTS (SELECT 1 FROM candidate_guarantors cg WHERE cg.candidate_id = c.id) AS has_guarantor
    FROM candidates c
    JOIN candidate_applications ca ON ca.candidate_id = c.id
    JOIN apartments a ON a.id = ca.apartment_id
    ORDER BY ca.created_at DESC
    LIMIT 30
  `)
}

export async function getRecentVisits(): Promise<LettingVisit[]> {
  return runSql<LettingVisit>(`
    SELECT
      v.id, v.last_name, v.first_name, v.email, v.phone,
      v.visit_date::text, v.visit_time::text,
      v.status::text AS status, v.created_at::text,
      COALESCE(
        STRING_AGG(a.number, ', ' ORDER BY a.number::integer),
        '—'
      ) AS apartment_numbers
    FROM visitors v
    LEFT JOIN visitor_apartments va ON va.visitor_id = v.id
    LEFT JOIN apartments a ON a.id = va.apartment_id
    GROUP BY v.id
    ORDER BY v.visit_date DESC, v.visit_time DESC
  `)
}

export async function getCandidateDetail(applicationId: string): Promise<CandidateDetail | null> {
  const rows = await runSql<CandidateDetail>(`
    SELECT
      c.id AS candidate_id,
      c.title, c.first_name, c.last_name, c.email, c.phone,
      c.birth_date::date::text, c.birth_place, c.address, c.family_status,
      ca.created_at::date::text AS created_at,
      ca.id AS application_id, ca.status::text AS status,
      ca.desired_signing_date::date::text,
      a.number AS apartment_number, a.floor_label, a.rent_including_charges,
      ca.visitor_id,
      v.visit_date::date::text AS visitor_visit_date,
      v.visit_time::text AS visitor_visit_time,
      v.total_income AS visitor_total_income,
      v.comments AS visitor_comments,
      v.desired_duration_months AS visitor_desired_duration_months,
      v.studies_at AS visitor_studies_at
    FROM candidates c
    JOIN candidate_applications ca ON ca.candidate_id = c.id
    JOIN apartments a ON a.id = ca.apartment_id
    LEFT JOIN visitors v ON v.id = ca.visitor_id
    WHERE ca.id = '${applicationId}'
    LIMIT 1
  `)
  return rows[0] ?? null
}

export async function getCandidateGuarantor(candidateId: string): Promise<CandidateGuarantor | null> {
  const rows = await runSql<CandidateGuarantor>(`
    SELECT title, first_name, last_name, email, phone,
           birth_date::text, birth_place, address
    FROM candidate_guarantors
    WHERE candidate_id = '${candidateId}'
    LIMIT 1
  `)
  return rows[0] ?? null
}

export async function getCandidateDocuments(applicationId: string): Promise<CandidateDocument[]> {
  return runSql<CandidateDocument>(`
    SELECT owner, file_name, drive_url
    FROM candidate_documents
    WHERE application_id = '${applicationId}'
    ORDER BY owner, file_name
  `)
}

// ─── Disponibilités visites ───────────────────────────────────────────────────

export type VisitSettings = {
  id: string
  active: boolean
  slot_duration_minutes: number
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_website: string | null
}

export type VisitAvailabilityRule = {
  id: string
  day_of_week: number  // 0=Lundi … 6=Dimanche
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
}

export type VisitAvailabilityException = {
  id: string
  date: string          // "YYYY-MM-DD"
  label: string | null
  start_time: string | null  // "HH:MM" — null = journée entière
  end_time: string | null    // "HH:MM" — null = journée entière
}

export async function getVisitSettings(): Promise<VisitSettings> {
  try {
    const rows = await runSql<VisitSettings>(`
      SELECT id, active, slot_duration_minutes,
             contact_name, contact_phone, contact_email, contact_website
      FROM visit_settings LIMIT 1
    `)
    return rows[0] ?? { id: '', active: false, slot_duration_minutes: 30, contact_name: null, contact_phone: null, contact_email: null, contact_website: null }
  } catch {
    return { id: '', active: false, slot_duration_minutes: 30, contact_name: null, contact_phone: null, contact_email: null, contact_website: null }
  }
}

export async function getVisitAvailabilityRules(): Promise<VisitAvailabilityRule[]> {
  try {
    return await runSql<VisitAvailabilityRule>(`
      SELECT id, day_of_week, start_time::text AS start_time, end_time::text AS end_time
      FROM visit_availability_rules
      ORDER BY day_of_week, start_time
    `)
  } catch {
    return []
  }
}

export async function getVisitAvailabilityExceptions(): Promise<VisitAvailabilityException[]> {
  try {
    return await runSql<VisitAvailabilityException>(`
      SELECT id, date::date::text AS date, label,
             start_time::text AS start_time, end_time::text AS end_time
      FROM visit_availability_exceptions
      ORDER BY date
    `)
  } catch {
    return []
  }
}

export async function checkCautionTransaction(aptNumber: string): Promise<boolean> {
  const rows = await runSql<{ count: string }>(`
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE apartment_num = '${aptNumber}'
      AND type::text ILIKE '%caution%'
      AND direction::text = 'CREDIT'
  `)
  return Number(rows[0]?.count ?? 0) > 0
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
