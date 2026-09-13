import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ApartmentDetailData } from '@/components/ApartmentDetail'

vi.mock('@/context/LanguageContext', () => ({
  useLang: vi.fn(() => ({ lang: 'fr' })),
}))

const { default: ApartmentDetail } = await import('@/components/ApartmentDetail')

const apartment: ApartmentDetailData = {
  id: 'apt-30',
  number: '30',
  type: 'STUDIO',
  surface_area: 22.7,
  floor: 3,
  floor_label: null,
  orientation: 'Rue et Cour',
  description: 'Une pièce de vie principale avec coin repas/salon, coin nuit et coin cuisine équipée, une salle de bains avec wc.',
  rent_excluding_charges: 450,
  charges: 100,
  rent_including_charges: 550,
  buildings: { address: '9 rue du Moulinet, 76000 Rouen', short_name: 'Moulinet', charges_model: 'forfait_total' },
  leases: [],
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ photos: [], videos: [] }) } as Response)
  ))
})

describe('ApartmentDetail — rendu', () => {
  it('affiche le titre, le statut et les specs', async () => {
    render(<ApartmentDetail apartment={apartment} />)
    expect(screen.getByText('Studio')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText(/22\.7 m²/)).toBeInTheDocument()
    expect(screen.getByText(/9 rue du Moulinet/)).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it('affiche la description réelle de l\'appartement', async () => {
    render(<ApartmentDetail apartment={apartment} />)
    expect(screen.getByText(/coin repas\/salon/)).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it('affiche le loyer et le détail hors charges/charges', async () => {
    render(<ApartmentDetail apartment={apartment} />)
    expect(screen.getByText('550 €')).toBeInTheDocument()
    expect(screen.getByText(/450 €/)).toBeInTheDocument()
    expect(screen.getByText(/100 €/)).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it('révèle l\'email au clic sur "Nous contacter"', async () => {
    const user = userEvent.setup()
    render(<ApartmentDetail apartment={apartment} />)
    await user.click(screen.getByRole('button', { name: /nous contacter/i }))
    expect(screen.getByText('location.moulinet@gmail.com')).toBeInTheDocument()
  })

  it('affiche les conditions de location', async () => {
    render(<ApartmentDetail apartment={apartment} />)
    expect(screen.getByText(/Être étudiant/)).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})

describe('ApartmentDetail — accordéon Quartier & commodités', () => {
  it('est ouvert par défaut et affiche le contenu du quartier', async () => {
    render(<ApartmentDetail apartment={apartment} />)
    expect(screen.getByText(/Quartier calme/)).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })

  it('se referme au clic sur le titre', async () => {
    const user = userEvent.setup()
    render(<ApartmentDetail apartment={apartment} />)
    await user.click(screen.getByRole('button', { name: /quartier & commodités/i }))
    expect(screen.queryByText(/Quartier calme/)).not.toBeInTheDocument()
  })
})

describe('ApartmentDetail — statut loué', () => {
  it('affiche "Loué" quand un bail actif existe', async () => {
    render(<ApartmentDetail apartment={{ ...apartment, leases: [{ move_out_inspection_date: null }] }} />)
    expect(screen.getByText('Loué')).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
