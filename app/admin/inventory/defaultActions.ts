'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'
import { DEFAULT_INVENTORY, DEFAULT_EDL } from '@/app/admin/inventory/defaultData'

export async function fillDefaultAction(
  apartmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    const inventoryRows = DEFAULT_INVENTORY.map(item => ({
      apartment_id: apartmentId,
      item_id: item.item_id,
      room: item.room,
      quantity: item.quantity,
      condition: item.condition,
      notes: null,
    }))

    const { error: invError } = await admin.from('inventory').insert(inventoryRows)
    if (invError) throw new Error(invError.message)

    const surfaceRows = DEFAULT_EDL.map(s => ({
      apartment_id: apartmentId,
      surface: s.surface,
      room: s.room,
      material: s.material,
      condition: s.condition,
      notes: null,
    }))

    const { error: surfError } = await admin.from('surfaces').insert(surfaceRows)
    if (surfError) throw new Error(surfError.message)

    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
