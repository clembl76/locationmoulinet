'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { moveCandidateFolderToTenants, generateBailAndUploadToDrive } from '@/lib/quittance'
import { revalidatePath } from 'next/cache'

// ── Mettre à jour le statut candidat (+ visiteur si lié) ─────────────────────

export async function updateApplicationStatusAction(
  applicationId: string,
  candidateStatus: 'accepted' | 'rejected' | 'withdrawn',
  visitorId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient()

    // Statut candidature
    const { error: aErr } = await admin
      .from('candidate_applications')
      .update({ status: candidateStatus })
      .eq('id', applicationId)
    if (aErr) throw new Error(aErr.message)

    // Statut visiteur lié (best-effort)
    if (visitorId && (candidateStatus === 'accepted' || candidateStatus === 'rejected')) {
      const visitorStatus = candidateStatus === 'accepted' ? 'confirmed' : 'cancelled'
      await admin.from('visitors').update({ status: visitorStatus }).eq('id', visitorId)
    }

    // Génération du PDF bail au moment où le candidat est retenu (best-effort)
    if (candidateStatus === 'accepted') {
      type BailRow = {
        candidate_id: string
        title: string | null
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
        birth_date: string | null
        birth_place: string | null
        address: string | null
        family_status: string | null
        desired_signing_date: string | null
        apartment_number: string
        rent_including_charges: number | null
        rent_excluding_charges: number | null
        charges: number | null
        g_title: string | null
        g_first_name: string | null
        g_last_name: string | null
        g_email: string | null
        g_phone: string | null
        g_birth_date: string | null
        g_birth_place: string | null
        g_address: string | null
      }
      const rows = await runSqlAdmin<BailRow>(`
        SELECT
          c.id AS candidate_id,
          c.title, c.first_name, c.last_name, c.email, c.phone,
          c.birth_date::date::text, c.birth_place, c.address, c.family_status,
          ca.desired_signing_date::date::text,
          a.number AS apartment_number,
          a.rent_including_charges, a.rent_excluding_charges, a.charges,
          cg.title AS g_title, cg.first_name AS g_first_name, cg.last_name AS g_last_name,
          cg.email AS g_email, cg.phone AS g_phone,
          cg.birth_date::text AS g_birth_date, cg.birth_place AS g_birth_place, cg.address AS g_address
        FROM candidates c
        JOIN candidate_applications ca ON ca.candidate_id = c.id
        JOIN apartments a ON a.id = ca.apartment_id
        LEFT JOIN candidate_guarantors cg ON cg.candidate_id = c.id
        WHERE ca.id = '${applicationId}'
        LIMIT 1
      `)
      const row = rows[0]
      if (row) {
        const signingDate = row.desired_signing_date ?? new Date().toISOString().slice(0, 10)
        const endDateObj = new Date(signingDate + 'T12:00:00')
        endDateObj.setFullYear(endDateObj.getFullYear() + 1)
        endDateObj.setDate(endDateObj.getDate() - 1)
        const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
        const rentCC = row.rent_including_charges ?? 0
        generateBailAndUploadToDrive({
          aptNumber: row.apartment_number,
          signingDate,
          endDate,
          rentCC,
          rentHC: row.rent_excluding_charges,
          charges: row.charges,
          deposit: rentCC,
          tenantTitle: row.title,
          tenantFirstName: row.first_name,
          tenantLastName: row.last_name,
          tenantEmail: row.email,
          tenantPhone: row.phone,
          tenantBirthDate: row.birth_date,
          tenantBirthPlace: row.birth_place,
          tenantAddress: row.address,
          tenantFamilyStatus: row.family_status,
          guarantorTitle: row.g_title,
          guarantorFirstName: row.g_first_name,
          guarantorLastName: row.g_last_name,
          guarantorEmail: row.g_email,
          guarantorPhone: row.g_phone,
          guarantorBirthDate: row.g_birth_date,
          guarantorBirthPlace: row.g_birth_place,
          guarantorAddress: row.g_address,
        }).catch(() => { /* non-bloquant */ })
      }
    }

    revalidatePath(`/admin/mise-en-location/candidats/${applicationId}`)
    revalidatePath('/admin/mise-en-location')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

// ── Créer locataire + bail depuis la candidature ("Bail signé") ───────────────

export type SignLeaseResult =
  | { ok: true }
  | { ok: false; error: string }

export async function signLeaseAction(opts: {
  applicationId: string
  candidateId: string
  aptNumber: string
  visitorId: string | null
  desiredSigningDate: string | null
  // Candidat
  candidateTitle: string | null
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string | null
  candidatePhone: string | null
  candidateBirthDate: string | null
  candidateBirthPlace: string | null
  candidateAddress: string | null
  candidateFamilyStatus: string | null
  // Garant
  guarantorTitle: string | null
  guarantorFirstName: string | null
  guarantorLastName: string | null
  guarantorEmail: string | null
  guarantorPhone: string | null
  guarantorBirthDate: string | null
  guarantorBirthPlace: string | null
  guarantorAddress: string | null
}): Promise<SignLeaseResult> {
  try {
    const admin = createAdminClient()

    // 1. Récupérer l'apartment_id + loyers depuis la candidature
    const { data: appRow, error: appErr } = await admin
      .from('candidate_applications')
      .select('apartment_id, apartments(rent_including_charges, rent_excluding_charges, charges)')
      .eq('id', opts.applicationId)
      .single()
    if (appErr || !appRow) throw new Error('Candidature introuvable')
    const apartmentId = appRow.apartment_id as string
    const aptData = appRow.apartments as {
      rent_including_charges: number
      rent_excluding_charges: number
      charges: number
    } | null
    const rentCC = aptData?.rent_including_charges ?? 0

    // 2. Créer le locataire
    const { data: tenant, error: tErr } = await admin
      .from('tenants')
      .insert({
        title: opts.candidateTitle || null,
        first_name: opts.candidateFirstName,
        last_name: opts.candidateLastName,
        email: opts.candidateEmail,
        phone: opts.candidatePhone,
        birth_date: opts.candidateBirthDate || null,
        birth_place: opts.candidateBirthPlace || null,
        address: opts.candidateAddress || null,
        family_status: opts.candidateFamilyStatus || null,
      })
      .select('id')
      .single()
    if (tErr) throw new Error(tErr.message)
    const tenantId = tenant.id as string

    // 3. Créer le bail
    const signingDate = opts.desiredSigningDate || new Date().toISOString().slice(0, 10)
    const endDateObj = new Date(signingDate + 'T12:00:00')
    endDateObj.setFullYear(endDateObj.getFullYear() + 1)
    endDateObj.setDate(endDateObj.getDate() - 1)
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`
    const { data: lease, error: lErr } = await admin
      .from('leases')
      .insert({
        apartment_id: apartmentId,
        signing_date: signingDate,
        move_in_inspection_date: signingDate,
        end_date: endDate,
        duration: '1 an',
        rent_excluding_charges: aptData?.rent_excluding_charges ?? null,
        charges: aptData?.charges ?? null,
        rent_including_charges: rentCC || null,
        deposit: rentCC || null,
        residency_type: 'Principale',
        lease_type: 'Classique',
        status: 'active',
      })
      .select('id')
      .single()
    if (lErr) throw new Error(lErr.message)
    const leaseId = lease.id as string

    // 4. Lier locataire au bail
    const { error: ltErr } = await admin
      .from('lease_tenants')
      .insert({ lease_id: leaseId, tenant_id: tenantId })
    if (ltErr) throw new Error(ltErr.message)

    // 5. Créer le garant si présent
    if (opts.guarantorLastName) {
      const { data: guarantorRow, error: gErr } = await admin
        .from('tenants')
        .insert({
          first_name: opts.guarantorFirstName,
          last_name: opts.guarantorLastName,
          email: opts.guarantorEmail,
          phone: opts.guarantorPhone,
        })
        .select('id')
        .single()
      if (!gErr && guarantorRow) {
        await admin.from('guarantors').insert({
          tenant_id: guarantorRow.id,
        })
      }
    }

    // 6. Générer la ligne de loyer du 1er mois (prorata depuis signing_date)
    if (rentCC > 0) {
      const sd = new Date(signingDate + 'T12:00:00')
      const year = sd.getFullYear()
      const month = sd.getMonth() + 1
      const signingDay = sd.getDate()
      const dim = new Date(Date.UTC(year, month, 0)).getUTCDate() // jours dans le mois
      const isProrata = signingDay > 1
      const prorataDays = dim - signingDay + 1
      const amount = isProrata
        ? Math.round((prorataDays / dim) * rentCC * 100) / 100
        : rentCC

      await admin.from('rents').insert({
        lease_id: leaseId,
        year,
        month,
        amount_expected: amount,
        is_prorata: isProrata,
        prorata_days: isProrata ? prorataDays : null,
        days_in_month: dim,
      })
      // Non-bloquant : si l'insert échoue (ex. doublon), on ignore
    }

    // 8. Marquer candidature comme signée
    await admin
      .from('candidate_applications')
      .update({ status: 'signed' })
      .eq('id', opts.applicationId)

    // 9. Mettre à jour le statut visiteur si lié
    if (opts.visitorId) {
      await admin.from('visitors').update({ status: 'confirmed' }).eq('id', opts.visitorId)
    }

    // 10. Déplacer le dossier Drive candidat → locataires (best-effort)
    try {
      await moveCandidateFolderToTenants({
        aptNumber: opts.aptNumber,
        candidateLastName: opts.candidateLastName,
      })
    } catch {
      // non-bloquant
    }

    revalidatePath(`/admin/mise-en-location/candidats/${opts.applicationId}`)
    revalidatePath('/admin/mise-en-location')
    revalidatePath(`/admin/apartments/${opts.aptNumber}`)
    revalidatePath('/admin/apartments')
    revalidatePath('/admin')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
