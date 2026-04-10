'use server'

import { createAdminClient } from '@/lib/supabaseAdmin'
import { uploadCandidateDocuments } from '@/lib/quittance'

export type CandidateResult =
  | { ok: true; applicationId: string; driveWarning?: string }
  | { ok: false; error: string }

export async function createCandidateAction(formData: FormData): Promise<CandidateResult> {
  try {
    const admin = createAdminClient()

    // ── Champs candidat ──────────────────────────────────────────────────────
    const title        = formData.get('title') as string | null
    const firstName    = (formData.get('first_name') as string).trim()
    const lastName     = (formData.get('last_name') as string).trim()
    const email        = (formData.get('email') as string).trim()
    const phone        = (formData.get('phone') as string | null)?.trim() || null
    const birthDate    = (formData.get('birth_date') as string | null) || null
    const birthPlace   = (formData.get('birth_place') as string | null)?.trim() || null
    const address      = (formData.get('address') as string | null)?.trim() || null
    const familyStatus = (formData.get('family_status') as string | null)?.trim() || null

    // ── Demande de bail ──────────────────────────────────────────────────────
    const apartmentId      = (formData.get('apartment_id') as string).trim()
    const desiredSigningDate = (formData.get('desired_signing_date') as string).trim()

    // ── Garant ───────────────────────────────────────────────────────────────
    const hasGuarantor = formData.get('has_guarantor') === 'yes'
    const gTitle      = formData.get('g_title') as string | null
    const gFirstName  = (formData.get('g_first_name') as string | null)?.trim() || null
    const gLastName   = (formData.get('g_last_name') as string | null)?.trim() || null
    const gEmail      = (formData.get('g_email') as string | null)?.trim() || null
    const gPhone      = (formData.get('g_phone') as string | null)?.trim() || null
    const gBirthDate  = (formData.get('g_birth_date') as string | null) || null
    const gBirthPlace = (formData.get('g_birth_place') as string | null)?.trim() || null
    const gAddress    = (formData.get('g_address') as string | null)?.trim() || null

    if (!firstName || !lastName || !email || !apartmentId || !desiredSigningDate) {
      return { ok: false, error: 'Champs obligatoires manquants.' }
    }

    // ── Fichiers candidat ────────────────────────────────────────────────────
    const candidateRawFiles = [
      ...formData.getAll('candidate_docs_identity') as File[],
      ...formData.getAll('candidate_docs_income') as File[],
      ...formData.getAll('candidate_docs_status') as File[],
    ]
    const guarantorRawFiles = hasGuarantor ? [
      ...formData.getAll('guarantor_docs_identity') as File[],
      ...formData.getAll('guarantor_docs_income') as File[],
    ] : []

    const toBuffer = async (f: File) => ({
      name: f.name,
      type: f.type || 'application/octet-stream',
      buffer: Buffer.from(await f.arrayBuffer()),
    })

    const candidateFiles = await Promise.all(candidateRawFiles.filter(f => f.size > 0).map(toBuffer))
    const guarantorFiles = await Promise.all(guarantorRawFiles.filter(f => f.size > 0).map(toBuffer))

    // ── Insérer candidat ─────────────────────────────────────────────────────
    const { data: candidate, error: cErr } = await admin
      .from('candidates')
      .insert({ title, first_name: firstName, last_name: lastName, email, phone, birth_date: birthDate, birth_place: birthPlace, address, family_status: familyStatus })
      .select('id')
      .single()
    if (cErr) throw new Error(cErr.message)
    const candidateId = candidate.id as string

    // ── Insérer garant candidat ───────────────────────────────────────────────
    if (hasGuarantor && gLastName) {
      const { error: gErr } = await admin
        .from('candidate_guarantors')
        .insert({ candidate_id: candidateId, title: gTitle, first_name: gFirstName, last_name: gLastName, email: gEmail, phone: gPhone, birth_date: gBirthDate, birth_place: gBirthPlace, address: gAddress })
      if (gErr) throw new Error(gErr.message)
    }

    // ── Chercher un visiteur lié (email ou téléphone) — best-effort ───────────
    let visitorId: string | null = null
    try {
      const emailNorm = email.toLowerCase()
      const phoneNorm = phone?.replace(/\s/g, '') ?? null

      const { data: byEmail } = await admin
        .from('visitors')
        .select('id')
        .eq('email', emailNorm)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (byEmail) {
        visitorId = byEmail.id
      } else if (phoneNorm) {
        const { data: byPhone } = await admin
          .from('visitors')
          .select('id')
          .ilike('phone', `%${phoneNorm.slice(-9)}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (byPhone) visitorId = byPhone.id
      }
    } catch {
      // Pas de visiteur trouvé — non bloquant
    }

    // ── Insérer demande de bail ───────────────────────────────────────────────
    const { data: application, error: aErr } = await admin
      .from('candidate_applications')
      .insert({ candidate_id: candidateId, apartment_id: apartmentId, desired_signing_date: desiredSigningDate, status: 'pending', visitor_id: visitorId })
      .select('id')
      .single()
    if (aErr) throw new Error(aErr.message)
    const applicationId = application.id as string

    // ── Upload Drive ─────────────────────────────────────────────────────────
    // Deux blocs séparés : Drive upload d'un côté, insert Supabase de l'autre
    let driveWarning: string | undefined

    if (candidateFiles.length > 0 || guarantorFiles.length > 0) {
      const rootId = process.env.GDRIVE_CANDIDATES_FOLDER_ID
      if (!rootId || rootId === 'À_REMPLIR') {
        driveWarning = 'GDRIVE_CANDIDATES_FOLDER_ID non configuré'
      } else {
        // ── 1. Upload vers Drive (best-effort) ───────────────────────────────
        let candidateUrls: string[] = []
        let guarantorUrls: string[] = []
        try {
          const result = await uploadCandidateDocuments({
            aptNumber: formData.get('apt_number') as string,
            candidateLastName: lastName,
            candidateFiles,
            guarantorFiles,
          })
          candidateUrls = result.candidateUrls
          guarantorUrls = result.guarantorUrls
        } catch (uploadErr) {
          driveWarning = `Upload Drive échoué : ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`
        }

        // ── 2. Référencer dans Supabase (best-effort, indépendant) ───────────
        if (candidateUrls.length > 0 || guarantorUrls.length > 0) {
          const docRows = [
            ...candidateUrls.map((url, i) => ({
              application_id: applicationId,
              owner: 'candidate',
              file_name: candidateFiles[i]?.name ?? '',
              drive_url: url || null,
            })),
            ...guarantorUrls.map((url, i) => ({
              application_id: applicationId,
              owner: 'guarantor',
              file_name: guarantorFiles[i]?.name ?? '',
              drive_url: url || null,
            })),
          ]

          const { error: dErr } = await admin.from('candidate_documents').insert(docRows)
          if (dErr) {
            console.error('[candidater] candidate_documents insert error:', dErr)
            driveWarning = (driveWarning ? driveWarning + ' | ' : '') +
              `Référencement Supabase échoué : ${dErr.message}`
          }
        }
      }
    }

    return { ok: true, applicationId, driveWarning }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
