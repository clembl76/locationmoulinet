import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GenerateRentsButton from '@/components/admin/GenerateRentsButton'

const mockGenerateRentsAction = vi.fn()

vi.mock('@/app/admin/actions', () => ({
  generateRentsAction: (...args: unknown[]) => mockGenerateRentsAction(...args),
}))

const defaultProps = { year: 2026, month: 9, mois: 'septembre 2026' }

beforeEach(() => {
  mockGenerateRentsAction.mockReset()
})

describe('GenerateRentsButton — affichage', () => {
  it('affiche le mois dans le libellé du bouton', () => {
    render(<GenerateRentsButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Générer les loyers — septembre 2026' })).toBeInTheDocument()
  })
})

describe('GenerateRentsButton — génération réussie', () => {
  it('appelle generateRentsAction avec year et month', async () => {
    const user = userEvent.setup()
    mockGenerateRentsAction.mockResolvedValue({ inserted: 3, skipped: 17, total: 20 })
    render(<GenerateRentsButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /générer les loyers/i }))

    await waitFor(() => {
      expect(mockGenerateRentsAction).toHaveBeenCalledWith(2026, 9)
    })
  })

  it('affiche le nombre de loyers créés', async () => {
    const user = userEvent.setup()
    mockGenerateRentsAction.mockResolvedValue({ inserted: 3, skipped: 17, total: 20 })
    render(<GenerateRentsButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /générer les loyers/i }))

    expect(await screen.findByText(/3 loyers créés, 17 existants/)).toBeInTheDocument()
  })

  it('affiche un message "déjà générés" quand tout est déjà existant', async () => {
    const user = userEvent.setup()
    mockGenerateRentsAction.mockResolvedValue({ inserted: 0, skipped: 20, total: 20 })
    render(<GenerateRentsButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /générer les loyers/i }))

    expect(await screen.findByText('Déjà générés (20 baux).')).toBeInTheDocument()
  })
})

describe('GenerateRentsButton — erreur', () => {
  it("affiche le message d'erreur si l'action échoue", async () => {
    const user = userEvent.setup()
    mockGenerateRentsAction.mockRejectedValue(new Error('Erreur base de données'))
    render(<GenerateRentsButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /générer les loyers/i }))

    expect(await screen.findByText('Erreur base de données')).toBeInTheDocument()
  })
})
