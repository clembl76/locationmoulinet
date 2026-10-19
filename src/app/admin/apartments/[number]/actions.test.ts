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
  updateLeaseDateAction,
  savePreavisAction,
  setRentWrittenOffAction,
  updateRentNotesAction,
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

describe('updateLeaseDateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour move_in_inspection_date et retourne ok:true', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateLeaseDateAction('lease-1', '7', 'move_in_inspection_date', '2026-08-10')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('leases')
    expect(update).toHaveBeenCalledWith({ move_in_inspection_date: '2026-08-10' })
    expect(eq).toHaveBeenCalledWith('id', 'lease-1')
  })

  it('met à jour signing_date selon le champ demandé', async () => {
    const { update } = makeAdminMock()

    await updateLeaseDateAction('lease-1', '7', 'signing_date', '2026-08-01')

    expect(update).toHaveBeenCalledWith({ signing_date: '2026-08-01' })
  })

  it('met à jour end_date selon le champ demandé', async () => {
    const { update } = makeAdminMock()

    await updateLeaseDateAction('lease-1', '7', 'end_date', '2027-07-31')

    expect(update).toHaveBeenCalledWith({ end_date: '2027-07-31' })
  })

  it('retourne ok:false avec le message d\'erreur si la mise à jour échoue', async () => {
    makeAdminMock({ message: 'Erreur DB' })

    const result = await updateLeaseDateAction('lease-1', '7', 'move_in_inspection_date', '2026-08-10')

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

describe('setRentWrittenOffAction', () => {
  function makeWriteOffMock(result: { data: { id: string }[] | null; error: { message: string } | null }) {
    const select = vi.fn().mockResolvedValue(result)
    const is = vi.fn().mockReturnValue({ select })
    const eq = vi.fn().mockReturnValue({ is })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })
    vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
    return { from, update, eq, is }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renseigne written_off_at (date du jour), uniquement sur un loyer non encaissé', async () => {
    const { from, update, eq, is } = makeWriteOffMock({ data: [{ id: 'rent-1' }], error: null })

    const result = await setRentWrittenOffAction('rent-1', '21', true)

    expect(result).toEqual({ ok: true, writtenOffAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
    expect(from).toHaveBeenCalledWith('rents')
    expect(update).toHaveBeenCalledWith({ written_off_at: result.writtenOffAt })
    expect(eq).toHaveBeenCalledWith('id', 'rent-1')
    expect(is).toHaveBeenCalledWith('amount_received', null)
  })

  it('remet written_off_at à null quand value=false', async () => {
    const { update } = makeWriteOffMock({ data: [{ id: 'rent-1' }], error: null })

    const result = await setRentWrittenOffAction('rent-1', '21', false)

    expect(result).toEqual({ ok: true, writtenOffAt: null })
    expect(update).toHaveBeenCalledWith({ written_off_at: null })
  })

  it('refuse un loyer introuvable ou déjà encaissé (aucune ligne modifiée)', async () => {
    makeWriteOffMock({ data: [], error: null })

    const result = await setRentWrittenOffAction('rent-1', '21', true)

    expect(result).toEqual({ ok: false, error: 'Loyer introuvable ou déjà encaissé' })
    expect(console.error).toHaveBeenCalled()
  })

  it("remonte l'erreur de la base", async () => {
    makeWriteOffMock({ data: null, error: { message: 'Erreur DB' } })

    const result = await setRentWrittenOffAction('rent-1', '21', true)

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
    expect(console.error).toHaveBeenCalled()
  })
})

describe('updateRentNotesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('enregistre le commentaire sans les espaces superflus', async () => {
    const { from, update, eq } = makeAdminMock()

    const result = await updateRentNotesAction('rent-1', '21', '  Payé en espèces ')

    expect(result).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith('rents')
    expect(update).toHaveBeenCalledWith({ notes: 'Payé en espèces' })
    expect(eq).toHaveBeenCalledWith('id', 'rent-1')
  })

  it('enregistre null pour un commentaire vide', async () => {
    const { update } = makeAdminMock()

    await updateRentNotesAction('rent-1', '21', '   ')

    expect(update).toHaveBeenCalledWith({ notes: null })
  })

  it("retourne l'erreur et la journalise si la mise à jour échoue", async () => {
    makeAdminMock({ message: 'Erreur DB' })

    const result = await updateRentNotesAction('rent-1', '21', 'x')

    expect(result).toEqual({ ok: false, error: 'Erreur DB' })
    expect(console.error).toHaveBeenCalled()
  })
})
