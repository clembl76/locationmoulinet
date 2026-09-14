import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreavisButton from '@/components/admin/PreavisButton'

const mockSavePreavisAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  savePreavisAction: (...args: unknown[]) => mockSavePreavisAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  currentMoveOut: null,
}

beforeEach(() => {
  mockSavePreavisAction.mockReset()
})

describe('PreavisButton — affichage initial', () => {
  it('affiche le bouton "Saisir un préavis de départ"', () => {
    render(<PreavisButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Saisir un préavis de départ' })).toBeInTheDocument()
  })
})

describe('PreavisButton — ouverture du formulaire', () => {
  it('affiche le champ date et les boutons Confirmer/Annuler au clic', async () => {
    const user = userEvent.setup()
    render(<PreavisButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))

    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('pré-remplit le champ date avec currentMoveOut si fourni', async () => {
    const user = userEvent.setup()
    render(<PreavisButton {...defaultProps} currentMoveOut="2026-11-30" />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput.value).toBe('2026-11-30')
  })

  it('referme le formulaire au clic sur Annuler', async () => {
    const user = userEvent.setup()
    render(<PreavisButton {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: 'Saisir un préavis de départ' })).toBeInTheDocument()
    expect(mockSavePreavisAction).not.toHaveBeenCalled()
  })
})

describe('PreavisButton — enregistrement réussi', () => {
  it('appelle savePreavisAction avec la date saisie', async () => {
    const user = userEvent.setup()
    mockSavePreavisAction.mockResolvedValue({ ok: true })
    render(<PreavisButton {...defaultProps} currentMoveOut="2026-11-30" />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    await waitFor(() => {
      expect(mockSavePreavisAction).toHaveBeenCalledWith('lease-123', '7', '2026-11-30')
    })
  })

  it('affiche le message de confirmation avec la date de départ', async () => {
    const user = userEvent.setup()
    mockSavePreavisAction.mockResolvedValue({ ok: true })
    render(<PreavisButton {...defaultProps} currentMoveOut="2026-11-30" />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByText(/Préavis enregistré — départ le 30\/11\/2026/)).toBeInTheDocument()
  })
})

describe('PreavisButton — erreur', () => {
  it("affiche le message d'erreur et garde le formulaire ouvert", async () => {
    const user = userEvent.setup()
    mockSavePreavisAction.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<PreavisButton {...defaultProps} currentMoveOut="2026-11-30" />)

    await user.click(screen.getByRole('button', { name: 'Saisir un préavis de départ' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByText('Erreur DB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
  })
})
