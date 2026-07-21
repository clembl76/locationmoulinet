'use server'

import { sendTenantListEmailFull } from '@/lib/quittance'

export async function sendTenantListEmailAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendTenantListEmailFull()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
