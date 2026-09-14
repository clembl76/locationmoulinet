import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MoisLoyersClient from '@/components/admin/MoisLoyersClient'
import type { AdminApartment } from '@/lib/adminData'

function makeApt(overrides: Partial<AdminApartment>): AdminApartment {
  return {
    id: 'apt-1',
    number: '7',
    type: 'STUDIO',
    surface_area: 20,
    floor_label: null,
    rent_including_charges: 500,
    building_address: '9 rue du Moulinet',
    building_short_name: 'Moulinet',
    tenant_last_name: 'Dupont',
    tenant_first_name: 'Jean',
    tenant_phone: null,
    tenant_email: null,
    lease_id: 'lease-1',
    move_in_date: '2026-01-01',
    move_out_date: null,
    has_rent_this_month: true,
    paid_this_month: true,
    ...overrides,
  }
}

describe('MoisLoyersClient — rendu de base', () => {
  it('affiche le titre avec le mois', () => {
    render(<MoisLoyersClient apartments={[makeApt({})]} mois="septembre 2026" />)
    expect(screen.getByText('Loyers — septembre 2026')).toBeInTheDocument()
  })

  it('affiche le CA encaissé et le nombre de locataires ayant payé', () => {
    render(<MoisLoyersClient apartments={[
      makeApt({ id: 'a', rent_including_charges: 500, paid_this_month: true }),
      makeApt({ id: 'b', rent_including_charges: 300, paid_this_month: false }),
    ]} mois="septembre 2026" />)
    expect(screen.getByText('1 locataire ont payé')).toBeInTheDocument()
  })

  it('propose les filtres Occupation et Bâtiment', () => {
    render(<MoisLoyersClient apartments={[makeApt({})]} mois="septembre 2026" />)
    expect(screen.getByText('Loué')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Départ prévu')).toBeInTheDocument()
    expect(screen.getByText('Moulinet')).toBeInTheDocument()
  })

  it('exclut un appartement du calcul en désélectionnant son bâtiment', async () => {
    const user = userEvent.setup()
    render(<MoisLoyersClient apartments={[
      makeApt({ id: 'a', building_short_name: 'Moulinet', rent_including_charges: 500, paid_this_month: true }),
    ]} mois="septembre 2026" />)

    expect(screen.getByText('1 locataire ont payé')).toBeInTheDocument()
    await user.click(screen.getByText('Moulinet'))
    expect(screen.getByText('0 locataires ont payé')).toBeInTheDocument()
  })
})

describe('MoisLoyersClient — DonutChart', () => {
  it('affiche un anneau (2 cercles SVG) avec un stroke-dasharray borné à une décimale', () => {
    // Ancien composant (fix mismatch d'hydratation) : la répartition 8420 payés / 1325
    // impayés reproduisait un cas réel où Math.cos/Math.sin renvoyaient un dernier chiffre
    // différent entre serveur et client. Le nouvel anneau n'utilise aucune trigonométrie
    // (stroke-dasharray en pourcentage), donc cette classe de bug ne peut plus se produire —
    // on garde une répartition non triviale pour vérifier que les pourcentages restent bornés.
    const { container } = render(<MoisLoyersClient apartments={[
      makeApt({ id: 'a', rent_including_charges: 8420, paid_this_month: true }),
      makeApt({ id: 'b', rent_including_charges: 1325, paid_this_month: false }),
    ]} mois="septembre 2026" />)

    const circles = container.querySelectorAll('svg circle')
    expect(circles.length).toBe(2)

    const dasharray = circles[1].getAttribute('stroke-dasharray')!
    const [paidPct, restPct] = dasharray.split(' ').map(Number)
    expect(paidPct + restPct).toBeCloseTo(100, 5)
    const decimals = dasharray.match(/\.\d+/g) ?? []
    for (const d of decimals) {
      expect(d.length - 1).toBeLessThanOrEqual(1)
    }
  })

  it('affiche un cercle gris uni quand il n\'y a ni payé ni impayé (total = 0)', () => {
    const { container } = render(<MoisLoyersClient apartments={[
      makeApt({ has_rent_this_month: false }),
    ]} mois="septembre 2026" />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-gray-100.rounded-full')).toBeInTheDocument()
  })
})
