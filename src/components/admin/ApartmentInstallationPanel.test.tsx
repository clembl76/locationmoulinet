import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApartmentInstallationPanel from '@/components/admin/ApartmentInstallationPanel'

const mockGetInstallation = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateCharges = vi.fn()

vi.mock('@/app/admin/inventory/summaryActions', () => ({
  getInstallationAction: (...args: unknown[]) => mockGetInstallation(...args),
  updateInstallationAction: (...args: unknown[]) => mockUpdate(...args),
  updateChargesTypeAction: (...args: unknown[]) => mockUpdateCharges(...args),
}))

const baseInstallation = {
  hot_water: 'Électrique',
  heating: 'Gaz',
  charges_type: 'forfait',
  meter_readings: null,
}

describe('ApartmentInstallationPanel — affichage', () => {
  beforeEach(() => {
    mockGetInstallation.mockResolvedValue(baseInstallation)
    mockUpdate.mockResolvedValue(undefined)
    mockUpdateCharges.mockResolvedValue(undefined)
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
    mockGetInstallation.mockResolvedValue(baseInstallation)
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
    mockGetInstallation.mockResolvedValue(baseInstallation)
    mockUpdate.mockResolvedValue(undefined)
  })

  it("ouvre le formulaire d'édition au clic sur Modifier", async () => {
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

  it("ouvre le formulaire vide au clic sur + Ajouter", async () => {
    mockGetInstallation.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Ajouter' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByPlaceholderText('Ex. Électrique, Gaz…')).toBeInTheDocument()
  })
})

describe('ApartmentInstallationPanel — toggle charges', () => {
  beforeEach(() => {
    mockGetInstallation.mockResolvedValue(baseInstallation)
    mockUpdateCharges.mockResolvedValue(undefined)
  })

  it('affiche le toggle Charges au forfait / Relevé des compteurs', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Charges au forfait' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Relevé des compteurs' })).toBeInTheDocument()
  })

  it('affiche "Charges au forfait" par défaut quand charges_type=forfait', async () => {
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    // Le texte "Charges au forfait" apparaît dans le bouton toggle ET dans le <p> d'affichage
    await waitFor(() => expect(screen.getAllByText('Charges au forfait').length).toBeGreaterThanOrEqual(2))
    expect(document.querySelector('textarea')).not.toBeInTheDocument()
  })

  it('affiche un textarea quand charges_type=compteurs', async () => {
    mockGetInstallation.mockResolvedValue({
      ...baseInstallation,
      charges_type: 'compteurs',
      meter_readings: 'ELECTRICITE HC Été',
    })
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => {
      const ta = document.querySelector('textarea')
      expect(ta).toBeInTheDocument()
      expect(ta?.value).toContain('ELECTRICITE')
    })
  })

  it('appelle updateChargesTypeAction lors du changement vers compteurs', async () => {
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Relevé des compteurs' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Relevé des compteurs' }))
    await waitFor(() => expect(mockUpdateCharges).toHaveBeenCalledWith('apt-1', 'compteurs', expect.any(String)))
  })

  it('appelle updateChargesTypeAction lors du retour à forfait', async () => {
    mockGetInstallation.mockResolvedValue({
      ...baseInstallation,
      charges_type: 'compteurs',
      meter_readings: 'ELECTRICITE\nHC Été : 100 KWh',
    })
    const user = userEvent.setup()
    render(<ApartmentInstallationPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Charges au forfait' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Charges au forfait' }))
    await waitFor(() => expect(mockUpdateCharges).toHaveBeenCalledWith('apt-1', 'forfait', null))
  })
})
