import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApartmentKeysPanel from '@/components/admin/ApartmentKeysPanel'

const mockGetKeys = vi.fn()
const mockGetKeyTypes = vi.fn()
const mockAdd = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/app/admin/inventory/keysActions', () => ({
  getApartmentKeysAction: (...args: unknown[]) => mockGetKeys(...args),
  getKeyTypesAction: (...args: unknown[]) => mockGetKeyTypes(...args),
  addApartmentKeyAction: (...args: unknown[]) => mockAdd(...args),
  updateApartmentKeyQuantityAction: (...args: unknown[]) => mockUpdate(...args),
  deleteApartmentKeyAction: (...args: unknown[]) => mockDelete(...args),
}))

const baseKeys = [
  { id: 'k1', key_type: 'Vigik Immeuble', quantity: 2, quantity_exit: null, order_index: 0 },
]
const baseKeyTypes = ['Vigik Immeuble', 'Porte palière appartement', 'Boite aux lettres', 'Cave']

describe('ApartmentKeysPanel — affichage', () => {
  beforeEach(() => {
    mockGetKeys.mockResolvedValue(baseKeys)
    mockGetKeyTypes.mockResolvedValue(baseKeyTypes)
    mockAdd.mockResolvedValue({
      ok: true,
      key: { id: 'k2', key_type: 'Cave', quantity: 1, quantity_exit: null, order_index: 1 },
    })
    mockUpdate.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(undefined)
  })

  it('affiche les clés existantes avec leur quantité éditable', async () => {
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('affiche "Aucune clé" si liste vide', async () => {
    mockGetKeys.mockResolvedValue([])
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Aucune clé')).toBeInTheDocument())
  })

  it('affiche le titre Clés', async () => {
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Clés/ })).toBeInTheDocument()
  })

  it('appelle getApartmentKeysAction et getKeyTypesAction avec le bon id', async () => {
    render(<ApartmentKeysPanel apartmentId="apt-42" />)
    await waitFor(() => expect(mockGetKeys).toHaveBeenCalledWith('apt-42'))
    expect(mockGetKeyTypes).toHaveBeenCalled()
  })
})

describe('ApartmentKeysPanel — modification quantité', () => {
  beforeEach(() => {
    mockGetKeys.mockResolvedValue(baseKeys)
    mockGetKeyTypes.mockResolvedValue(baseKeyTypes)
    mockUpdate.mockResolvedValue(undefined)
  })

  it('appelle updateApartmentKeyQuantityAction au blur', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument())
    const input = screen.getByDisplayValue('2')
    await user.clear(input)
    await user.type(input, '5')
    await user.tab()
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('k1', 5))
  })

  it('applique une valeur minimale de 1 si 0 saisi', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByDisplayValue('2')).toBeInTheDocument())
    const input = screen.getByDisplayValue('2')
    await user.clear(input)
    await user.type(input, '0')
    await user.tab()
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('k1', 1))
  })
})

describe('ApartmentKeysPanel — collapse', () => {
  beforeEach(() => {
    mockGetKeys.mockResolvedValue(baseKeys)
    mockGetKeyTypes.mockResolvedValue(baseKeyTypes)
  })

  it('masque les clés après un clic sur le toggle', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Clés/ }))
    expect(screen.queryByText('Vigik Immeuble')).not.toBeInTheDocument()
  })

  it('masque le bouton + Ajouter quand replié', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Clés/ }))
    expect(screen.queryByRole('button', { name: '+ Ajouter' })).not.toBeInTheDocument()
  })
})

describe('ApartmentKeysPanel — formulaire ajout', () => {
  beforeEach(() => {
    mockGetKeys.mockResolvedValue(baseKeys)
    mockGetKeyTypes.mockResolvedValue(baseKeyTypes)
    mockAdd.mockResolvedValue({
      ok: true,
      key: { id: 'k2', key_type: 'Cave', quantity: 1, quantity_exit: null, order_index: 1 },
    })
  })

  it('ouvre le formulaire avec le bouton + Ajouter', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('ferme le formulaire avec Annuler', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
  })

  it('appelle addApartmentKeyAction avec les bons args', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    const submitBtn = screen.getAllByRole('button', { name: '+ Ajouter' }).at(-1)!
    await user.click(submitBtn)
    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith('apt-1', 'Vigik Immeuble', 1),
    )
  })

  it('ajoute la nouvelle clé à la liste après ajout réussi', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '+ Ajouter' }))
    await user.click(screen.getAllByRole('button', { name: '+ Ajouter' }).at(-1)!)
    await waitFor(() => expect(screen.getByText('Cave')).toBeInTheDocument())
  })
})

describe('ApartmentKeysPanel — suppression', () => {
  beforeEach(() => {
    mockGetKeys.mockResolvedValue(baseKeys)
    mockGetKeyTypes.mockResolvedValue(baseKeyTypes)
    mockDelete.mockResolvedValue(undefined)
  })

  it('supprime une clé optimistiquement avec ✕', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByTitle('Supprimer'))
    expect(screen.queryByText('Vigik Immeuble')).not.toBeInTheDocument()
  })

  it('affiche "Aucune clé" après suppression de la dernière clé', async () => {
    const user = userEvent.setup()
    render(<ApartmentKeysPanel apartmentId="apt-1" />)
    await waitFor(() => expect(screen.getByText('Vigik Immeuble')).toBeInTheDocument())
    await user.click(screen.getByTitle('Supprimer'))
    expect(screen.getByText('Aucune clé')).toBeInTheDocument()
  })
})
