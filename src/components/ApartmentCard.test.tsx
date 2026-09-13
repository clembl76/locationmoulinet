import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { Apartment } from '@/components/ApartmentCard'

vi.mock('@/context/LanguageContext', () => ({
  useLang: vi.fn(() => ({ lang: 'fr' })),
}))

const { default: ApartmentCard } = await import('@/components/ApartmentCard')
const { useLang } = await import('@/context/LanguageContext')

const baseApartment: Apartment = {
  id: 'apt-1',
  number: '30',
  type: 'STUDIO',
  surface_area: 22.7,
  floor: 3,
  floor_label: null,
  rent_including_charges: 550,
  buildings: { address: '9 rue du Moulinet, 76000 Rouen', short_name: 'Moulinet' },
  leases: [],
}

beforeEach(() => {
  vi.mocked(useLang).mockReturnValue({ lang: 'fr' })
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ photos: [] }) } as Response)
  ))
})

async function flush() {
  await waitFor(() => expect(fetch).toHaveBeenCalled())
}

describe('ApartmentCard — rendu', () => {
  it('affiche le numéro, le type, la surface, l\'étage et le loyer', async () => {
    render(<ApartmentCard apartment={baseApartment} />)
    expect(screen.getByText(/Appartement 30/i)).toBeInTheDocument()
    expect(screen.getByText(/Studio · 22\.7 m² · Étage 3/)).toBeInTheDocument()
    expect(screen.getByText('550 €')).toBeInTheDocument()
    await flush()
  })

  it('pointe vers la fiche appartement', async () => {
    render(<ApartmentCard apartment={baseApartment} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/apartments/30')
    await flush()
  })

  it('affiche le badge "Disponible" quand il n\'y a aucun bail', async () => {
    render(<ApartmentCard apartment={baseApartment} />)
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    await flush()
  })

  it('affiche le badge "Loué" quand un bail actif existe', async () => {
    render(<ApartmentCard apartment={{ ...baseApartment, leases: [{ move_out_inspection_date: null }] }} />)
    expect(screen.getByText('Loué')).toBeInTheDocument()
    await flush()
  })

  it('utilise le libellé "RDC" pour l\'étage 0 sans floor_label', async () => {
    render(<ApartmentCard apartment={{ ...baseApartment, floor: 0 }} />)
    expect(screen.getByText(/RDC/)).toBeInTheDocument()
    await flush()
  })

  it('affiche les textes en anglais quand lang="en"', async () => {
    vi.mocked(useLang).mockReturnValue({ lang: 'en' })
    render(<ApartmentCard apartment={baseApartment} />)
    expect(screen.getByText(/Apartment 30/i)).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    await flush()
  })
})
