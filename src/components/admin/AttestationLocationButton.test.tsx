import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AttestationLocationButton from '@/components/admin/AttestationLocationButton'

const mockGenerateAttestationAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  generateAttestationAction: (...args: unknown[]) => mockGenerateAttestationAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  hasUnpaidRent: false,
}

beforeEach(() => {
  mockGenerateAttestationAction.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('AttestationLocationButton — affichage', () => {
  it('affiche le bouton "Attestation de location"', () => {
    render(<AttestationLocationButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Attestation de location' })).toBeInTheDocument()
  })
})

describe('AttestationLocationButton — génération réussie', () => {
  it('appelle generateAttestationAction avec leaseId et aptNumber sans confirmation si le loyer est à jour', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm')
    mockGenerateAttestationAction.mockResolvedValue({ ok: true, filename: 'attestation.pdf', draftId: 'draft-1' })
    render(<AttestationLocationButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation de location' }))

    await waitFor(() => {
      expect(mockGenerateAttestationAction).toHaveBeenCalledWith('lease-123', '7')
    })
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('affiche la confirmation et le nom du fichier après génération réussie', async () => {
    const user = userEvent.setup()
    mockGenerateAttestationAction.mockResolvedValue({ ok: true, filename: '2026-09_AttestationLocation_7.pdf', draftId: 'draft-1' })
    render(<AttestationLocationButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation de location' }))

    expect(await screen.findByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    expect(screen.getByText('2026-09_AttestationLocation_7.pdf')).toBeInTheDocument()
  })
})

describe('AttestationLocationButton — loyer impayé', () => {
  it('demande confirmation avant de générer quand hasUnpaidRent est true', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockGenerateAttestationAction.mockResolvedValue({ ok: true, filename: 'attestation.pdf', draftId: 'draft-1' })
    render(<AttestationLocationButton {...defaultProps} hasUnpaidRent={true} />)

    await user.click(screen.getByRole('button', { name: 'Attestation de location' }))

    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(mockGenerateAttestationAction).toHaveBeenCalledWith('lease-123', '7'))
  })

  it("n'appelle pas l'action si l'utilisateur annule la confirmation", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AttestationLocationButton {...defaultProps} hasUnpaidRent={true} />)

    await user.click(screen.getByRole('button', { name: 'Attestation de location' }))

    expect(mockGenerateAttestationAction).not.toHaveBeenCalled()
  })
})

describe('AttestationLocationButton — erreur', () => {
  it("affiche le message d'erreur renvoyé par l'action", async () => {
    const user = userEvent.setup()
    mockGenerateAttestationAction.mockResolvedValue({ ok: false, error: 'Bail introuvable' })
    render(<AttestationLocationButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation de location' }))

    expect(await screen.findByText('Bail introuvable')).toBeInTheDocument()
  })
})
