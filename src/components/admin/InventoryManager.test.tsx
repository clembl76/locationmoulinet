import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryManager from '@/components/admin/InventoryManager'
import type { ApartmentForInventory } from '@/lib/adminData'

// ─── Mocks modules ────────────────────────────────────────────────────────────

const mockGetInventory = vi.fn()
const mockGetAllItems = vi.fn()
const mockFillDefault = vi.fn()

vi.mock('@/app/admin/inventory/actions', () => ({
  getInventoryForApartmentAction: (...args: unknown[]) => mockGetInventory(...args),
  getAllItemsAction: (...args: unknown[]) => mockGetAllItems(...args),
  addInventoryItemAction: vi.fn(),
  updateInventoryItemAction: vi.fn(),
  deleteInventoryItemAction: vi.fn(),
  createCatalogItemAction: vi.fn(),
}))

vi.mock('@/app/admin/inventory/defaultActions', () => ({
  fillDefaultAction: (...args: unknown[]) => mockFillDefault(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/admin/SurfacesEdl', () => ({
  default: () => <div data-testid="surfaces-edl" />,
}))

vi.mock('@/components/admin/ApartmentSummaryPanel', () => ({
  default: () => <div data-testid="summary-panel" />,
}))

vi.mock('@/components/admin/ApartmentKeysPanel', () => ({
  default: () => <div data-testid="keys-panel" />,
}))

vi.mock('@/components/admin/ApartmentInstallationPanel', () => ({
  default: () => <div data-testid="installation-panel" />,
}))

// ─── Données de test ───────────────────────────────────────────────────────────

const apartments: ApartmentForInventory[] = [
  {
    apartment_id: 'apt-1',
    apartment_number: '7',
    tenant_name: 'Dupont Marie',
    lease_id: 'lease-1',
  },
]

const vacantApartments: ApartmentForInventory[] = [
  {
    apartment_id: 'apt-2',
    apartment_number: '1',
    tenant_name: null,
    lease_id: null,
  },
]

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryManager — sélecteur appartement', () => {
  beforeEach(() => {
    mockGetAllItems.mockResolvedValue([])
    mockGetInventory.mockResolvedValue([])
  })

  it('affiche le sélecteur d\'appartement', () => {
    render(<InventoryManager apartments={apartments} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText(/Sélectionner un appartement/)).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton "Remplir par défaut" sans sélection', () => {
    render(<InventoryManager apartments={apartments} />)
    expect(screen.queryByRole('button', { name: /Remplir par défaut/ })).not.toBeInTheDocument()
  })

  it('affiche le bouton "Remplir par défaut" après sélection d\'un appartement', async () => {
    const user = userEvent.setup()
    render(<InventoryManager apartments={apartments} />)
    await user.selectOptions(screen.getByRole('combobox'), 'apt-1')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remplir par défaut/ })).toBeInTheDocument()
    )
  })

  it('affiche aussi le bouton "Figer l\'EDL" après sélection', async () => {
    const user = userEvent.setup()
    render(<InventoryManager apartments={apartments} />)
    await user.selectOptions(screen.getByRole('combobox'), 'apt-1')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Figer l'EDL/ })).toBeInTheDocument()
    )
  })
})

describe('InventoryManager — bouton Remplir par défaut', () => {
  beforeEach(() => {
    mockGetAllItems.mockResolvedValue([])
    mockGetInventory.mockResolvedValue([])
    mockFillDefault.mockResolvedValue({ ok: true })
  })

  async function selectApartment() {
    const user = userEvent.setup()
    render(<InventoryManager apartments={apartments} />)
    await user.selectOptions(screen.getByRole('combobox'), 'apt-1')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remplir par défaut/ })).toBeInTheDocument()
    )
    return user
  }

  it('appelle fillDefaultAction avec l\'id de l\'appartement', async () => {
    const user = await selectApartment()
    await user.click(screen.getByRole('button', { name: /Remplir par défaut/ }))
    await waitFor(() => expect(mockFillDefault).toHaveBeenCalledWith('apt-1'))
  })

  it('recharge l\'inventaire après succès', async () => {
    mockGetInventory.mockResolvedValue([])
    const user = await selectApartment()
    const initialCallCount = mockGetInventory.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Remplir par défaut/ }))
    await waitFor(() =>
      expect(mockGetInventory.mock.calls.length).toBeGreaterThan(initialCallCount)
    )
  })

  it('affiche une erreur si fillDefaultAction échoue', async () => {
    mockFillDefault.mockResolvedValue({ ok: false, error: 'FK violation' })
    const user = await selectApartment()
    await user.click(screen.getByRole('button', { name: /Remplir par défaut/ }))
    await waitFor(() => expect(screen.getByText('FK violation')).toBeInTheDocument())
  })

  it('désactive le bouton pendant le remplissage', async () => {
    let resolve: (v: { ok: boolean }) => void
    mockFillDefault.mockReturnValue(new Promise(r => { resolve = r }))
    const user = await selectApartment()
    await user.click(screen.getByRole('button', { name: /Remplir par défaut/ }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remplissage/ })).toBeDisabled()
    )
    resolve!({ ok: true })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Remplissage/ })).not.toBeInTheDocument()
    )
  })

  it('efface l\'erreur précédente quand un nouvel appartement est sélectionné', async () => {
    mockFillDefault.mockResolvedValue({ ok: false, error: 'Erreur' })
    const user = await selectApartment()
    await user.click(screen.getByRole('button', { name: /Remplir par défaut/ }))
    await waitFor(() => expect(screen.getByText('Erreur')).toBeInTheDocument())
    // Resélectionner le même appartement remet fillError à vide
    await user.selectOptions(screen.getByRole('combobox'), '')
    await waitFor(() => expect(screen.queryByText('Erreur')).not.toBeInTheDocument())
  })
})

describe('InventoryManager — appartement vacant (sans bail actif)', () => {
  beforeEach(() => {
    mockGetAllItems.mockResolvedValue([])
    mockGetInventory.mockResolvedValue([])
  })

  it('affiche "Vacant" dans le label d\'un appartement sans locataire', () => {
    render(<InventoryManager apartments={vacantApartments} />)
    expect(screen.getByText(/Apt 1 — Vacant/)).toBeInTheDocument()
  })

  it('n\'affiche pas ApartmentSummaryPanel pour un appartement vacant', async () => {
    const user = userEvent.setup()
    render(<InventoryManager apartments={vacantApartments} />)
    await user.selectOptions(screen.getByRole('combobox'), 'apt-2')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Figer l'EDL/ })).toBeInTheDocument()
    )
    expect(screen.queryByTestId('summary-panel')).not.toBeInTheDocument()
  })

  it('affiche les boutons d\'action pour un appartement vacant', async () => {
    const user = userEvent.setup()
    render(<InventoryManager apartments={vacantApartments} />)
    await user.selectOptions(screen.getByRole('combobox'), 'apt-2')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Figer l'EDL/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Remplir par défaut/ })).toBeInTheDocument()
    })
  })
})
