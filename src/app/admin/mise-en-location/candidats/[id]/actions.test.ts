// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

// runSqlAdmin renvoie [] par défaut : le bloc "candidat accepté" (génération bail, webhook,
// mails, contacts) est alors sauté (row === undefined). Certains tests le surchargent avec
// mockResolvedValueOnce pour exercer ce bloc.
vi.mock('@/lib/adminData', () => ({
  runSqlAdmin: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/quittance', () => ({
  generateBailAndUploadToDrive: vi.fn(),
  triggerCandidateAcceptedWebhook: vi.fn().mockResolvedValue({ ok: true }),
  createGmailDraftCandidateAccepted: vi.fn().mockResolvedValue(undefined),
  createGoogleContacts: vi.fn().mockResolvedValue(undefined),
  moveCandidateFolderToTenants: vi.fn().mockResolvedValue(undefined),
  uploadCandidateDocuments: vi.fn().mockResolvedValue({ candidateUrls: [], guarantorUrls: [] }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import {
  generateBailAndUploadToDrive,
  triggerCandidateAcceptedWebhook,
  createGmailDraftCandidateAccepted,
  createGoogleContacts,
  moveCandidateFolderToTenants,
  uploadCandidateDocuments,
} from '@/lib/quittance'
import {
  updateApplicationStatusAction,
  signLeaseAction,
  updateCandidateFieldAction,
  updateGuarantorFieldAction,
  updateApplicationFieldAction,
  updateVisitorFieldAction,
  addCandidateDocumentAction,
} from '@/app/admin/mise-en-location/candidats/[id]/actions'

function makeAdminMock() {
  const eq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn().mockReturnValue({ update, insert })
  vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
  return { from, update, eq, insert }
}

describe('updateApplicationStatusAction — accepted_at', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renseigne accepted_at quand le statut passe à accepted', async () => {
    const { update } = makeAdminMock()

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted',
      accepted_at: expect.any(String),
    }))
  })

  it('ne renseigne pas accepted_at pour rejected', async () => {
    const { update } = makeAdminMock()

    const result = await updateApplicationStatusAction('app-1', 'rejected', null)

    expect(result.ok).toBe(true)
    expect(update).toHaveBeenCalledWith({ status: 'rejected' })
  })

  it('ne renseigne pas accepted_at pour withdrawn', async () => {
    const { update } = makeAdminMock()

    const result = await updateApplicationStatusAction('app-1', 'withdrawn', null)

    expect(result.ok).toBe(true)
    expect(update).toHaveBeenCalledWith({ status: 'withdrawn' })
  })
})

