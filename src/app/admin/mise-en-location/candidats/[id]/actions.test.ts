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
  triggerCandidateAcceptedWebhook: vi.fn().mockResolvedValue(undefined),
  createGmailDraftCandidateAccepted: vi.fn().mockResolvedValue(undefined),
  createGoogleContacts: vi.fn().mockResolvedValue(undefined),
  moveCandidateFolderToTenants: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin } from '@/lib/adminData'
import { generateBailAndUploadToDrive } from '@/lib/quittance'
import { updateApplicationStatusAction, signLeaseAction } from '@/app/admin/mise-en-location/candidats/[id]/actions'

function makeAdminMock() {
  const eq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ update })
  vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
  return { from, update }
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

describe('updateApplicationStatusAction — irlWarning', () => {
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
  })

  it('remonte l\'irlWarning renvoyé par generateBailAndUploadToDrive quand le candidat est accepté', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({
      filename: 'bail.pdf',
      irlWarning: 'IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025...',
    })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.irlWarning).toBe('IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025...')
  })

  it('n\'expose aucune irlWarning quand l\'IRL utilisé est à jour', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockResolvedValueOnce({ filename: 'bail.pdf' })

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.irlWarning).toBeUndefined()
  })

  it('reste ok même si la génération du bail échoue (best-effort) et n\'expose pas d\'irlWarning', async () => {
    makeAdminMock()
    vi.mocked(runSqlAdmin).mockResolvedValueOnce([bailRow])
    vi.mocked(generateBailAndUploadToDrive).mockRejectedValueOnce(new Error('Google Drive down'))

    const result = await updateApplicationStatusAction('app-1', 'accepted', null)

    expect(result.ok).toBe(true)
    expect(result.irlWarning).toBeUndefined()
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
})
