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
import { updateDepositPaidAction } from '@/app/admin/apartments/[number]/actions'

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