describe('updateApplicationStatusAction — warnings (aucune erreur silencieuse)', () => {
  const bailRow = {
    candidate_id: 'cand-1',
    title: null, first_name: 'Jean', last_name: 'Dupont', email: null, phone: null,
    birth_date: null, birth_place: null, address: null, family_status: null,
    desired_signing_date: '2026-08-01',
    apartment_number: '7', building_short_name: 'Moulinet', building_address: '9 rue du Moulinet',
    rent_including_charges: 500, rent_excluding_charges: 450, charges: 50,
    g_title: null, g_first_name: null, g_last_name: null, g_email: null, g_phone: null,
    g_birth_date: null, g_birth_place: null, g_address: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(triggerCandidateAcceptedWebhook).mockResolvedValue({ ok: true })
    vi.mocked(createGmailDraftCandidateAccepted).mockResolvedValue(undefined)
    vi.mocked(createGoogleContacts).mockResolvedValue(undefined)
  })

  it('aucune warning quand les 4 actions best-effort réussissent', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({ filename: 'bail.pdf' })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toBeUndefined()
  })

  it('remonte l\'irlWarning renvoyé par generateBailAndUploadToDrive dans warnings', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({
      filename: 'bail.pdf',
      irlWarning: 'IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025...',
    })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual(['IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025...'])
  })

  it('régression bug réel : un échec de génération du bail n\'empêche plus le webhook et le brouillon Gmail d\'être tentés', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockRejectedValueOnce(new Error("Invalid Value"))

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toContain('Génération du bail échouée : Invalid Value')
    // Avant la correction, ces deux appels n'étaient jamais atteints car imbriqués dans le
    // try du bail — c'est exactement le bug signalé (candidat "D'Almeida" : ni bail, ni mail).
    expect(triggerCandidateAcceptedWebhook).toHaveBeenCalledTimes(1)
    expect(createGmailDraftCandidateAccepted).toHaveBeenCalledTimes(1)
  })

  it('signale l\'échec du webhook Make.com sans bloquer le reste', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({ filename: 'bail.pdf' })
    vi.mocked(triggerCandidateAcceptedWebhook).mockResolvedValueOnce({ ok: false, error: 'Make.com a répondu 500' })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toContain('Webhook Make.com échoué : Make.com a répondu 500')
    expect(createGmailDraftCandidateAccepted).toHaveBeenCalledTimes(1)
  })

  it('signale l\'échec du brouillon Gmail sans bloquer le reste', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({ filename: 'bail.pdf' })
    vi.mocked(createGmailDraftCandidateAccepted).mockRejectedValueOnce(new Error('GMAIL_REFRESH_TOKEN invalide'))

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toContain('Brouillon Gmail échoué : GMAIL_REFRESH_TOKEN invalide')
    expect(createGoogleContacts).toHaveBeenCalledTimes(1)
  })

  it('signale l\'échec de la création des contacts Google', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({ filename: 'bail.pdf' })
    vi.mocked(createGoogleContacts).mockRejectedValueOnce(new Error('Contacts API quota dépassé'))

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toContain('Création des contacts Google échouée : Contacts API quota dépassé')
  })

  it('cumule plusieurs warnings si plusieurs actions échouent', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockRejectedValueOnce(new Error('Drive down'))
    vi.mocked(triggerCandidateAcceptedWebhook).mockResolvedValueOnce({ ok: false, error: 'timeout' })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings).toContain('Génération du bail échouée : Drive down')
    expect(result.warnings).toContain('Webhook Make.com échoué : timeout')
  })
})

describe('Édition au clic — "Demande de bail" / "Candidat" / "Garant"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updateCandidateFieldAction met à jour la table candidates avec le bon champ', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateCandidateFieldAction('cand-1', 'first_name', 'Anaëlle', 'app-1')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('candidates')
    expect(update).toHaveBeenCalledWith({ first_name: 'Anaëlle' })
    expect(eq).toHaveBeenCalledWith('id', 'cand-1')
  })

  it('updateCandidateFieldAction enregistre null pour une valeur vide (pas une chaîne vide)', async () => {
    const { update } = makeAdminMock()

    await updateCandidateFieldAction('cand-1', 'phone', '', 'app-1')

    expect(update).toHaveBeenCalledWith({ phone: null })
  })

  it('updateCandidateFieldAction retourne ok:false avec le message d\'erreur si la mise à jour échoue', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'Erreur DB' } })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)

    const result = await updateCandidateFieldAction('cand-1', 'email', 'test@test.com', 'app-1')

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
  })

  it('updateGuarantorFieldAction met à jour la table candidate_guarantors', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateGuarantorFieldAction('guar-1', 'last_name', 'DUPONT', 'app-1')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('candidate_guarantors')
    expect(update).toHaveBeenCalledWith({ last_name: 'DUPONT' })
    expect(eq).toHaveBeenCalledWith('id', 'guar-1')
  })

  it('updateApplicationFieldAction met à jour la table candidate_applications (ex. apartment_id)', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateApplicationFieldAction('app-1', 'apartment_id', 'apt-42')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('candidate_applications')
    expect(update).toHaveBeenCalledWith({ apartment_id: 'apt-42' })
    expect(eq).toHaveBeenCalledWith('id', 'app-1')
  })

  it('updateApplicationFieldAction accepte desired_signing_date et created_at', async () => {
    const { update } = makeAdminMock()

    await updateApplicationFieldAction('app-1', 'desired_signing_date', '2026-10-01')
    expect(update).toHaveBeenCalledWith({ desired_signing_date: '2026-10-01' })

    await updateApplicationFieldAction('app-1', 'created_at', '2026-09-15')
    expect(update).toHaveBeenCalledWith({ created_at: '2026-09-15' })
  })

  it('updateVisitorFieldAction met à jour la table visitors (ex. comments)', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateVisitorFieldAction('visitor-1', 'comments', 'Très motivé', 'app-1')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('visitors')
    expect(update).toHaveBeenCalledWith({ comments: 'Très motivé' })
    expect(eq).toHaveBeenCalledWith('id', 'visitor-1')
  })

  it('updateVisitorFieldAction accepte les champs numériques (desired_duration_months, total_income)', async () => {
    const { update } = makeAdminMock()

    await updateVisitorFieldAction('visitor-1', 'desired_duration_months', '12', 'app-1')
    expect(update).toHaveBeenCalledWith({ desired_duration_months: '12' })

    await updateVisitorFieldAction('visitor-1', 'total_income', '1500', 'app-1')
    expect(update).toHaveBeenCalledWith({ total_income: '1500' })
  })
})

