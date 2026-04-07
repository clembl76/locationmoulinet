'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { getQuittanceData, generateQuittancePdf, createGmailDraft, getQuittanceCautionData, generateQuittanceCautionPdf, createGmailDraftCaution, getAttestationData, generateAttestationPdf, createGmailDraftAttestation } from '@/lib/quittance'
import { createEdlReport } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function savePreavisAction(
  leaseId: string,
  aptNumber: string,
  moveOutDate: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ move_out_inspection_date: moveOutDate })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    revalidatePath('/admin/apartments')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export type QuittanceActionResult =
  | { ok: true; filename: string; draftId: string }
  | { ok: false; error: string }

export async function markReceivedAndGenerateQuittance(
  rentId: string,
  leaseId: string,
  aptNumber: string,
  year: number,
  month: number
): Promise<QuittanceActionResult> {
  try {
    // 1. Récupérer le montant attendu pour mettre à jour rents
    const admin = createAdminClient()
    const { data: rentRow, error: fetchErr } = await admin
      .from('rents')
      .select('amount_expected')
      .eq('id', rentId)
      .single()

    if (fetchErr || !rentRow) throw new Error('Loyer introuvable')

    const amountExpected = rentRow.amount_expected as number
    const today = new Date().toISOString().slice(0, 10)

    // 2. Marquer comme encaissé
    const { error: updateErr } = await admin
      .from('rents')
      .update({ amount_received: amountExpected, received_at: today })
      .eq('id', rentId)

    if (updateErr) throw new Error(updateErr.message)

    // 3. Générer le PDF quittance
    const qData = await getQuittanceData(leaseId)
    if (!qData) throw new Error('Données du bail introuvables')

    const { pdfBytes, filename } = await generateQuittancePdf(qData, year, month, amountExpected)

    // 4. Créer le brouillon Gmail
    const draftId = await createGmailDraft(qData, year, month, pdfBytes, filename)

    revalidatePath(`/admin/apartments/${aptNumber}`)
    revalidatePath('/admin')

    return { ok: true, filename, draftId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function generateQuittanceCautionAction(
  leaseId: string,
  aptNumber: string
): Promise<QuittanceActionResult> {
  try {
    const data = await getQuittanceCautionData(leaseId, aptNumber)
    if (!data) throw new Error('Données du bail introuvables')
    if (!data.caution_amount) throw new Error('Montant de caution introuvable (champ deposit du bail)')

    const { pdfBytes, filename } = await generateQuittanceCautionPdf(data)
    const draftId = await createGmailDraftCaution(data, pdfBytes, filename)

    revalidatePath(`/admin/apartments/${aptNumber}`)
    return { ok: true, filename, draftId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function createEdlReportAction(
  leaseId: string,
  aptNumber: string,
  entryDate: string
): Promise<void> {
  const report = await createEdlReport(leaseId, entryDate)
  revalidatePath(`/admin/apartments/${aptNumber}`)
  redirect(`/admin/apartments/${aptNumber}/edl/${report.id}`)
}

export async function generateAttestationAction(
  leaseId: string,
  aptNumber: string
): Promise<QuittanceActionResult> {
  try {
    const data = await getAttestationData(leaseId)
    if (!data) throw new Error('Données du bail introuvables')

    const { pdfBytes, filename } = await generateAttestationPdf(data)
    const draftId = await createGmailDraftAttestation(data, pdfBytes, filename)

    revalidatePath(`/admin/apartments/${aptNumber}`)
    return { ok: true, filename, draftId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
