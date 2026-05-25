import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApartmentInstallationPanel from '@/components/admin/ApartmentInstallationPanel'

const mockGetInstallation = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/app/admin/inventory/summaryActions', () => ({
  getInstallationAction: (...args: unknown[]) => mockGetInstallation(...args),
  updateInstallationAction: (...args: unknown[]) => mockUpdate(...args),
}))

describe('ApartmentInstallationPanel — affichage', () => {
  beforeEach(() => {
    mockGetInstallation.mockResolvedValue({ hot_water: 'Électrique', heating: 'Gaz' })
    mockUpdate.mockResolvedValue(undefined)
  })

  it('affiche les installations eau chaude et chauffage', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Électrique')).toBeInTheDocument())
    expect(screen.getByText('Gaz')).toBeInTheDocument()
  })

  it('affiche le bouton "Modifier" quand les installations existent', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
  })

  it('affiche "Non renseigné" si installation null', async () => {
    mockGetInstallation.mockResolvedValue(null)
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Non renseigné')).toBeInTheDocument())
  })

  it('affiche le bouton "+ Ajouter" si installation null', async () => {
    mockGetInstallation.mockResolvedValue(null)
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Ajouter' })).toBeInTheDocument())
  })

  it('affiche le titre Installations', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Électrique')).toBeInTheDocument())
    expect(screen.getByText('Installations')).toBeInTheDocument()
  })

  it('appelle getInstallationAction avec le bon apartmentId', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-42" />)
    await waitFor(() => expect(mockGetInstallation).toHaveBeenCalledWith('apt-42'))
  })
})

describe('ApartmentInstallationPanel — collapse', () => {
  beforeEach(() => {
    mockGetInstallation.mockResolvedValue({ hot_water: 'Électrique', heating: 'Gaz' })
  })

  it('se replie et masque les données avec le toggle', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Électrique')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Installations/ }))
    expect(screen.queryByText('Électrique')).not.toBeInTheDocument()
  })

  it('se déplie à nouveau après un second toggle', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Électrique')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Installations/ }))
    await user.click(screen.getByRole('button', { name: /Installations/ }))
    expect(screen.getByText('Électrique')).toBeInTheDocument()
  })
})

describe('ApartmentInstallationPanel — édition', () => {
  beforeEach(() => {
    mockGetInstallation.mockResolvedValue({ hot_water: 'Électrique', heating: 'Gaz' })
    mockUpdate.mockResolvedValue(undefined)
  })

  it('ouvre le formulaire d\'édition au clic sur Modifier', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('pré-remplit les champs avec les valeurs actuelles', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(screen.getByDisplayValue('Électrique')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Gaz')).toBeInTheDocument()
  })

  it('ferme le formulaire avec Annuler sans sauvegarder', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('appelle updateInstallationAction avec les bons args', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    const hotInput = screen.getByDisplayValue('Électrique')
    await user.clear(hotInput)
    await user.type(hotInput, 'Solaire')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('apt-1', 'Solaire', 'Gaz'),
    )
  })

  it('affiche les valeurs mises à jour après enregistrement', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    const hotInput = screen.getByDisplayValue('Électrique')
    await user.clear(hotInput)
    await user.type(hotInput, 'Solaire')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(screen.getByText('Solaire')).toBeInTheDocument())
  })

  it('ouvre le formulaire vide au clic sur + Ajouter', async () => {
    mockGetInstallation.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Ajouter' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByPlaceholderText('Ex. Électrique, Gaz…')).toBeInTheDocument()
  })
})