describe('signLeaseAction — candidate_application_id / signed_at', () => {
  function makeSignLeaseAdminMock() {
    const appSingle = vi.fn().mockResolvedValue({
      data: {
        apartment_id: 'apt-1',
        apartments: { rent_including_charges: 0, rent_excluding_charges: 0, charges: 0 },
      },
      error: null,
    })
    const appEq = vi.fn().mockReturnValue({ single: appSingle })
    const appSelect = vi.fn().mockReturnValue({ eq: appEq })
    const appUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const appUpdate = vi.fn().mockReturnValue({ eq: appUpdateEq })

    const tenantSingle = vi.fn().mockResolvedValue({ data: { id: 'tenant-1' }, error: null })
    const tenantSelect = vi.fn().mockReturnValue({ single: tenantSingle })
    const tenantInsert = vi.fn().mockReturnValue({ select: tenantSelect })

    const leaseSingle = vi.fn().mockResolvedValue({ data: { id: 'lease-1' }, error: null })
    const leaseSelect = vi.fn().mockReturnValue({ single: leaseSingle })
    const leaseInsert = vi.fn().mockReturnValue({ select: leaseSelect })

    const genericInsert = vi.fn().mockResolvedValue({ error: null })

    const from = vi.fn((table: string) => {
      if (table === 'candidate_applications') return { select: appSelect, update: appUpdate }
      if (table === 'tenants') return { insert: tenantInsert }
      if (table === 'leases') return { insert: leaseInsert }
      return { insert: genericInsert }
    })
    vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
    return { leaseInsert, appUpdate }
  }

  const baseOpts = {
    applicationId: 'app-1',
    candidateId: 'cand-1',
    aptNumber: '7',
    visitorId: null,
    desiredSigningDate: '2026-08-01',
    candidateTitle: null,
    candidateFirstName: 'Jean',
    candidateLastName: 'Dupont',
    candidateEmail: null,
    candidatePhone: null,
    candidateBirthDate: null,
    candidateBirthPlace: null,
    candidateAddress: null,
    candidateFamilyStatus: null,
    guarantorTitle: null,
    guarantorFirstName: null,
    guarantorLastName: null,
    guarantorEmail: null,
    guarantorPhone: null,
    guarantorBirthDate: null,
    guarantorBirthPlace: null,
    guarantorAddress: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lie le bail créé à sa candidature via candidate_application_id', async () => {
    const { leaseInsert } = makeSignLeaseAdminMock()

    const result = await signLeaseAction(baseOpts)

    expect(result.ok).toBe(true)
    expect(leaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({ candidate_application_id: 'app-1' })
    )
  })

  it('renseigne signed_at en plus du statut signed', async () => {
    const { appUpdate } = makeSignLeaseAdminMock()

    await signLeaseAction(baseOpts)

    expect(appUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'signed', signed_at: expect.any(String) })
    )
  })

  it('signale (sans bloquer) un échec du déplacement du dossier Drive candidat → locataires', async () => {
    makeSignLeaseAdminMock()
    vi.mocked(moveCandidateFolderToTenants).mockRejectedValueOnce(new Error("Invalid Value"))

    const result = await signLeaseAction(baseOpts)

    expect(result.ok).toBe(true)
    expect(result.ok && result.warnings).toContain('Déplacement du dossier Drive échoué : Invalid Value')
  })

  it('aucune warning quand le déplacement du dossier Drive réussit', async () => {
    makeSignLeaseAdminMock()
    vi.mocked(moveCandidateFolderToTenants).mockResolvedValueOnce(undefined)

    const result = await signLeaseAction(baseOpts)

    expect(result.ok).toBe(true)
    expect(result.ok && result.warnings).toBeUndefined()
  })
})

