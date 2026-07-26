import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoveInDateConfirmedCheckbox from '@/components/admin/MoveInDateConfirmedCheckbox'

const mockUpdate = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateMoveInDateConfirmedAction: (...args: unknown[]) => mockUpdate(...args),
}))

beforeEach(() => {
  mockUpdate.mockReset()
})

describe('MoveInDateConfirmedCheckbox', () => {
  it('affiche la case décochée quand initialValue=false', () => {
    render(<MoveInDateConfirmedCheckbox leaseId="l1" aptNumber="31" initialValue={false} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('affiche la case cochée quand initialValue=true', () => {
    render(<MoveInDateConfirmedCheckbox leaseId="l1" aptNumber="31" initialValue={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('coche la case et appelle updateMoveInDateConfirmedAction(leaseId, aptNumber, true)', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<MoveInDateConfirmedCheckbox leaseId="lease-1" aptNumber="31" initialValue={false} />)

    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(mockUpdate).toHaveBeenCalledWith('lease-1', '31', true)
  })

  it('revient à l\'état précédent et affiche une erreur si l\'action échoue', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<MoveInDateConfirmedCheckbox leaseId="lease-1" aptNumber="31" initialValue={false} />)

    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText('Erreur serveur')).toBeInTheDocument()
  })
})
