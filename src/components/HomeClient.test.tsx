import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Apartment } from '@/components/ApartmentCard'

vi.mock('@/context/LanguageContext', () => ({
  useLang: vi.fn(() => ({ lang: 'fr' })),
}))

const { default: HomeClient } = await import('@/components/HomeClient')

const apartments: Apartment[] = [
  {
    id: 'apt-1',
    number: '30',
    type: 'STUDIO',
    surface_area: 22.7,
    floor: 3,
    floor_label: null,
    rent_including_charges: 550,
    buildings: { address: '9 rue du Moulinet', short_name: 'Moulinet' },
    leases: [],
  },
  {
    id: 'apt-2',
    number: '84',
    type: 'T4',
    surface_area: 87,
    floor: 4,
    floor_label: null,
    rent_including_charges: 820,
    buildings: { address: '9 rue du Moulinet', short_name: 'Moulinet' },
    leases: [{ move_out_inspection_date: null }],
  },
]

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ photos: [] }) } as Response)
  ))
})

describe('HomeClient — rendu initial', () => {
  it('affiche le titre du hero', async () => {
    render(<HomeClient apartments={apartments} />)
    expect(screen.getByText('Studios meublés à louer')).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it('affiche les deux appartements, triés disponible avant loué', async () => {
    render(<HomeClient apartments={apartments} />)
    const cards = screen.getAllByText(/Appartement (30|84)/i)
    expect(cards[0]).toHaveTextContent('30')
    expect(cards[1]).toHaveTextContent('84')
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})

describe('HomeClient — filtres', () => {
  it('masque les appartements loués quand on désactive le statut "Loué"', async () => {
    const user = userEvent.setup()
    render(<HomeClient apartments={apartments} />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Loué' }))
    expect(screen.queryByText(/Appartement 84/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Appartement 30/i)).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('affiche un message quand aucun appartement ne correspond aux filtres', async () => {
    const user = userEvent.setup()
    render(<HomeClient apartments={apartments} />)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Disponible' }))
    await user.click(screen.getByRole('button', { name: 'Loué' }))
    expect(screen.getByText(/aucun appartement ne correspond/i)).toBeInTheDocument()
  })

  it('la réglette de surface max. affiche "Tous" par défaut', async () => {
    render(<HomeClient apartments={apartments} />)
    expect(screen.getAllByText('Tous').length).toBeGreaterThan(0)
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
