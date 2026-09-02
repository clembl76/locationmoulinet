import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditableLeaseDate from '@/components/admin/EditableLeaseDate'

const mockUpdate = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateLeaseDateAction: (...args: unknown[]) => mockUpdate(...args),
}))

beforeEach(() => {
  mockUpdate.mockReset()
})

describe('EditableLeaseDate — affichage', () => {
  it('affiche la date formatée en français quand une valeur est présente', () => {
    render(<EditableLeaseDate leaseId="l1" aptNumber="7" field="move_in_inspection_date" initialValue="2026-08-03" />)
    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
  })

  it('affiche un tiret quand initialValue est null', () => {
    render(<EditableLeaseDate leaseId="l1" aptNumber="7" field="move_in_inspection_date" initialValue={null} />)
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument()
  })
})

describe('EditableLeaseDate — édition au clic', () => {
  it('affiche un input date au clic sur la valeur', async () => {
    const user = userEvent.setup()
    render(<EditableLeaseDate leaseId="l1" aptNumber="7" field="signing_date" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))

    const input = screen.getByDisplayValue('2026-08-03')
    expect(input).toHaveAttribute('type', 'date')
  })

  it('enregistre la nouvelle date en quittant le champ (blur) et appelle updateLeaseDateAction avec le bon champ', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<EditableLeaseDate leaseId="lease-1" aptNumber="7" field="signing_date" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    const input = screen.getByDisplayValue('2026-08-03')
    await user.clear(input)
    await user.type(input, '2026-08-10')
    await user.tab()

    expect(mockUpdate).toHaveBeenCalledWith('lease-1', '7', 'signing_date', '2026-08-10')
    expect(await screen.findByRole('button', { name: '10/08/2026' })).toBeInTheDocument()
  })

  it('appelle updateLeaseDateAction avec field="end_date" pour la date de fin', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<EditableLeaseDate leaseId="lease-1" aptNumber="7" field="end_date" initialValue="2027-08-02" />)

    await user.click(screen.getByRole('button', { name: '02/08/2027' }))
    const input = screen.getByDisplayValue('2027-08-02')
    await user.clear(input)
    await user.type(input, '2027-08-15')
    await user.tab()

    expect(mockUpdate).toHaveBeenCalledWith('lease-1', '7', 'end_date', '2027-08-15')
  })

  it('revient à la valeur précédente et affiche une erreur si l\'action échoue', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<EditableLeaseDate leaseId="lease-1" aptNumber="7" field="move_in_inspection_date" initialValue="2026-08-03" />)

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
    render(<EditableLeaseDate leaseId="l1" aptNumber="7" field="move_in_inspection_date" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    const input = screen.getByDisplayValue('2026-08-03')
    await user.type(input, '{Escape}')

    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('ne fait rien si la date est inchangée', async () => {
    const user = userEvent.setup()
    render(<EditableLeaseDate leaseId="l1" aptNumber="7" field="move_in_inspection_date" initialValue="2026-08-03" />)

    await user.click(screen.getByRole('button', { name: '03/08/2026' }))
    await user.tab()

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '03/08/2026' })).toBeInTheDocument()
  })
})
