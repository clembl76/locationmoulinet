'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'

export async function updateKeyQuantityExitAction(
  id: string,
  value: number | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('apartment_keys')
      .update({ quantity_exit: value })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

export async function updateKeyQuantityEntryAction(
  id: string,
  value: number | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('apartment_keys')
      .update({ quantity: value })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

type ElementField = 'condition_entry' | 'comment_entry' | 'condition_exit' | 'comment_exit'
type ItemField = 'quantity_entry' | 'condition_entry' | 'comment_entry' | 'quantity_exit' | 'condition_exit' | 'comment_exit'

export async function updateCheckInElementAction(
  id: string,
  field: ElementField,
  value: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('check_in_elements')
      .update({ [field]: value || null })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}

export async function updateInventoryItemAction(
  id: string,
  field: ItemField,
  value: string | number | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('inventory_items')
      .update({ [field]: value === '' ? null : value })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}
