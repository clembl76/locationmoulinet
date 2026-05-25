'use server'

import { runSqlAdmin } from '@/lib/adminData'
import { createAdminClient } from '@/lib/supabaseAdmin'
import type { EdlKey } from '@/lib/adminData'

export async function getKeyTypesAction(): Promise<string[]> {
  const rows = await runSqlAdmin<{ label: string }>(
    `SELECT label FROM key_type ORDER BY id`,
  )
  return rows.map(r => r.label)
}

export async function getApartmentKeysAction(apartmentId: string): Promise<EdlKey[]> {
  return runSqlAdmin<EdlKey>(`
    SELECT id, key_type, quantity, quantity_exit, order_index
    FROM apartment_keys
    WHERE apartment_id = '${apartmentId}'
    ORDER BY order_index
  `)
}

export async function addApartmentKeyAction(
  apartmentId: string,
  keyType: string,
  quantity: number,
): Promise<{ ok: true; key: EdlKey } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const maxIdx = await runSqlAdmin<{ max: number | null }>(
      `SELECT MAX(order_index) AS max FROM apartment_keys WHERE apartment_id = '${apartmentId}'`,
    )
    const nextIdx = (maxIdx[0]?.max ?? -1) + 1
    const { data, error } = await admin
      .from('apartment_keys')
      .insert({ apartment_id: apartmentId, key_type: keyType, quantity, order_index: nextIdx })
      .select('id, key_type, quantity, quantity_exit, order_index')
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, key: data as EdlKey }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateApartmentKeyQuantityAction(keyId: string, quantity: number): Promise<void> {
  const admin = createAdminClient()
  await admin.from('apartment_keys').update({ quantity }).eq('id', keyId)
}

export async function deleteApartmentKeyAction(keyId: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('apartment_keys').delete().eq('id', keyId)
}
