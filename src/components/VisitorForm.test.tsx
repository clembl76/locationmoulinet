import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AvailableApartment, VisitAvailabilityRule } from '@/lib/adminData'

const mockCreateVisitorAction = vi.fn().mockResolvedValue({ ok: true, visitorId: 'v-1' })
const mockGetAvailableSlotsAction = vi.fn().mockResolvedValue(['10:00', '11:00'])

vi.mock('@/app/visiter/actions', () => ({
  createVisitorAction: (...args: unknown[]) => mockCreateVisitorAction(...args),
  getAvailableSlotsAction: (...args: unknown[]) => mockGetAvailableSlotsAction(...args),
}))

const { default: VisitorForm } = await import('@/components/VisitorForm')

const apartments: AvailableApartment[] = [
  {
    id: 'apt-30', number: '30', type: 'STUDIO', surface_area: 22.7, floor_label: '3e étage',
    rent_including_charges: 550, building_address: '9 rue du Moulinet', building_short_name: 'Moulinet',
    status: 'available', available_from: null,
  },
  {
    id: 'apt-24', number: '24', type: 'STUDIO', surface_area: 24, floor_label: '2e étage',
    rent_including_charges: 650, building_address: '9 rue du Moulinet', building_short_name: 'Moulinet',
    status: 'coming_soon', available_from: '2026-10-03',
  },
]

// Toutes les journées ouvertes pour ne pas dépendre du jour d'exécution des tests.
const allDaysOpen: VisitAvailabilityRule[] = [0, 1, 2, 3, 4, 5, 6].map((d, i) => ({
  id: `rule-${i}`, day_of_week: d, start_time: '09:00', end_time: '18:00',
}))

const availabilityData = {
  active: true,
  rules: allDaysOpen,
  exceptions: [],
  slotDurationMinutes: 30,
  contactName: 'Location Moulinet',
  contactPhone: null,
  contactEmail: 'location.moulinet@gmail.com',
  contactWebsite: null,
}

beforeEach(() => {
  mockCreateVisitorAction.mockClear()
  mockGetAvailableSlotsAction.mockClear()
})

describe('VisitorForm — rendu initial', () => {
  it('affiche les appartements disponibles et "prochainement disponibles"', () => {
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    expect(screen.getByText(/Appartement n°30/i)).toBeInTheDocument()
    expect(screen.getByText(/Appartement n°24/i)).toBeInTheDocument()
    expect(screen.getByText(/prochainement disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/disponible à partir du 3 octobre 2026/i)).toBeInTheDocument()
  })

  it('le bouton d\'envoi est désactivé par défaut', () => {
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    expect(screen.getByRole('button', { name: /envoyer ma demande/i })).toBeDisabled()
  })
})

describe('VisitorForm — sélection d\'appartement et créneau', () => {
  it('sélectionne un appartement au clic sur sa case', async () => {
    const user = userEvent.setup()
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()
  })

  it('interdit de sélectionner un appartement d\'un autre immeuble', async () => {
    const user = userEvent.setup()
    const otherBuilding: AvailableApartment = {
      ...apartments[0], id: 'apt-other', number: '99', building_address: '1 rue Renard',
    }
    render(<VisitorForm apartments={[apartments[0], otherBuilding]} availabilityData={availabilityData} />)
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])
    expect(screen.getByText(/même immeuble/i)).toBeInTheDocument()
  })

  it('charge les créneaux disponibles au clic sur une date', async () => {
    const user = userEvent.setup()
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    const today = new Date()
    await user.click(screen.getByRole('button', { name: String(today.getDate()) }))
    await waitFor(() => expect(mockGetAvailableSlotsAction).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: '10:00' })).toBeInTheDocument()
  })
})

describe('VisitorForm — profil', () => {
  it('affiche un avertissement bloquant si la situation n\'est pas étudiant', async () => {
    const user = userEvent.setup()
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    await user.click(screen.getByRole('radio', { name: 'Autre' }))
    expect(screen.getByText(/réservés aux étudiants/i)).toBeInTheDocument()
  })

  it('affiche un avertissement si les revenus sont insuffisants', async () => {
    const user = userEvent.setup()
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0]) // 550 €/mois → seuil 1650 €
    const incomeSlider = screen.getByRole('slider')
    fireEvent.change(incomeSlider, { target: { value: '500' } })
    expect(await screen.findByText(/nous exigeons des revenus/i)).toBeInTheDocument()
  })
})

describe('VisitorForm — validation email/téléphone', () => {
  it('affiche une erreur pour un email invalide au blur', async () => {
    const user = userEvent.setup()
    render(<VisitorForm apartments={apartments} availabilityData={availabilityData} />)
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement
    await user.type(emailInput, 'pas-un-email')
    await user.tab()
    expect(screen.getByText(/adresse email invalide/i)).toBeInTheDocument()
  })
})

describe('VisitorForm — état vide', () => {
  it('affiche un message quand aucun appartement n\'est disponible', () => {
    render(<VisitorForm apartments={[]} availabilityData={availabilityData} />)
    expect(screen.getByText(/aucun appartement disponible/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoyer ma demande/i })).toBeDisabled()
  })
})
