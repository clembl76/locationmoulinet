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
}

beforeEach(() => {
  mockMarkReceivedAndGenerateQuittance.mockReset()
})

describe('QuittanceButton — affichage', () => {
  it('affiche le libellé « Encaisser et quittance » sans le mois', () => {
    render(<QuittanceButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Encaisser et quittance' })).toBeInTheDocument()
    expect(screen.queryByText(/septembre/i)).not.toBeInTheDocument()
  })

  it('utilise le bouton primaire pleine largeur du design system, libellé centré', () => {
    render(<QuittanceButton {...defaultProps} />)
    const button = screen.getByRole('button', { name: 'Encaisser et quittance' })
    expect(button).toHaveClass('w-full', 'justify-center', 'text-center', 'bg-gray-900', 'rounded-lg')
    expect(button).not.toHaveClass('text-left')
  })
})

describe('QuittanceButton — génération réussie', () => {
  it('appelle markReceivedAndGenerateQuittance avec les bons identifiants', async () => {
    const user = userEvent.setup()
    mockMarkReceivedAndGenerateQuittance.mockResolvedValue({ ok: true, filename: 'quittance.pdf', draftId: 'draft-1' })
    render(<QuittanceButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /encaisser et quittance/i }))

    await waitFor(() => {
      expect(mockMarkReceivedAndGenerateQuittance).toHaveBeenCalledWith('rent-1', 'lease-123', '7', 2026, 9)
    })
  })

  it('affiche la confirmation et le nom du fichier après génération réussie', async () => {
    const user = userEvent.setup()
    mockMarkReceivedAndGenerateQuittance.mockResolvedValue({ ok: true, filename: '2026-09_Quittance_7.pdf', draftId: 'draft-1' })
    render(<QuittanceButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /encaisser et quittance/i }))

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

    await user.click(screen.getByRole('button', { name: /encaisser et quittance/i }))

    expect(await screen.findByText('Loyer introuvable')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
