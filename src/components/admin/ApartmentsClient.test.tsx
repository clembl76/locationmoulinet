import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApartmentsClient from '@/components/admin/ApartmentsClient'
import type { AdminApartment } from '@/lib/adminData'

const mockRouterPush = vi.fn()
const mockRouterRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
}))

function makeApt(overrides: Partial<AdminApartment>): AdminApartment {
  return {
    id: overrides.number ?? '1',
    number: '1',
    type: 'Studio',
    surface_area: 20,
    floor_label: 'Étage 1',
    rent_including_charges: 500,
    building_address: '1 rue du Moulin',
    building_short_name: 'Moulin',
    tenant_last_name: null,
    tenant_first_name: null,
    tenant_phone: null,
    tenant_email: null,
    lease_id: null,
    move_in_date: null,
    move_out_date: null,
    has_rent_this_month: false,
    paid_this_month: false,
    ...overrides,
  }
}

const apartments: AdminApartment[] = [
  makeApt({ id: 'a3', number: '3', rent_including_charges: 550, tenant_last_name: 'Nguyen', tenant_first_name: 'Sarah', lease_id: 'lease-3', has_rent_this_month: true, paid_this_month: true }),
  makeApt({ id: 'a1', number: '1', rent_including_charges: 480, tenant_last_name: 'Dupont', tenant_first_name: 'Alice', lease_id: 'lease-1', has_rent_this_month: true, paid_this_month: false }),
  makeApt({ id: 'a2', number: '2' }),
  makeApt({ id: 'a4', number: '4', rent_including_charges: 600, tenant_last_name: 'Martin', tenant_first_name: 'Bob', lease_id: 'lease-4', move_out_date: '2026-10-31' }),
]

beforeEach(() => {
  mockRouterPush.mockReset()
  mockRouterRefresh.mockReset()
})

describe('ApartmentsClient — affichage', () => {
  it('affiche tous les appartements par défaut', () => {
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)
    expect(screen.getByText('4 / 4')).toBeInTheDocument()
  })

  it('affiche "Vacant" pour un appartement sans locataire', () => {
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)
    expect(screen.getByText('Vacant')).toBeInTheDocument()
  })

  it('affiche un message quand aucun appartement ne correspond aux filtres', () => {
    render(<ApartmentsClient apartments={[]} initialStatus={null} mois="septembre" />)
    expect(screen.getByText('Aucun appartement ne correspond aux filtres.')).toBeInTheDocument()
  })
})

describe('ApartmentsClient — filtre initial via initialStatus', () => {
  it('ne filtre que les disponibles quand initialStatus="available"', () => {
    render(<ApartmentsClient apartments={apartments} initialStatus="available" mois="septembre" />)
    expect(screen.getByText('1 / 4')).toBeInTheDocument()
    expect(screen.getByText('Vacant')).toBeInTheDocument()
  })

  it('ne filtre que les loués quand initialStatus="loue"', () => {
    render(<ApartmentsClient apartments={apartments} initialStatus="loue" mois="septembre" />)
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
  })
})

describe('ApartmentsClient — filtres interactifs', () => {
  it('retire les appartements loués quand on désactive le filtre "Loué"', async () => {
    const user = userEvent.setup()
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)

    await user.click(screen.getByRole('button', { name: 'Loué' }))

    expect(screen.getByText('2 / 4')).toBeInTheDocument()
  })

  it('retire les loyers non encaissés quand on désactive "Non encaissé"', async () => {
    const user = userEvent.setup()
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)

    await user.click(screen.getByRole('button', { name: 'Non encaissé' }))

    expect(screen.getByText('3 / 4')).toBeInTheDocument()
    expect(screen.queryByText('Dupont')).not.toBeInTheDocument()
  })
})

describe('ApartmentsClient — tri', () => {
  it('trie par numéro croissant par défaut', () => {
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[3]).toHaveTextContent('4')
  })

  it('inverse l\'ordre au second clic sur la même colonne', async () => {
    const user = userEvent.setup()
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)

    await user.click(screen.getByText('Appt'))
    await user.click(screen.getByText('Appt'))

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('4')
  })

  it('trie par loyer CC/mois', async () => {
    const user = userEvent.setup()
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)

    await user.click(screen.getByText('CC/mois'))

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('1')
  })
})

describe('ApartmentsClient — navigation', () => {
  it('navigue vers la fiche appartement au clic sur une ligne', async () => {
    const user = userEvent.setup()
    render(<ApartmentsClient apartments={apartments} initialStatus={null} mois="septembre" />)

    await user.click(screen.getByText('Sarah Nguyen'))

    expect(mockRouterPush).toHaveBeenCalledWith('/admin/apartments/3')
  })
})
