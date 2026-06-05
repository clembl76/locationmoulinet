import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SurfacesEdl from '@/components/admin/SurfacesEdl'

const mockGetSurfaces = vi.fn()
const mockAddSurface = vi.fn()
const mockUpdateSurface = vi.fn()
const mockDeleteSurface = vi.fn()

vi.mock('@/app/admin/inventory/surfacesActions', () => ({
  getSurfacesForApartmentAction: (...args: unknown[]) => mockGetSurfaces(...args),
  addSurfaceAction: (...args: unknown[]) => mockAddSurface(...args),
  updateSurfaceAction: (...args: unknown[]) => mockUpdateSurface(...args),
  deleteSurfaceAction: (...args: unknown[]) => mockDeleteSurface(...args),
}))

const baseSurface = {
  id: 'surf-1',
  surface: 'Mur',
  room: 'Chambre',
  material: 'Peinture',
  condition: 'Bon état',
  notes: 'RAS',
}

describe('SurfacesEdl — chargement', () => {
  beforeEach(() => {
    mockGetSurfaces.mockResolvedValue([baseSurface])
  })

  it('affiche le titre de la section', async () => {
    render(<SurfacesEdl apartmentId="apt-1" />)
    expect(screen.getByText(/État des lieux — Surfaces/)).toBeInTheDocument()
  })

  it('affiche les surfaces chargées', async () => {
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
  })

  it('affiche la colonne Pièce dans le header', async () => {
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    expect(screen.getByText('Pièce')).toBeInTheDocument()
  })

  it("affiche le message vide si aucune surface", async () => {
    mockGetSurfaces.mockResolvedValue([])
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() =>
      expect(screen.getByText(/Aucune surface enregistrée/)).toBeInTheDocument()
    )
  })
})

describe('SurfacesEdl — repliage', () => {
  beforeEach(() => {
    mockGetSurfaces.mockResolvedValue([baseSurface])
  })

  it('est ouvert par défaut', async () => {
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('masque le contenu au clic sur le titre', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    await user.click(screen.getByText('▼'))
    expect(screen.queryByText('Mur')).not.toBeInTheDocument()
    expect(screen.getByText('▶')).toBeInTheDocument()
  })

  it('masque le bouton + Ajouter quand replié', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    await user.click(screen.getByText('▼'))
    expect(screen.queryByRole('button', { name: '+ Ajouter' })).not.toBeInTheDocument()
  })

  it('réouvre au second clic', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    await user.click(screen.getByText('▼'))
    await user.click(screen.getByText('▶'))
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
  })
})

describe('SurfacesEdl — sélecteur de pièce sur une ligne existante', () => {
  beforeEach(() => {
    mockGetSurfaces.mockResolvedValue([baseSurface])
    mockUpdateSurface.mockResolvedValue({ ok: true })
  })

  it('affiche la valeur de room dans le select Pièce', async () => {
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    const selects = screen.getAllByRole('combobox')
    // Premier select de la ligne = Pièce
    expect((selects[0] as HTMLSelectElement).value).toBe('Chambre')
  })

  it('marque dirty et affiche Enregistrer quand la pièce change', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'Cuisine')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('appelle updateSurfaceAction avec room lors de la sauvegarde', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'Cuisine')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(mockUpdateSurface).toHaveBeenCalledWith(
        'surf-1',
        'Cuisine',
        'Peinture',
        'Bon état',
        'RAS',
      )
    )
  })
})

