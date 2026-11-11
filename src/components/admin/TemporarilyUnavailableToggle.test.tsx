import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TemporarilyUnavailableToggle from '@/components/admin/TemporarilyUnavailableToggle'

const mockUpdate = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateTemporarilyUnavailableAction: (...args: unknown[]) => mockUpdate(...args),
}))

beforeEach(() => {
  mockUpdate.mockReset()
})

describe('TemporarilyUnavailableToggle', () => {
  it('affiche l\'interrupteur désactivé quand initialValue=false', () => {
    render(<TemporarilyUnavailableToggle apartmentId="a1" aptNumber="7" initialValue={false} />)
    expect(screen.getByRole('switch', { name: 'Indisponible temporairement' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/visites et candidatures ouvertes/)).toBeInTheDocument()
  })

  it('affiche l\'interrupteur activé quand initialValue=true', () => {
    render(<TemporarilyUnavailableToggle apartmentId="a1" aptNumber="7" initialValue={true} />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/visites et candidatures bloquées/)).toBeInTheDocument()
  })

  it('active : appelle updateTemporarilyUnavailableAction(apartmentId, aptNumber, true)', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<TemporarilyUnavailableToggle apartmentId="apt-uuid" aptNumber="7" initialValue={false} />)

    await user.click(screen.getByRole('switch'))

    expect(mockUpdate).toHaveBeenCalledWith('apt-uuid', '7', true)
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'))
  })

  it('désactive : appelle l\'action avec false', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<TemporarilyUnavailableToggle apartmentId="apt-uuid" aptNumber="7" initialValue={true} />)

    await user.click(screen.getByRole('switch'))

    expect(mockUpdate).toHaveBeenCalledWith('apt-uuid', '7', false)
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false'))
  })

  it('revient à l\'état précédent et affiche l\'erreur si l\'action échoue', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<TemporarilyUnavailableToggle apartmentId="a1" aptNumber="7" initialValue={false} />)

    await user.click(screen.getByRole('switch'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur serveur')
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('message par défaut si l\'action échoue sans message', async () => {
    mockUpdate.mockResolvedValue({ ok: false })
    const user = userEvent.setup()
    render(<TemporarilyUnavailableToggle apartmentId="a1" aptNumber="7" initialValue={false} />)

    await user.click(screen.getByRole('switch'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Erreur lors de la mise à jour')
  })
})
