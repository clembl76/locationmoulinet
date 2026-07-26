// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

// runSqlAdmin renvoie [] : le bloc "candidat accepté" (génération bail, webhook, mails,
// contacts) est alors sauté (row === undefined), sans avoir besoin de mocker lib/quittance.
vi.mock('@/lib/adminData', () => ({
  runSqlAdmin: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/quittance', () => ({}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
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
