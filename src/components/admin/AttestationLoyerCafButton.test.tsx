import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AttestationLoyerCafButton from '@/components/admin/AttestationLoyerCafButton'

const mockGenerateAttestationLoyerCaf = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  generateAttestationLoyerCafAction: (...args: unknown[]) => mockGenerateAttestationLoyerCaf(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  tenantIsUpToDate: true,
}

beforeEach(() => {
  mockGenerateAttestationLoyerCaf.mockReset()
})

describe('AttestationLoyerCafButton — affichage', () => {
  it('affiche le bouton "Attestation CAF"', () => {
    render(<AttestationLoyerCafButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Attestation CAF' })).toBeInTheDocument()
  })
})

describe('AttestationLoyerCafButton — génération réussie', () => {
  it("appelle generateAttestationLoyerCafAction avec leaseId, aptNumber et le statut d'à-jour", async () => {
    const user = userEvent.setup()
    mockGenerateAttestationLoyerCaf.mockResolvedValue({ ok: true, filename: 'attestation.pdf', draftId: 'draft-1' })
    render(<AttestationLoyerCafButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))

    await waitFor(() => {
      expect(mockGenerateAttestationLoyerCaf).toHaveBeenCalledWith('lease-123', '7', true)
    })
  })

  it('transmet tenantIsUpToDate=false lorsque le loyer du mois est impayé', async () => {
    const user = userEvent.setup()
    mockGenerateAttestationLoyerCaf.mockResolvedValue({ ok: true, filename: 'attestation.pdf', draftId: 'draft-1' })
    render(<AttestationLoyerCafButton {...defaultProps} tenantIsUpToDate={false} />)

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))

    await waitFor(() => {
      expect(mockGenerateAttestationLoyerCaf).toHaveBeenCalledWith('lease-123', '7', false)
    })
  })

  it('affiche la confirmation et le nom du fichier après génération réussie', async () => {
    const user = userEvent.setup()
    mockGenerateAttestationLoyerCaf.mockResolvedValue({ ok: true, filename: '2026-06_AttestationLoyerCAF_7-DUPONT.pdf', draftId: 'draft-1' })
    render(<AttestationLoyerCafButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))

    await waitFor(() => {
      expect(screen.getByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    })
    expect(screen.getByText('2026-06_AttestationLoyerCAF_7-DUPONT.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Attestation CAF' })).not.toBeInTheDocument()
  })
})

describe('AttestationLoyerCafButton — erreur', () => {
  it("affiche le message d'erreur renvoyé par l'action", async () => {
    const user = userEvent.setup()
    mockGenerateAttestationLoyerCaf.mockResolvedValue({ ok: false, error: 'Données du bail introuvables' })
    render(<AttestationLoyerCafButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))

    await waitFor(() => {
      expect(screen.getByText('Données du bail introuvables')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Attestation CAF' })).toBeInTheDocument()
  })

  it('reste cliquable après une erreur pour permettre une nouvelle tentative', async () => {
    const user = userEvent.setup()
    mockGenerateAttestationLoyerCaf.mockResolvedValueOnce({ ok: false, error: 'Erreur réseau' })
    mockGenerateAttestationLoyerCaf.mockResolvedValueOnce({ ok: true, filename: 'attestation.pdf', draftId: 'draft-2' })
    render(<AttestationLoyerCafButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))
    await waitFor(() => {
      expect(screen.getByText('Erreur réseau')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Attestation CAF' }))
    await waitFor(() => {
      expect(screen.getByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    })
    expect(mockGenerateAttestationLoyerCaf).toHaveBeenCalledTimes(2)
  })
})
