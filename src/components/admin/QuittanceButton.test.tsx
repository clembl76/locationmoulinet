import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuittanceButton from '@/components/admin/QuittanceButton'

const mockMarkReceivedAndGenerateQuittance = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  markReceivedAndGenerateQuittance: (...args: unknown[]) => mockMarkReceivedAndGenerateQuittance(...args),
}))

const defaultProps = {
  rentId: 'rent-1',
  leaseId: 'lease-123',
  aptNumber: '7',
  year: 2026,
  month: 9,
  mois: 'septembre',
}

beforeEach(() => {
  mockMarkReceivedAndGenerateQuittance.mockReset()
})

describe('QuittanceButton — affichage', () => {
  it('affiche le mois dans le libellé du bouton', () => {
    render(<QuittanceButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /marquer encaissé et générer la quittance septembre/i })).toBeInTheDocument()
  })
})

describe('QuittanceButton — génération réussie', () => {
  it('appelle markReceivedAndGenerateQuittance avec les bons identifiants', async () => {
    const user = userEvent.setup()
    mockMarkReceivedAndGenerateQuittance.mockResolvedValue({ ok: true, filename: 'quittance.pdf', draftId: 'draft-1' })
    render(<QuittanceButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /marquer encaissé/i }))

    await waitFor(() => {
      expect(mockMarkReceivedAndGenerateQuittance).toHaveBeenCalledWith('rent-1', 'lease-123', '7', 2026, 9)
    })
  })

  it('affiche la confirmation et le nom du fichier après génération réussie', async () => {
    const user = userEvent.setup()
    mockMarkReceivedAndGenerateQuittance.mockResolvedValue({ ok: true, filename: '2026-09_Quittance_7.pdf', draftId: 'draft-1' })
    render(<QuittanceButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /marquer encaissé/i }))

    expect(await screen.findByText(/Encaissé · Brouillon Gmail créé/)).toBeInTheDocument()
    expect(screen.getByText('2026-09_Quittance_7.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('QuittanceButton — erreur', () => {
  it("affiche le message d'erreur renvoyé par l'action", async () => {
    const user = userEvent.setup()
    mockMarkReceivedAndGenerateQuittance.mockResolvedValue({ ok: false, error: 'Loyer introuvable' })
    render(<QuittanceButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /marquer encaissé/i }))

    expect(await screen.findByText('Loyer introuvable')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
