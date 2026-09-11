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

describe('MoisLoyersClient — PieChart (fix mismatch d\'hydratation)', () => {
  it('arrondit les coordonnées du path SVG à une précision fixe (au plus 4 décimales)', () => {
    // Répartition qui produit des angles non triviaux (pas de multiples de 90°), là où
    // Math.cos/Math.sin peuvent renvoyer un dernier chiffre différent entre serveur et
    // client — la valeur reportée dans SPEC.md (8420 payés / 1325 impayés) reproduit
    // exactement le cas réel qui cassait l'hydratation.
    const { container } = render(<MoisLoyersClient apartments={[
      makeApt({ id: 'a', rent_including_charges: 8420, paid_this_month: true }),
      makeApt({ id: 'b', rent_including_charges: 1325, paid_this_month: false }),
    ]} mois="septembre 2026" />)

    const paths = container.querySelectorAll('svg path')
    expect(paths.length).toBe(2)

    for (const path of paths) {
      const d = path.getAttribute('d')!
      const numbers = d.match(/-?\d+\.\d+/g) ?? []
      expect(numbers.length).toBeGreaterThan(0)
      for (const n of numbers) {
        const decimals = n.split('.')[1]?.length ?? 0
        expect(decimals).toBeLessThanOrEqual(4)
      }
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
