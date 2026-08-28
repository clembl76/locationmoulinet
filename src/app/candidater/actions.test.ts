// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/quittance', () => ({
  uploadCandidateDocuments: vi.fn().mockResolvedValue({ candidateUrls: [], guarantorUrls: [] }),
  sendCandidateNotificationEmail: vi.fn().mockResolvedValue(undefined),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import { createCandidateAction } from '@/app/candidater/actions'

function makeAdminMock() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'row-1' }, error: null })
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })

  const maybeSingle = vi.fn().mockResolvedValue({ data: null })
  const limit = vi.fn().mockReturnValue({ maybeSingle })
  const order = vi.fn().mockReturnValue({ limit })
  const eq = vi.fn().mockReturnValue({ order })
  const ilike = vi.fn().mockReturnValue({ order })
  const visitorSelect = vi.fn().mockReturnValue({ eq, ilike })

  const from = vi.fn((table: string) => {
    if (table === 'visitors') return { select: visitorSelect }
    return { insert }
  })
  vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
  return { from, insert, select, single }
}

function pdfFile(name: string) {
  return new File([new Uint8Array(10)], name, { type: 'application/pdf' })
}

function baseFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('title', 'Mme')
  fd.set('first_name', 'Anaëlle')
  fd.set('last_name', 'DANGLOT-NAKACHE')
  fd.set('email', 'anaelle@example.com')
  fd.set('phone', '0612345678')
  fd.set('birth_date', '2005-01-01')
  fd.set('birth_place', 'Rouen')
  fd.set('address', '1 rue du Test')
  fd.set('family_status', 'Célibataire')
  fd.set('apartment_id', 'apt-1')
  fd.set('apt_number', '7')
  fd.set('desired_signing_date', '2026-09-01')
  fd.set('has_guarantor', 'no')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

describe('createCandidateAction — pièces jointes obligatoires (bug réel : candidature acceptée sans aucune pièce)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse la candidature sans garant si aucune pièce d\'identité candidat n\'est jointe', async () => {
    const { insert } = makeAdminMock()
    const fd = baseFormData()

    const result = await createCandidateAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de joindre votre pièce d\'identité.' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('refuse la candidature sans garant si aucun justificatif de revenus n\'est joint', async () => {
    makeAdminMock()
    const fd = baseFormData()
    fd.append('candidate_docs_identity', pdfFile('identite.pdf'))

    const result = await createCandidateAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de joindre un justificatif de revenus.' })
  })

  it('refuse la candidature avec garant si la pièce d\'identité du garant manque', async () => {
    makeAdminMock()
    const fd = baseFormData({ has_guarantor: 'yes' })
    fd.append('candidate_docs_identity', pdfFile('identite.pdf'))
    fd.append('guarantor_docs_income', pdfFile('revenus-garant.pdf'))

    const result = await createCandidateAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de joindre la pièce d\'identité du garant.' })
  })

  it('refuse la candidature avec garant si le justificatif de revenus du garant manque', async () => {
    makeAdminMock()
    const fd = baseFormData({ has_guarantor: 'yes' })
    fd.append('candidate_docs_identity', pdfFile('identite.pdf'))
    fd.append('guarantor_docs_identity', pdfFile('identite-garant.pdf'))

    const result = await createCandidateAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de joindre un justificatif de revenus du garant.' })
  })

  it('avec garant, n\'exige pas de justificatif de revenus candidat (optionnel dans ce cas)', async () => {
    const { insert } = makeAdminMock()
    const fd = baseFormData({ has_guarantor: 'yes' })
    fd.append('candidate_docs_identity', pdfFile('identite.pdf'))
    fd.append('guarantor_docs_identity', pdfFile('identite-garant.pdf'))
    fd.append('guarantor_docs_income', pdfFile('revenus-garant.pdf'))

    const result = await createCandidateAction(fd)

    expect(result.ok).toBe(true)
    expect(insert).toHaveBeenCalled()
  })

  it('accepte la candidature sans garant quand identité et revenus candidat sont joints', async () => {
    const { insert } = makeAdminMock()
    const fd = baseFormData()
    fd.append('candidate_docs_identity', pdfFile('identite.pdf'))
    fd.append('candidate_docs_income', pdfFile('revenus.pdf'))

    const result = await createCandidateAction(fd)

    expect(result.ok).toBe(true)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Anaëlle', last_name: 'DANGLOT-NAKACHE' }))
  })

  it('un fichier vide (size=0) ne compte pas comme joint', async () => {
    makeAdminMock()
    const fd = baseFormData()
    fd.append('candidate_docs_identity', new File([], 'vide.pdf', { type: 'application/pdf' }))

    const result = await createCandidateAction(fd)

    expect(result).toEqual({ ok: false, error: 'Merci de joindre votre pièce d\'identité.' })
  })
})
