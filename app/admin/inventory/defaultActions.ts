'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'
import { DEFAULT_INVENTORY, DEFAULT_EDL, DEFAULT_INVENTORY_NAMED } from '@/app/admin/inventory/defaultData'

export async function fillDefaultAction(
  apartmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    // 1. Insertion en bloc des items par UUID
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

    // 2. Items par nom : trouver ou créer dans le catalogue, puis insérer
    for (const namedItem of DEFAULT_INVENTORY_NAMED) {
      const { data: existingItems } = await admin
        .from('items')
        .select('id')
        .eq('name', namedItem.item_name)
        .limit(1)

      let itemId: string
      const existingId = (existingItems as { id: string }[] | null)?.[0]?.id

      if (existingId) {
        itemId = existingId
      } else {
        const { data: created, error: createError } = await admin
          .from('items')
          .insert({
            name: namedItem.item_name,
            category: namedItem.item_category,
            default_room: namedItem.item_default_room,
          })
          .select('id')
          .single()
        if (createError || !created) throw new Error(createError?.message ?? 'Erreur création item')
        itemId = (created as { id: string }).id
      }

      const { error: namedInvError } = await admin.from('inventory').insert({
        apartment_id: apartmentId,
        item_id: itemId,
        room: namedItem.room,
        quantity: namedItem.quantity,
        condition: namedItem.condition,
        notes: null,
      })
      if (namedInvError) throw new Error(namedInvError.message)
    }

    // 3. Insertion en bloc des surfaces EDL
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
