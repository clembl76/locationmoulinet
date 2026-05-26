'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'

export type SurfaceRow = {
  id: string
  surface: string
  room: string | null
  material: string | null
  condition: string | null
  notes: string | null
  notes_exit: string | null
}

export async function getSurfacesForApartmentAction(apartmentId: string): Promise<SurfaceRow[]> {
  return runSqlAdmin<SurfaceRow>(`
    SELECT id, surface::text, room::text, material::text, condition::text, notes, notes_exit
    FROM surfaces
    WHERE apartment_id = '${apartmentId}'
    ORDER BY COALESCE(room::text, ''), surface::text
  `)
}

export async function updateSurfaceNotesExitAction(
  surfaceId: string,
  notes_exit: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('surfaces').update({ notes_exit: notes_exit || null }).eq('id', surfaceId)
    if (error) throw new Error(error.message)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function addSurfaceAction(
  apartmentId: string,
  surface: string,
  room: string | null,
  material: string | null,
  condition: string | null,
  notes: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('surfaces').insert({
      apartment_id: apartmentId,
      surface,
      room: room || null,
      material: material || null,
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

export async function updateSurfaceAction(
  surfaceId: string,
  room: string | null,
  material: string | null,
  condition: string | null,
  notes: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('surfaces').update({
      room: room || null,
      material: material || null,
      condition: condition || null,
      notes: notes || null,
    }).eq('id', surfaceId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function deleteSurfaceAction(surfaceId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('surfaces').delete().eq('id', surfaceId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/inventory')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
