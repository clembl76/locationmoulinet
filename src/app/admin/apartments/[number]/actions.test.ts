// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/quittance', () => ({}))

vi.mock('@/lib/adminData', () => ({
  runSqlAdmin: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import {
  updateDepositPaidAction,
  updateEdlSentAction,
  updateListingPublishedAction,
  updateMoveInDateConfirmedAction,
  updateMoveInDateAction,
  savePreavisAction,
} from '@/app/admin/apartments/[number]/actions'

function makeAdminMock(updateError: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ update })
  vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
  return { from, update, eq }
}

describe('updateDepositPaidAction — test de non-régression du module actions.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour deposit_paid et retourne ok:true', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateDepositPaidAction('lease-1', '7', true)

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('leases')
    expect(update).toHaveBeenCalledWith({ deposit_paid: true })
    expect(eq).toHaveBeenCalledWith('id', 'lease-1')
  })

  it('retourne ok:false avec le message d\'erreur si la mise à jour échoue', async () => {
    makeAdminMock({ message: 'Erreur DB' })

    const result = await updateDepositPaidAction('lease-1', '7', false)

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
  })
})

describe('updateEdlSentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renseigne edl_sent_at (date du jour) quand value=true', async () => {
    const { update } = makeAdminMock()

    const result = await updateEdlSentAction('lease-1', '7', true)

    expect(result).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ edl_sent_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
  })

  it('remet edl_sent_at à null quand value=false', async () => {
    const { update } = makeAdminMock()

    await updateEdlSentAction('lease-1', '7', false)

    expect(update).toHaveBeenCalledWith({ edl_sent_at: null })
  })
})

describe('updateListingPublishedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renseigne listing_published_at (date du jour) quand value=true', async () => {
    const { update } = makeAdminMock()

    const result = await updateListingPublishedAction('lease-1', '7', true)

    expect(result).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ listing_published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
  })

  it('remet listing_published_at à null quand value=false', async () => {
    const { update } = makeAdminMock()

    await updateListingPublishedAction('lease-1', '7', false)

    expect(update).toHaveBeenCalledWith({ listing_published_at: null })
  })
})

describe('updateMoveInDateConfirmedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renseigne move_in_date_confirmed_at (date du jour) quand value=true', async () => {
    const { update } = makeAdminMock()

    const result = await updateMoveInDateConfirmedAction('lease-1', '31', true)

    expect(result).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ move_in_date_confirmed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
  })

  it('remet move_in_date_confirmed_at à null quand value=false', async () => {
    const { update } = makeAdminMock()

    await updateMoveInDateConfirmedAction('lease-1', '31', false)

    expect(update).toHaveBeenCalledWith({ move_in_date_confirmed_at: null })
  })
})

describe('updateMoveInDateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour move_in_inspection_date et retourne ok:true', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateMoveInDateAction('lease-1', '7', '2026-08-10')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('leases')
    expect(update).toHaveBeenCalledWith({ move_in_inspection_date: '2026-08-10' })
    expect(eq).toHaveBeenCalledWith('id', 'lease-1')
  })

  it('retourne ok:false avec le message d\'erreur si la mise à jour échoue', async () => {
    makeAdminMock({ message: 'Erreur DB' })

    const result = await updateMoveInDateAction('lease-1', '7', '2026-08-10')

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
  })
})

describe('savePreavisAction — notice_given_at', () => {
  function makePreavisAdminMock(currentNoticeGivenAt: string | null) {
    const single = vi.fn().mockResolvedValue({ data: { notice_given_at: currentNoticeGivenAt } })
    const selectEq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq: selectEq })

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })

    const from = vi.fn().mockReturnValue({ select, update })
    vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
    return { update }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renseigne notice_given_at (date du jour) au premier préavis (valeur actuelle null)', async () => {
    const { update } = makePreavisAdminMock(null)

    await savePreavisAction('lease-1', '7', '2026-12-31')

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      move_out_inspection_date: '2026-12-31',
      end_date: '2026-12-31',
      notice_given_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }))
  })

  it('ne réécrit pas notice_given_at si déjà renseignée', async () => {
    const { update } = makePreavisAdminMock('2026-01-01')

    await savePreavisAction('lease-1', '7', '2026-12-31')

    expect(update).toHaveBeenCalledWith({
      move_out_inspection_date: '2026-12-31',
      end_date: '2026-12-31',
    })
  })
})
