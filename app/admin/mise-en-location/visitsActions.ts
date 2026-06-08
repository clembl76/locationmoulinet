'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

// ── Supprimer une visite (et ses dépendances) ────────────────────────────────

export async function deleteVisitAction(visitorId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    const { error: vaErr } = await admin.from('visitor_apartments').delete().eq('visitor_id', visitorId)
    if (vaErr) throw new Error(vaErr.message)

    // Détache le visiteur des candidatures éventuellement liées (la candidature elle-même est conservée)
    const { error: caErr } = await admin.from('candidate_applications').update({ visitor_id: null }).eq('visitor_id', visitorId)
    if (caErr) throw new Error(caErr.message)

    const { error: vErr } = await admin.from('visitors').delete().eq('id', visitorId)
    if (vErr) throw new Error(vErr.message)

    revalidatePath('/admin/mise-en-location')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
