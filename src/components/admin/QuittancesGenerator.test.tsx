import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuittancesGenerator from '@/components/admin/QuittancesGenerator'
import type { ApartmentWithLease } from '@/lib/adminData'

const mockGenerateQuittancesForMonths = vi.fn()
const mockGetRentsForYear = vi.fn()

vi.mock('@/app/admin/payments/quittancesActions', () => ({
  generateQuittancesForMonthsAction: (...args: unknown[]) => mockGenerateQuittancesForMonths(...args),
  getRentsForYearAction: (...args: unknown[]) => mockGetRentsForYear(...args),
}))

const apartments: ApartmentWithLease[] = [
  { lease_id: 'lease-1', apartment_id: 'apt-1', apartment_number: '7', tenant_name: 'Sarah Nguyen', tenant_last_name: 'Nguyen' },
  { lease_id: 'lease-2', apartment_id: 'apt-2', apartment_number: '3', tenant_name: 'Bob Martin', tenant_last_name: 'Martin' },
]

beforeEach(() => {
  mockGenerateQuittancesForMonths.mockReset()
  mockGetRentsForYear.mockReset()
  mockGetRentsForYear.mockResolvedValue([])
})

describe('QuittancesGenerator — affichage', () => {
  it('affiche les sélecteurs appartement et année', () => {
    render(<QuittancesGenerator apartments={apartments} />)
    expect(screen.getByText('Apt 7 — Sarah Nguyen')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it("affiche un message quand aucun loyer n'est enregistré", async () => {
    render(<QuittancesGenerator apartments={apartments} />)
    expect(await screen.findByText(/Aucun loyer enregistré pour/)).toBeInTheDocument()
  })

  it('affiche "Sélectionner au moins un mois" tant qu\'aucun mois n\'est choisi', () => {
    render(<QuittancesGenerator apartments={apartments} />)
    expect(screen.getByRole('button', { name: 'Sélectionner au moins un mois' })).toBeDisabled()
  })
})

describe('QuittancesGenerator — sélection des mois', () => {
  const rents = [
    { month: 1, amount_expected: 500, amount_received: null, is_prorata: false },
    { month: 2, amount_expected: 500, amount_received: 500, is_prorata: false },
  ]

  it('affiche les mois avec loyer et permet de les sélectionner', async () => {
    const user = userEvent.setup()
    mockGetRentsForYear.mockResolvedValue(rents)
    render(<QuittancesGenerator apartments={apartments} />)

    expect(await screen.findByText('Janvier')).toBeInTheDocument()
    await user.click(screen.getByText('Janvier'))

    expect(screen.getByRole('button', { name: /Générer 1 quittance/ })).toBeEnabled()
  })

  it('sélectionne tous les mois via "Tout sélectionner"', async () => {
    const user = userEvent.setup()
    mockGetRentsForYear.mockResolvedValue(rents)
    render(<QuittancesGenerator apartments={apartments} />)

    await screen.findByText('Janvier')
    await user.click(screen.getByRole('button', { name: 'Tout sélectionner' }))

    expect(screen.getByRole('button', { name: /Générer 2 quittances/ })).toBeEnabled()
  })
})

describe('QuittancesGenerator — génération', () => {
  const rents = [{ month: 1, amount_expected: 500, amount_received: null, is_prorata: false }]

  it('appelle generateQuittancesForMonthsAction avec les mois sélectionnés', async () => {
    const user = userEvent.setup()
    mockGetRentsForYear.mockResolvedValue(rents)
    mockGenerateQuittancesForMonths.mockResolvedValue([{ month: 1, ok: true, filename: 'q.pdf' }])
    render(<QuittancesGenerator apartments={apartments} />)

    await screen.findByText('Janvier')
    await user.click(screen.getByText('Janvier'))
    await user.click(screen.getByRole('button', { name: /Générer 1 quittance/ }))

    await waitFor(() => {
      expect(mockGenerateQuittancesForMonths).toHaveBeenCalledWith('lease-1', '7', expect.any(Number), [1])
    })
  })

  it('affiche la confirmation globale quand toutes les générations réussissent', async () => {
    const user = userEvent.setup()
    mockGetRentsForYear.mockResolvedValue(rents)
    mockGenerateQuittancesForMonths.mockResolvedValue([{ month: 1, ok: true, filename: 'q.pdf' }])
    render(<QuittancesGenerator apartments={apartments} />)

    await screen.findByText('Janvier')
    await user.click(screen.getByText('Janvier'))
    await user.click(screen.getByRole('button', { name: /Générer 1 quittance/ }))

    expect(await screen.findByText(/brouillon.*Gmail créé/)).toBeInTheDocument()
  })

  it("affiche l'erreur pour un mois dont la génération échoue", async () => {
    const user = userEvent.setup()
    mockGetRentsForYear.mockResolvedValue(rents)
    mockGenerateQuittancesForMonths.mockResolvedValue([{ month: 1, ok: false, error: 'Bail introuvable' }])
    render(<QuittancesGenerator apartments={apartments} />)

    await screen.findByText('Janvier')
    await user.click(screen.getByText('Janvier'))
    await user.click(screen.getByRole('button', { name: /Générer 1 quittance/ }))

    expect(await screen.findByText('Bail introuvable')).toBeInTheDocument()
  })
})
