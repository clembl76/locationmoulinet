import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditableMoveInDate from '@/components/admin/EditableMoveInDate'

const mockUpdate = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateMoveInDateAction: (...args: unknown[]) => mockUpdate(...args),
}))

beforeEach(() => {
  mockUpdate.mockReset()
})

describe('EditableMoveInDate — affichage', () => {
  it('affiche la date formatée en français quand une valeur est présente', () => {
    render(<EditableMoveInDate leaseId="l1" aptNumber="7" initialValue="2026-08-03" />)
    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
  })

  it('affiche un tiret quand initialValue est null', () => {
    render(<EditableMoveInDate leaseId="l1" aptNumber="7" initialValue={null} />)
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument()
  })
})

describe('EditableMoveInDate — édition au clic', () => {
  it('affiche un input date au clic sur la valeur', async () => {
    const user = userEvent.setup()
    render(<EditableMoveInDate leaseId="l1" aptNumber="7" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))

    const input = screen.getByDisplayValue('2026-08-03')
    expect(input).toHaveAttribute('type', 'date')
  })

  it('enregistre la nouvelle date en quittant le champ (blur) et appelle updateMoveInDateAction', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<EditableMoveInDate leaseId="lease-1" aptNumber="7" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    const input = screen.getByDisplayValue('2026-08-03')
    await user.clear(input)
    await user.type(input, '2026-08-10')
    await user.tab()

    expect(mockUpdate).toHaveBeenCalledWith('lease-1', '7', '2026-08-10')
    expect(await screen.findByRole('button', { name: '10/08/2026' })).toBeInTheDocument()
  })

  it('revient à la valeur précédente et affiche une erreur si l\'action échoue', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<EditableMoveInDate leaseId="lease-1" aptNumber="7" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    const input = screen.getByDisplayValue('2026-08-03')
    await user.clear(input)
    await user.type(input, '2026-08-10')
    await user.tab()

    expect(await screen.findByText('Erreur serveur')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
  })

  it('annule l\'édition avec Échap sans appeler l\'action', async () => {
    const user = userEvent.setup()
    render(<EditableMoveInDate leaseId="l1" aptNumber="7" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    const input = screen.getByDisplayValue('2026-08-03')
    await user.type(input, '{Escape}')

    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('ne fait rien si la date est inchangée', async () => {
    const user = userEvent.setup()
    render(<EditableMoveInDate leaseId="l1" aptNumber="7" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    await user.tab()

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
  })
})
