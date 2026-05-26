'use server'

import { runSqlAdmin } from '@/lib/adminData'
import { createAdminClient } from '@/lib/supabaseAdmin'
import type { EdlInstallation } from '@/lib/adminData'

export type LeaseDates = {
  move_in_date: string | null
  move_out_date: string | null
  deposit: number | null
}

export type EdlFigeHeader = {
  building_address: string
  building_short_name: string
  apartment_number: string
  tenant_title: string | null
  tenant_first_name: string
  tenant_last_name: string
  tenant_birth_date: string | null
  tenant_birth_place: string | null
  tenant_address: string | null
  tenant_phone: string | null
  tenant_email: string | null
  owner_title: string | null
  owner_first_name: string
  owner_last_name: string
  owner_birth_date: string | null
  owner_birth_place: string | null
  owner_address: string | null
  owner_phone: string | null
  owner_email: string | null
}

export async function getLeaseDatesAction(leaseId: string): Promise<LeaseDates> {
  const rows = await runSqlAdmin<LeaseDates>(`
    SELECT move_in_inspection_date AS move_in_date, move_out_inspection_date AS move_out_date, deposit
    FROM leases WHERE id = '${leaseId}'
  `)
  return rows[0] ?? { move_in_date: null, move_out_date: null, deposit: null }
}

export async function getEdlFigeHeaderAction(leaseId: string): Promise<EdlFigeHeader | null> {
  const rows = await runSqlAdmin<EdlFigeHeader>(`
    SELECT DISTINCT ON (l.id)
      b.address               AS building_address,
      b.short_name            AS building_short_name,
      a.number                AS apartment_number,
      t.title                 AS tenant_title,
      t.first_name            AS tenant_first_name,
      t.last_name             AS tenant_last_name,
      t.birth_date::text      AS tenant_birth_date,
      t.birth_place           AS tenant_birth_place,
      t.address               AS tenant_address,
      t.phone                 AS tenant_phone,
      t.email                 AS tenant_email,
      o.title                 AS owner_title,
      o.first_name            AS owner_first_name,
      o.last_name             AS owner_last_name,
      o.birth_date::text      AS owner_birth_date,
      o.birth_place           AS owner_birth_place,
      o.personal_address      AS owner_address,
      o.phone                 AS owner_phone,
      o.email                 AS owner_email
    FROM leases l
    JOIN apartments a      ON a.id = l.apartment_id
    JOIN buildings b       ON b.id = a.building_id
    JOIN owners o          ON o.id = b.owner_id
    JOIN lease_tenants lt  ON lt.lease_id = l.id
    JOIN tenants t         ON t.id = lt.tenant_id
    WHERE l.id = '${leaseId}'
    ORDER BY l.id, t.last_name
    LIMIT 1
  `)
  return rows[0] ?? null
}

export async function updateInstallationAction(
  apartmentId: string,
  hot_water: string | null,
  heating: string | null,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('apartment_installation')
    .upsert(
      { apartment_id: apartmentId, hot_water, heating },
      { onConflict: 'apartment_id' },
    )
}

export async function updateChargesTypeAction(
  apartmentId: string,
  charges_type: string,
  meter_readings: string | null,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('apartment_installation')
    .upsert(
      { apartment_id: apartmentId, charges_type, meter_readings },
      { onConflict: 'apartment_id' },
    )
}

export async function getInstallationAction(apartmentId: string): Promise<EdlInstallation | null> {
  const rows = await runSqlAdmin<EdlInstallation>(`
    SELECT hot_water, heating, charges_type, meter_readings, deposit_notes FROM apartment_installation
    WHERE apartment_id = '${apartmentId}' LIMIT 1
  `)
  return rows[0] ?? null
}

export async function updateDepositNotesAction(
  apartmentId: string,
  deposit_notes: string | null,
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('apartment_installation')
    .upsert(
      { apartment_id: apartmentId, deposit_notes },
      { onConflict: 'apartment_id' },
    )
}
