import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuittanceCautionButton from '@/components/admin/QuittanceCautionButton'

const mockGenerateQuittanceCautionAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  generateQuittanceCautionAction: (...args: unknown[]) => mockGenerateQuittanceCautionAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  hasCautionTransaction: true,
}

beforeEach(() => {
  mockGenerateQuittanceCautionAction.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true).mockClear()
})

describe('QuittanceCautionButton — affichage', () => {
  it('affiche le bouton "Quittance de caution"', () => {
    render(<QuittanceCautionButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Quittance de caution' })).toBeInTheDocument()
  })

  it("n'affiche pas d'avertissement quand hasCautionTransaction est true", () => {
    render(<QuittanceCautionButton {...defaultProps} />)
    expect(screen.queryByText(/Aucune transaction caution trouvée/)).not.toBeInTheDocument()
  })

  it("affiche un avertissement et un lien vers Paiements quand hasCautionTransaction est false", () => {
    render(<QuittanceCautionButton {...defaultProps} hasCautionTransaction={false} />)
    expect(screen.getByText(/Aucune transaction caution trouvée/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'vérifier les paiements' })).toHaveAttribute('href', '/admin/payments')
  })
})

describe('QuittanceCautionButton — génération réussie', () => {
  it('appelle generateQuittanceCautionAction sans confirmation si hasCautionTransaction est true', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    mockGenerateQuittanceCautionAction.mockResolvedValue({ ok: true, filename: 'caution.pdf', draftId: 'draft-1' })
    render(<QuittanceCautionButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Quittance de caution' }))

    await waitFor(() => expect(mockGenerateQuittanceCautionAction).toHaveBeenCalledWith('lease-123', '7'))
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('affiche la confirmation et le fichier généré', async () => {
    const user = userEvent.setup()
    mockGenerateQuittanceCautionAction.mockResolvedValue({ ok: true, filename: 'caution-7.pdf', draftId: 'draft-1' })
    render(<QuittanceCautionButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Quittance de caution' }))

    expect(await screen.findByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    expect(screen.getByText('caution-7.pdf')).toBeInTheDocument()
  })
})

describe('QuittanceCautionButton — sans transaction de caution', () => {
  it('demande confirmation avant de générer', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockGenerateQuittanceCautionAction.mockResolvedValue({ ok: true, filename: 'caution.pdf', draftId: 'draft-1' })
    render(<QuittanceCautionButton {...defaultProps} hasCautionTransaction={false} />)

    await user.click(screen.getByRole('button', { name: 'Quittance de caution' }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(mockGenerateQuittanceCautionAction).toHaveBeenCalledWith('lease-123', '7'))
  })

  it("n'appelle pas l'action si l'utilisateur annule", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<QuittanceCautionButton {...defaultProps} hasCautionTransaction={false} />)

    await user.click(screen.getByRole('button', { name: 'Quittance de caution' }))

    expect(mockGenerateQuittanceCautionAction).not.toHaveBeenCalled()
  })
})

describe('QuittanceCautionButton — erreur', () => {
  it("affiche le message d'erreur renvoyé par l'action", async () => {
    const user = userEvent.setup()
    mockGenerateQuittanceCautionAction.mockResolvedValue({ ok: false, error: 'Bail introuvable' })
    render(<QuittanceCautionButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Quittance de caution' }))

    expect(await screen.findByText('Bail introuvable')).toBeInTheDocument()
  })
})
