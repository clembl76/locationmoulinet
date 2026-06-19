'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { getQuittanceData, generateQuittancePdf, createGmailDraft, getQuittanceCautionData, generateQuittanceCautionPdf, createGmailDraftCaution, getAttestationData, generateAttestationPdf, createGmailDraftAttestation, createCalendarPreavisEvent, createGmailDraftPreavis, sendTenantListEmail, moveTenantFolderToArchive } from '@/lib/quittance'
import { createEdlReport, runSqlAdmin } from '@/lib/adminData'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function savePreavisAction(
  leaseId: string,
  aptNumber: string,
  moveOutDate: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    // 1. Mettre à jour move_out_inspection_date ET end_date
    const { error } = await admin
      .from('leases')
      .update({ move_out_inspection_date: moveOutDate, end_date: moveOutDate })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)

    // 2. Générer le loyer prorata du mois de départ
    try {
      const d = new Date(moveOutDate + 'T12:00:00')
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const moveOutDay = d.getDate()
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

      // Récupérer le loyer CC, la caution et les infos locataire/logement depuis le bail
      const leaseRows = await runSqlAdmin<{
        rent_including_charges: number
        deposit: number | null
        tenant_email: string | null
        tenant_first_name: string | null
        tenant_last_name: string | null
        tenant_title: string | null
        tenant_phone: string | null
        building_address: string
        building_short_name: string
      }>(
        `SELECT l.rent_including_charges, l.deposit,
                t.email AS tenant_email,
                t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name,
                t.title AS tenant_title,
                t.phone AS tenant_phone,
                b.address AS building_address,
                b.short_name AS building_short_name
         FROM leases l
         JOIN apartments a ON a.id = l.apartment_id
         JOIN buildings b ON b.id = a.building_id
         LEFT JOIN lease_tenants lt ON lt.lease_id = l.id
         LEFT JOIN tenants t ON t.id = lt.tenant_id
         WHERE l.id = '${leaseId}'
         LIMIT 1`
      )
      const rentCC = leaseRows[0]?.rent_including_charges ?? 0

      if (rentCC > 0) {
        const amount = Math.round((moveOutDay / daysInMonth) * rentCC * 100) / 100

        // Upsert : mettre à jour si le loyer du mois existe déjà, sinon créer
        const existing = await runSqlAdmin<{ id: string }>(
          `SELECT id FROM rents WHERE lease_id = '${leaseId}' AND year = ${year} AND month = ${month} LIMIT 1`
        )

        if (existing[0]) {
          await admin
            .from('rents')
            .update({
              amount_expected: amount,
              is_prorata: true,
              prorata_days: moveOutDay,
              days_in_month: daysInMonth,
            })
            .eq('id', existing[0].id)
        } else {
          await admin
            .from('rents')
            .insert({
              lease_id: leaseId,
              year,
              month,
              amount_expected: amount,
              is_prorata: true,
              prorata_days: moveOutDay,
              days_in_month: daysInMonth,
            })
        }
      }
      // Brouillon Gmail de confirmation préavis (best-effort)
      if (leaseRows[0]?.tenant_email) {
        createGmailDraftPreavis({
          tenantEmail: leaseRows[0].tenant_email,
          aptNumber,
          buildingShortName: leaseRows[0].building_short_name,
          buildingAddress: leaseRows[0].building_address,
          endDate: moveOutDate,
          moveOutDate,
          prorataAmount: rentCC > 0 ? Math.round((moveOutDay / daysInMonth) * rentCC * 100) / 100 : 0,
          deposit: leaseRows[0].deposit,
        }).catch(() => { /* non-bloquant */ })
      }
      // Email liste locataires — sortie (best-effort)
      if (leaseRows[0]?.tenant_last_name) {
        sendTenantListEmail({
          changedTenantTitle: leaseRows[0].tenant_title,
          changedTenantFirstName: leaseRows[0].tenant_first_name ?? '',
          changedTenantLastName: leaseRows[0].tenant_last_name,
          changedTenantPhone: leaseRows[0].tenant_phone,
          changedTenantEmail: leaseRows[0].tenant_email,
          aptNumber,
          moveType: 'sortie',
          moveDate: moveOutDate,
        }).catch(() => { /* non-bloquant */ })
      }
    } catch {
      // Non-bloquant — le préavis est enregistré même si le loyer échoue
    }

    // 3. Créer l'événement calendrier (best-effort)
    try {
      await createCalendarPreavisEvent({ leaseId, aptNumber, moveOutDate })
    } catch {
      // Non-bloquant
    }

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
    // 1. Récupérer le montant attendu
    const admin = createAdminClient()
    const { data: rentRow, error: fetchErr } = await admin
      .from('rents')
      .select('amount_expected')
      .eq('id', rentId)
      .single()

    if (fetchErr || !rentRow) throw new Error('Loyer introuvable')
    const amountExpected = rentRow.amount_expected as number

    // 2. Marquer comme encaissé
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const { error: updateErr } = await admin
      .from('rents')
      .update({ amount_received: amountExpected, received_at: todayStr })
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

export async function updateInsuranceAttestationAction(
  leaseId: string,
  aptNumber: string,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ insurance_attestation: value })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateDocusignUrlsAction(
  leaseId: string,
  aptNumber: string,
  leaseUrl: string | null,
  edlUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ docusign_lease_url: leaseUrl || null, docusign_edl_url: edlUrl || null })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateDepositPaidAction(
  leaseId: string,
  aptNumber: string,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ deposit_paid: value })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
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

export async function updateEdlSignedAction(
  leaseId: string,
  aptNumber: string,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ edl_signed: value })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    revalidatePath('/admin/apartments')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function updateDepositReturnedAction(
  leaseId: string,
  aptNumber: string,
  value: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ deposit_returned: value })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)
    revalidatePath(`/admin/apartments/${aptNumber}`)
    revalidatePath('/admin/apartments')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

export async function archiveLeaseAction(
  leaseId: string,
  aptNumber: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('leases')
      .update({ status: 'archived' })
      .eq('id', leaseId)
    if (error) throw new Error(error.message)

    // Déplacer le dossier Drive vers Archive (best-effort, non-bloquant)
    const tenantRows = await runSqlAdmin<{ last_name: string }>(`
      SELECT t.last_name FROM lease_tenants lt
      JOIN tenants t ON t.id = lt.tenant_id
      WHERE lt.lease_id = '${leaseId}' LIMIT 1
    `).catch(() => [])
    if (tenantRows[0]?.last_name) {
      moveTenantFolderToArchive(aptNumber, tenantRows[0].last_name).catch(() => { /* non-bloquant */ })
    }

    revalidatePath(`/admin/apartments/${aptNumber}`)
    revalidatePath('/admin/apartments')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

