'use server'

import { runSqlAdmin } from '@/lib/adminData'
import { createAdminClient } from '@/lib/supabaseAdmin'
import type { EdlInstallation } from '@/lib/adminData'

export type LeaseDates = {
  move_in_date: string | null
  move_out_date: string | null
  deposit: number | null
}

export async function getLeaseDatesAction(leaseId: string): Promise<LeaseDates> {
  const rows = await runSqlAdmin<LeaseDates>(`
    SELECT move_in_inspection_date AS move_in_date, move_out_inspection_date AS move_out_date, deposit
    FROM leases WHERE id = '${leaseId}'
  `)
  return rows[0] ?? { move_in_date: null, move_out_date: null, deposit: null }
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

export async function getInstallationAction(apartmentId: string): Promise<EdlInstallation | null> {
  const rows = await runSqlAdmin<EdlInstallation>(`
    SELECT hot_water, heating FROM apartment_installation
    WHERE apartment_id = '${apartmentId}' LIMIT 1
  `)
  return rows[0] ?? null
}
