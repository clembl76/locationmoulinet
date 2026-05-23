'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'

export type ItemRow = {
  id: string
  category: string
  default_room: string
  name: string
  reference_url: string | null
  unit_price: number | null
  labor_cost: number | null
}

export type InventoryRow = {
  id: string
  item_id: string
  room: string
  quantity: number
  condition: string | null
  notes: string | null
  item_name: string
  item_category: string
  item_reference_url: string | null
  item_unit_price: number | null
  item_labor_cost: number | null
}

export async function getAllItemsAction(): Promise<ItemRow[]> {
  return runSqlAdmin<ItemRow>(`
    SELECT id, category, default_room::text, name, reference_url, unit_price, labor_cost
    FROM items
    ORDER BY name
  `)
}

export async function getInventoryForApartmentAction(apartmentId: string): Promise<InventoryRow[]> {
  return runSqlAdmin<InventoryRow>(`
    SELECT
      inv.id,
      inv.item_id,
      inv.room::text,
      inv.quantity,
      inv.condition::text,
      inv.notes,
      i.name   AS item_name,
      i.category AS item_category,
      i.reference_url AS item_reference_url,
      i.unit_price AS item_unit_price,
      i.labor_cost AS item_labor_cost
    FROM inventory inv
    JOIN items i ON i.id = inv.item_id
    WHERE inv.apartment_id = '${apartmentId}'
    ORDER BY inv.room::text, i.name
  `)
}

export async function addInventoryItemAction(
  apartmentId: string,
  itemId: string,
  room: string,
  quantity: number,
  condition: string | null,
  notes: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('inventory').insert({
      apartment_id: apartmentId,
      item_id: itemId,
      room,
      quantity,
      condition: condition || null,
      notes: notes || null,
    })
    if (error) throw new Error(error.message)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateInventoryItemAction(
  inventoryId: string,
  quantity: number,
  room: string,
  condition: string | null,
  notes: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('inventory').update({
      quantity,
      room,
      condition: condition || null,
      notes: notes || null,
    }).eq('id', inventoryId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function createCatalogItemAction(item: {
  name: string
  category: string
  default_room: string
  reference_url?: string
  unit_price?: number | null
  labor_cost?: number | null
}): Promise<{ ok: true; item: ItemRow } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('items')
      .insert({
        name: item.name.trim(),
        category: item.category,
        default_room: item.default_room,
        reference_url: item.reference_url?.trim() || null,
        unit_price: item.unit_price ?? null,
        labor_cost: item.labor_cost ?? null,
      })
      .select('id, category, default_room, name, reference_url, unit_price, labor_cost')
      .single()
    if (error) throw new Error(error.message)
    return { ok: true, item: data as ItemRow }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function deleteInventoryItemAction(
  inventoryId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('inventory').delete().eq('id', inventoryId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
