import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EdlEntreeEmailButton from '@/components/admin/EdlEntreeEmailButton'

const mockGenerateEdlEntreeEmail = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  generateEdlEntreeEmailAction: (...args: unknown[]) => mockGenerateEdlEntreeEmail(...args),
}))

beforeEach(() => {
  mockGenerateEdlEntreeEmail.mockReset()
})

describe('EdlEntreeEmailButton — affichage', () => {
  it('affiche le bouton "Générer mail arrivée"', () => {
    render(<EdlEntreeEmailButton tenantEmail="locataire@exemple.fr" />)
    expect(screen.getByRole('button', { name: 'Générer mail arrivée' })).toBeInTheDocument()
  })

  it('désactive le bouton si aucun email locataire', () => {
    render(<EdlEntreeEmailButton tenantEmail={null} />)
    expect(screen.getByRole('button', { name: 'Générer mail arrivée' })).toBeDisabled()
  })
})

describe('EdlEntreeEmailButton — génération réussie', () => {
  it('appelle generateEdlEntreeEmailAction avec l\'email du locataire au clic', async () => {
    const user = userEvent.setup()
    mockGenerateEdlEntreeEmail.mockResolvedValue({ ok: true })
    render(<EdlEntreeEmailButton tenantEmail="locataire@exemple.fr" />)

    await user.click(screen.getByRole('button', { name: 'Générer mail arrivée' }))

    await waitFor(() => {
      expect(mockGenerateEdlEntreeEmail).toHaveBeenCalledWith('locataire@exemple.fr')
    })
  })

  it('affiche la confirmation après génération réussie', async () => {
    const user = userEvent.setup()
    mockGenerateEdlEntreeEmail.mockResolvedValue({ ok: true })
    render(<EdlEntreeEmailButton tenantEmail="locataire@exemple.fr" />)

    await user.click(screen.getByRole('button', { name: 'Générer mail arrivée' }))

    await waitFor(() => {
      expect(screen.getByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Générer mail arrivée' })).not.toBeInTheDocument()
  })
})

describe('EdlEntreeEmailButton — erreur', () => {
  it("affiche le message d'erreur renvoyé par l'action", async () => {
    const user = userEvent.setup()
    mockGenerateEdlEntreeEmail.mockResolvedValue({ ok: false, error: 'Email locataire introuvable' })
    render(<EdlEntreeEmailButton tenantEmail="locataire@exemple.fr" />)

    await user.click(screen.getByRole('button', { name: 'Générer mail arrivée' }))

    await waitFor(() => {
      expect(screen.getByText('Email locataire introuvable')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Générer mail arrivée' })).toBeInTheDocument()
  })

  it('reste cliquable après une erreur pour permettre une nouvelle tentative', async () => {
    const user = userEvent.setup()
    mockGenerateEdlEntreeEmail.mockResolvedValueOnce({ ok: false, error: 'Erreur réseau' })
    mockGenerateEdlEntreeEmail.mockResolvedValueOnce({ ok: true })
    render(<EdlEntreeEmailButton tenantEmail="locataire@exemple.fr" />)

    await user.click(screen.getByRole('button', { name: 'Générer mail arrivée' }))
    await waitFor(() => {
      expect(screen.getByText('Erreur réseau')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Générer mail arrivée' }))
    await waitFor(() => {
      expect(screen.getByText('✓ Brouillon Gmail créé')).toBeInTheDocument()
    })
    expect(mockGenerateEdlEntreeEmail).toHaveBeenCalledTimes(2)
  })
})