describe('SurfacesEdl — formulaire d\'ajout', () => {
  beforeEach(() => {
    mockGetSurfaces.mockResolvedValue([])
    mockAddSurface.mockResolvedValue({ ok: true })
  })

  it('affiche le formulaire au clic sur + Ajouter', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    // Le bouton Annuler n'est présent que dans le formulaire
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByText('Surface / Équipement *')).toBeInTheDocument()
    // Le label Pièce est présent (dans header + form)
    expect(screen.getAllByText('Pièce').length).toBeGreaterThanOrEqual(2)
  })

  it('appelle addSurfaceAction avec room sélectionnée', async () => {
    mockGetSurfaces.mockResolvedValueOnce([]).mockResolvedValue([])
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    // Ouvrir le formulaire via le bouton du header
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    // selects dans le formulaire : [0]=Surface, [1]=Pièce, [2]=Matière, [3]=État
    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[1], 'Cuisine')
    // Soumettre via le bouton du formulaire (le dernier des deux "+ Ajouter")
    const addButtons = screen.getAllByRole('button', { name: '+ Ajouter' })
    await user.click(addButtons[addButtons.length - 1])
    await waitFor(() =>
      expect(mockAddSurface).toHaveBeenCalledWith(
        'apt-1',
        'Crédence',
        'Cuisine',
        null,
        'Bon état',
        null,
      )
    )
  })

  it('affiche une erreur si addSurfaceAction échoue', async () => {
    mockAddSurface.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    const addButtons = screen.getAllByRole('button', { name: '+ Ajouter' })
    await user.click(addButtons[addButtons.length - 1])
    await waitFor(() =>
      expect(screen.getByText('Erreur serveur')).toBeInTheDocument()
    )
  })
})

describe('SurfacesEdl — créer un nouvel item dans la bibliothèque', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSurfaces.mockResolvedValue([])
    mockAddSurface.mockResolvedValue({ ok: true })
  })

  it('affiche le bouton "+ Créer un nouvel item dans la bibliothèque" dans le formulaire', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ })).toBeInTheDocument()
  })

  it('bascule sur un champ texte libre au clic sur "Créer un nouvel item"', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ }))
    expect(screen.getByTestId('custom-surface-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annuler la création/ })).toBeInTheDocument()
  })

  it('cache le champ texte et rétablit le select au clic sur "Annuler la création"', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ }))
    await user.click(screen.getByRole('button', { name: /Annuler la création/ }))
    expect(screen.queryByTestId('custom-surface-input')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ })).toBeInTheDocument()
  })

  it('appelle addSurfaceAction avec le nom libre saisi', async () => {
    mockGetSurfaces.mockResolvedValueOnce([]).mockResolvedValue([])
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ }))
    await user.type(screen.getByTestId('custom-surface-input'), 'Verrière')
    const addButtons = screen.getAllByRole('button', { name: '+ Ajouter' })
    await user.click(addButtons[addButtons.length - 1])
    await waitFor(() =>
      expect(mockAddSurface).toHaveBeenCalledWith('apt-1', 'Verrière', null, null, 'Bon état', null)
    )
  })

  it('affiche une erreur si le nom libre est vide à la soumission', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ }))
    // Ne pas saisir de nom
    const addButtons = screen.getAllByRole('button', { name: '+ Ajouter' })
    await user.click(addButtons[addButtons.length - 1])
    await waitFor(() =>
      expect(screen.getByText('Le nom de la surface est requis.')).toBeInTheDocument()
    )
    expect(mockAddSurface).not.toHaveBeenCalled()
  })

  it('réinitialise le formulaire (mode libre) après ajout réussi', async () => {
    mockGetSurfaces.mockResolvedValueOnce([]).mockResolvedValue([])
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText(/Aucune surface/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: /Créer un nouvel item dans la bibliothèque/ }))
    await user.type(screen.getByTestId('custom-surface-input'), 'Verrière')
    const addButtons = screen.getAllByRole('button', { name: '+ Ajouter' })
    await user.click(addButtons[addButtons.length - 1])
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument())
    // Le formulaire est fermé : plus de champ texte
    expect(screen.queryByTestId('custom-surface-input')).not.toBeInTheDocument()
  })
})

describe('SurfacesEdl — suppression', () => {
  beforeEach(() => {
    mockGetSurfaces.mockResolvedValue([baseSurface])
    mockDeleteSurface.mockResolvedValue({ ok: true })
  })

  it('retire la surface de la liste après suppression', async () => {
    const user = userEvent.setup()
    render(<SurfacesEdl apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Mur')).toBeInTheDocument())
    await user.click(screen.getByTitle('Supprimer'))
    await waitFor(() => expect(screen.queryByText('Mur')).not.toBeInTheDocument())
    expect(mockDeleteSurface).toHaveBeenCalledWith('surf-1')
  })
})