describe('addCandidateDocumentAction — ajout de document (candidat ou garant)', () => {
  function makeFormData(overrides: Record<string, string | File> = {}) {
    const fd = new FormData()
    fd.set('applicationId', 'app-1')
    fd.set('owner', 'candidate')
    fd.set('aptNumber', '7')
    fd.set('candidateLastName', 'Dupont')
    fd.set('file', new File(['contenu'], 'piece-identite.pdf', { type: 'application/pdf' }))
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
    return fd
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(uploadCandidateDocuments).mockResolvedValue({ candidateUrls: [], guarantorUrls: [] })
  })

  it('refuse sans fichier', async () => {
    const fd = makeFormData()
    fd.set('file', new File([], '', { type: 'application/octet-stream' }))

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de sélectionner un fichier.' })
    expect(uploadCandidateDocuments).not.toHaveBeenCalled()
  })

  it('refuse un destinataire invalide', async () => {
    const fd = makeFormData({ owner: 'autre' })

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de préciser le destinataire (candidat ou garant).' })
  })

  it('refuse si applicationId est manquant', async () => {
    const fd = makeFormData({ applicationId: '' })

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: false, error: 'Candidature introuvable.' })
  })

  it('route le fichier vers candidateFiles quand owner="candidate"', async () => {
    makeAdminMock()
    vi.mocked(uploadCandidateDocuments).mockResolvedValueOnce({
      candidateUrls: ['https://drive.google.com/candidate-doc'],
      guarantorUrls: [],
    })
    const fd = makeFormData({ owner: 'candidate' })

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: true })
    expect(uploadCandidateDocuments).toHaveBeenCalledWith(expect.objectContaining({
      aptNumber: '7',
      candidateLastName: 'Dupont',
      guarantorFiles: [],
    }))
    const call = vi.mocked(uploadCandidateDocuments).mock.calls[0][0]
    expect(call.candidateFiles).toHaveLength(1)
    expect(call.candidateFiles[0].name).toBe('piece-identite.pdf')
  })

  it('route le fichier vers guarantorFiles quand owner="guarantor" et référence la bonne URL', async () => {
    const { from } = makeAdminMock()
    vi.mocked(uploadCandidateDocuments).mockResolvedValueOnce({
      candidateUrls: [],
      guarantorUrls: ['https://drive.google.com/guarantor-doc'],
    })
    const fd = makeFormData({ owner: 'guarantor' })

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: true })
    const call = vi.mocked(uploadCandidateDocuments).mock.calls[0][0]
    expect(call.candidateFiles).toHaveLength(0)
    expect(call.guarantorFiles).toHaveLength(1)
    expect(from).toHaveBeenCalledWith('candidate_documents')
  })

  it('insère la ligne candidate_documents avec owner, file_name et drive_url', async () => {
    const { insert } = makeAdminMock()
    vi.mocked(uploadCandidateDocuments).mockResolvedValueOnce({
      candidateUrls: ['https://drive.google.com/doc-1'],
      guarantorUrls: [],
    })
    const fd = makeFormData({ owner: 'candidate' })

    await addCandidateDocumentAction(fd)

    expect(insert).toHaveBeenCalledWith({
      application_id: 'app-1',
      owner: 'candidate',
      file_name: 'piece-identite.pdf',
      drive_url: 'https://drive.google.com/doc-1',
    })
  })

  it('retourne ok:false si l\'upload Drive échoue', async () => {
    makeAdminMock()
    vi.mocked(uploadCandidateDocuments).mockRejectedValueOnce(new Error('Drive indisponible'))
    const fd = makeFormData()

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: false, error: 'Drive indisponible' })
  })

  it('retourne ok:false si l\'insertion en base échoue', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'Erreur DB' } })
    const from = vi.fn().mockReturnValue({ insert })
    vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
    vi.mocked(uploadCandidateDocuments).mockResolvedValueOnce({ candidateUrls: ['url'], guarantorUrls: [] })
    const fd = makeFormData()

    const result = await addCandidateDocumentAction(fd)

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
  })
})
