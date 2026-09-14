import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LettingTable from '@/app/admin/mise-en-location/LettingTable'
import type { LettingApartment, LettingCandidate } from '@/lib/adminData'

const apartments: LettingApartment[] = [
  {
    id: 'a1', number: '7', floor_label: 'Étage 2', rent_including_charges: 550,
    building_short_name: 'Moulin', status: 'available', available_from: null,
    visit_count: '2', candidate_count: '1',
  },
  {
    id: 'a2', number: '3', floor_label: 'Étage 1', rent_including_charges: 480,
    building_short_name: 'Moulin', status: 'coming_soon', available_from: '2026-11-01',
    visit_count: '0', candidate_count: '0',
  },
]

const candidates: LettingCandidate[] = [
  {
    id: 'c1', first_name: 'Sarah', last_name: 'Nguyen', email: 'sarah@mail.fr', phone: '0601020304',
    application_id: 'app-1', status: 'pending', desired_signing_date: '2026-11-01',
    created_at: '2026-09-01', apartment_number: '7', floor_label: 'Étage 2', has_guarantor: true,
  },
]

describe('LettingTable — affichage', () => {
  it('affiche un message quand aucun appartement n\'est mis en location', () => {
    render(<LettingTable apartments={[]} candidates={[]} />)
    expect(screen.getByText('Aucun appartement disponible.')).toBeInTheDocument()
  })

  it('liste les appartements avec leur statut', () => {
    render(<LettingTable apartments={apartments} candidates={candidates} />)
    expect(screen.getByText(/Apt n°7/)).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Prochainement')).toBeInTheDocument()
  })
})

describe('LettingTable — candidatures expandables', () => {
  it('ne montre pas les candidatures avant le clic', () => {
    render(<LettingTable apartments={apartments} candidates={candidates} />)
    expect(screen.queryByText('sarah@mail.fr')).not.toBeInTheDocument()
  })

  it('affiche les candidatures au clic sur une ligne avec candidats', async () => {
    const user = userEvent.setup()
    render(<LettingTable apartments={apartments} candidates={candidates} />)

    await user.click(screen.getByText(/Apt n°7/))

    expect(screen.getByText('sarah@mail.fr')).toBeInTheDocument()
    expect(screen.getByText('Sarah NGUYEN')).toBeInTheDocument()
  })

  it('referme les candidatures au second clic', async () => {
    const user = userEvent.setup()
    render(<LettingTable apartments={apartments} candidates={candidates} />)

    await user.click(screen.getByText(/Apt n°7/))
    await user.click(screen.getByText(/Apt n°7/))

    expect(screen.queryByText('sarah@mail.fr')).not.toBeInTheDocument()
  })

  it('ne réagit pas au clic sur une ligne sans candidature', async () => {
    const user = userEvent.setup()
    render(<LettingTable apartments={apartments} candidates={candidates} />)

    await user.click(screen.getByText(/Apt n°3/))

    expect(screen.queryByText('sarah@mail.fr')).not.toBeInTheDocument()
  })
})
