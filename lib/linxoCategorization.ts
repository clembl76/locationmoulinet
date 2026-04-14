import { createAdminClient } from './supabaseAdmin'
import { runSqlAdmin } from './adminData'

type Mapping = { libelle_pattern: string; type: string; supplier: string }

type TenantInfo = {
  last_name: string
  first_name: string | null
  apartment_num: string
  rent_including_charges: number | null
}

type GuarantorInfo = {
  last_name: string
  tenant_last_name: string
  apartment_num: string
}

type CategorizedResult = {
  supplier: string | null
  type: string | null
  description: string | null
  apartment_num: string | null
  tenant_name: string | null
}

const MONTH_LABELS: Record<number, string> = {
  1: 'janv.', 2: 'févr.', 3: 'mars', 4: 'avr.',
  5: 'mai', 6: 'juin', 7: 'juil.', 8: 'août',
  9: 'sept.', 10: 'oct.', 11: 'nov.', 12: 'déc.',
}

function monthLabel(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const m = d.getMonth() + 1
  return `${MONTH_LABELS[m] ?? ''} ${d.getFullYear()}`
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export async function runCategorization(): Promise<{ updated: number; errors: string[] }> {
  const admin = createAdminClient()
  const errors: string[] = []

  // 1. Fetch all non-validated transactions
  const { data: txRows, error: txErr } = await admin
    .from('transactions_linxo')
    .select('id, libelle, notes, montant, date')
    .eq('validated', false)

  if (txErr) return { updated: 0, errors: [txErr.message] }
  const transactions = txRows ?? []

  // 2. Fetch tenants with their apartment
  const tenants = await runSqlAdmin<TenantInfo>(`
    SELECT DISTINCT ON (t.id)
      t.last_name,
      t.first_name,
      a.number AS apartment_num,
      l.rent_including_charges
    FROM tenants t
    JOIN lease_tenants lt ON lt.tenant_id = t.id
    JOIN leases l ON l.id = lt.lease_id
    JOIN apartments a ON a.id = l.apartment_id
    WHERE l.move_out_inspection_date IS NULL
    ORDER BY t.id
  `)

  // 3. Fetch guarantors with their tenant's apartment
  const guarantors = await runSqlAdmin<GuarantorInfo>(`
    SELECT DISTINCT ON (g.id)
      g.last_name,
      t.last_name AS tenant_last_name,
      a.number AS apartment_num
    FROM guarantors g
    JOIN tenants t ON t.id = g.tenant_id
    JOIN lease_tenants lt ON lt.tenant_id = t.id
    JOIN leases l ON l.id = lt.lease_id
    JOIN apartments a ON a.id = l.apartment_id
    WHERE l.move_out_inspection_date IS NULL
    ORDER BY g.id
  `)

  // 4. Fetch mappings (ordered by pattern length desc for most-specific-first matching)
  const mappings = await runSqlAdmin<Mapping>(`
    SELECT libelle_pattern, type, supplier
    FROM linxo_mappings
    ORDER BY length(libelle_pattern) DESC
  `)

  let updated = 0

  for (const tx of transactions) {
    const result = categorize(tx, tenants, guarantors, mappings)
    if (!result.supplier && !result.type) continue

    const { error: upErr } = await admin
      .from('transactions_linxo')
      .update({
        supplier: result.supplier,
        type: result.type,
        description: result.description,
        apartment_num: result.apartment_num,
        tenant_name: result.tenant_name,
      })
      .eq('id', tx.id)

    if (upErr) {
      errors.push(`${tx.id}: ${upErr.message}`)
    } else {
      updated++
    }
  }

  return { updated, errors }
}

function categorize(
  tx: { libelle: string | null; notes: string | null; montant: number | null; date: string | null },
  tenants: TenantInfo[],
  guarantors: GuarantorInfo[],
  mappings: Mapping[],
): CategorizedResult {
  const haystack = normalize(`${tx.libelle ?? ''} ${tx.notes ?? ''}`)

  // Rule 1: tenant name match
  for (const t of tenants) {
    if (!t.last_name || t.last_name.length < 3) continue
    if (haystack.includes(normalize(t.last_name))) {
      const mois = monthLabel(tx.date)
      const desc = tx.montant != null && t.rent_including_charges != null &&
        Math.abs(tx.montant - t.rent_including_charges) < 1
        ? `LOYER - ${t.apartment_num} - ${t.last_name.toUpperCase()} - ${mois}`
        : null
      return {
        supplier: t.last_name.toUpperCase(),
        type: 'LOYER',
        description: desc,
        apartment_num: t.apartment_num,
        tenant_name: [t.first_name, t.last_name].filter(Boolean).join(' '),
      }
    }
  }

  // Rule 2: guarantor name match → same apartment as their tenant
  for (const g of guarantors) {
    if (!g.last_name || g.last_name.length < 3) continue
    if (haystack.includes(normalize(g.last_name))) {
      return {
        supplier: g.last_name.toUpperCase(),
        type: 'LOYER',
        description: null,
        apartment_num: g.apartment_num,
        tenant_name: g.tenant_last_name,
      }
    }
  }

  // Rule 3: mapping table match (longest pattern first)
  for (const m of mappings) {
    if (haystack.includes(normalize(m.libelle_pattern))) {
      return {
        supplier: m.supplier,
        type: m.type,
        description: null,
        apartment_num: null,
        tenant_name: null,
      }
    }
  }

  return { supplier: null, type: null, description: null, apartment_num: null, tenant_name: null }
}

// Called when validating a transaction: learn a new mapping if none exists
export async function learnMapping(
  libelle: string | null,
  supplier: string | null,
  type: string | null,
): Promise<void> {
  if (!libelle || !supplier || !type) return
  const admin = createAdminClient()

  // Check if any existing mapping matches this libellé
  const existing = await runSqlAdmin<{ id: string }>(`
    SELECT id FROM linxo_mappings
    WHERE '${libelle.replace(/'/g, "''")}' ILIKE '%' || libelle_pattern || '%'
    LIMIT 1
  `)

  if (existing.length === 0) {
    await admin.from('linxo_mappings').insert({
      libelle_pattern: libelle,
      type,
      supplier,
    })
  }
}
