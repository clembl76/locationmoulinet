// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/quittance', () => ({
  createVisitCalendarEvent: vi.fn().mockResolvedValue(undefined),
  sendVisitNotificationEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/adminData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/adminData')>()
  return {
    ...actual,
    runSqlAdmin: vi.fn(),
    getTemporarilyUnavailableApartmentNumbers: vi.fn(),
  }
})

import { createAdminClient } from '@/lib/supabaseAdmin'
import { runSqlAdmin, getTemporarilyUnavailableApartmentNumbers } from '@/lib/adminData'
import { createVisitorAction } from '@/app/visiter/actions'

function makeAdminMock() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'visitor-1' }, error: null })
  const select = vi.fn().mockReturnValue({ single })
  const visitorsInsert = vi.fn().mockReturnValue({ select })
  const linksInsert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => (table === 'visitors' ? { insert: visitorsInsert } : { insert: linksInsert }))
  vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
  return { from, visitorsInsert, linksInsert }
}

function baseData(overrides: Partial<Parameters<typeof createVisitorAction>[0]> = {}) {
  return {
    last_name: 'Dupont',
    first_name: 'Léa',
    email: 'lea@example.com',
    phone: '0612345678',
    visit_date: '2026-11-20',
    visit_time: '10:00',
    desired_duration_months: 12,
    comments: '',
    apartment_ids: ['11111111-1111-1111-1111-111111111111'],
    guarantor_type: 'physical' as const,
    situation: 'student' as const,
    total_income: 2000,
    studies_at: 'Université de Rouen',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getTemporarilyUnavailableApartmentNumbers).mockResolvedValue([])
  vi.mocked(runSqlAdmin).mockResolvedValue([])
})

describe('createVisitorAction — appartement temporairement indisponible', () => {
  it('refuse la visite avec un message clair si l\'appartement est désactivé', async () => {
    const { visitorsInsert } = makeAdminMock()
    vi.mocked(getTemporarilyUnavailableApartmentNumbers).mockResolvedValue(['7'])

    const result = await createVisitorAction(baseData())

    expect(getTemporarilyUnavailableApartmentNumbers).toHaveBeenCalledWith(['11111111-1111-1111-1111-111111111111'])
    expect(result).toEqual({
      ok: false,
      error: "L'appartement 7 est temporairement indisponible : il ne peut pas recevoir de visite ni de candidature pour le moment.",
    })
    expect(visitorsInsert).not.toHaveBeenCalled()
  })

  it('liste tous les appartements désactivés parmi la sélection', async () => {
    makeAdminMock()
    vi.mocked(getTemporarilyUnavailableApartmentNumbers).mockResolvedValue(['7', '12'])

    const result = await createVisitorAction(baseData({
      apartment_ids: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
    }))

    expect(result).toEqual({
      ok: false,
      error: 'Les appartements 7, 12 sont temporairement indisponibles : ils ne peuvent pas recevoir de visite ni de candidature pour le moment.',
    })
  })

  it('enregistre la visite si aucun appartement n\'est désactivé', async () => {
    const { visitorsInsert, linksInsert } = makeAdminMock()

    const result = await createVisitorAction(baseData())

    expect(result).toEqual({ ok: true, visitorId: 'visitor-1' })
    expect(visitorsInsert).toHaveBeenCalled()
    expect(linksInsert).toHaveBeenCalledWith([
      { visitor_id: 'visitor-1', apartment_id: '11111111-1111-1111-1111-111111111111' },
    ])
  })

  it('ne vérifie pas la disponibilité si aucun appartement n\'est sélectionné', async () => {
    makeAdminMock()

    const result = await createVisitorAction(baseData({ apartment_ids: [] }))

    expect(result).toEqual({ ok: false, error: 'Veuillez sélectionner au moins un appartement.' })
    expect(getTemporarilyUnavailableApartmentNumbers).not.toHaveBeenCalled()
  })

  it('retourne une erreur (sans créer la visite) si la vérification échoue', async () => {
    const { visitorsInsert } = makeAdminMock()
    vi.mocked(getTemporarilyUnavailableApartmentNumbers).mockRejectedValue(new Error('DB indisponible'))

    const result = await createVisitorAction(baseData())

    expect(result).toEqual({ ok: false, error: 'DB indisponible' })
    expect(visitorsInsert).not.toHaveBeenCalled()
  })
})
