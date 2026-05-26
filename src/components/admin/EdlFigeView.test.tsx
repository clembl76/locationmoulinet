import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EdlFigeView from '@/components/admin/EdlFigeView'
import type { ApartmentWithLease, EdlInstallation, EdlKey } from '@/lib/adminData'
import type { LeaseDates, EdlFigeHeader } from '@/app/admin/inventory/summaryActions'
import type { InventoryRow } from '@/app/admin/inventory/actions'
import type { SurfaceRow } from '@/app/admin/inventory/surfacesActions'

vi.mock('@/app/admin/inventory/summaryActions', () => ({
  updateChargesTypeAction: vi.fn().mockResolvedValue(undefined),
  updateDepositNotesAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/app/admin/inventory/actions', () => ({
  updateInventoryNotesExitAction: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/app/admin/inventory/surfacesActions', () => ({
  updateSurfaceNotesExitAction: vi.fn().mockResolvedValue({ ok: true }),
}))

const apt: ApartmentWithLease = {
  apartment_id: 'apt-uuid-1',
  apartment_number: '7',
  tenant_name: 'Alice DUPONT',
  lease_id: 'lease-uuid-1',
}

const leaseDates: LeaseDates = {
  move_in_date: '2024-09-01',
  move_out_date: '2025-06-30',
  deposit: 750,
}

const installation: EdlInstallation = {
  hot_water: 'Électrique',
  heating: 'Gaz',
  charges_type: 'forfait',
  meter_readings: null,
  deposit_notes: null,
}

const keys: EdlKey[] = [
  { id: 'k1', key_type: 'Clé principale', quantity: 2, quantity_exit: null, order_index: 0 },
  { id: 'k2', key_type: 'Digicode', quantity: 1, quantity_exit: null, order_index: 1 },
]

const inventory: InventoryRow[] = [
  {
    id: 'i1', item_id: 'item-1', room: 'Salon', quantity: 1, condition: 'Bon état',
    notes: null, notes_exit: null, item_name: 'Canapé', item_category: 'Meuble ou objet',
    item_reference_url: null, item_unit_price: null, item_labor_cost: null,
  },
  {
    id: 'i2', item_id: 'item-2', room: 'Cuisine', quantity: 1, condition: 'Neuf',
    notes: 'Livré en 2024', notes_exit: 'Rayure sur le côté', item_name: 'Réfrigérateur',
    item_category: 'Appareil électrique', item_reference_url: null, item_unit_price: 300, item_labor_cost: null,
  },
]

const surfaces: SurfaceRow[] = [
  { id: 's1', surface: 'Sol', room: 'Salon', material: 'Parquet', condition: 'Bon état', notes: null, notes_exit: null },
  { id: 's2', surface: 'Mur', room: 'Cuisine', material: 'Peinture', condition: 'Bon état', notes: 'RAS', notes_exit: 'Tache' },
]

const header: EdlFigeHeader = {
  building_address: '12 rue de la Paix',
  building_short_name: 'Moulinet',
  apartment_number: '7',
  tenant_title: 'Mme',
  tenant_first_name: 'Alice',
  tenant_last_name: 'DUPONT',
  tenant_birth_date: '1990-03-15',
  tenant_birth_place: 'Paris',
  tenant_address: '5 rue des Lilas, 75011 Paris',
  tenant_phone: '0601020304',
  tenant_email: 'alice.dupont@email.com',
  owner_title: 'M.',
  owner_first_name: 'Pierre',
  owner_last_name: 'MARTIN',
  owner_birth_date: '1960-07-22',
  owner_birth_place: 'Lyon',
  owner_address: '8 avenue du Parc, 75008 Paris',
  owner_phone: '0701020304',
  owner_email: 'pierre.martin@email.com',
}

describe('EdlFigeView — affichage général', () => {
  it('affiche le titre avec le numéro apt et le locataire', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText(/Apt 7/)).toBeInTheDocument()
    expect(screen.getByText('Alice DUPONT')).toBeInTheDocument()
  })

  it('affiche la date entrée (mode entrée, sans header)', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('01/09/2024')
  })

  it('affiche la caution (sans header)', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('750 €')
  })

  it("n'affiche pas la date de sortie en mode Entrée (sans header)", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).not.toContain('30/06/2025')
  })
})

describe('EdlFigeView — toggle Entrée/Sortie', () => {
  it("affiche le badge État des lieux d'entrée par défaut", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText("État des lieux d'entrée")).toBeInTheDocument()
  })

  it("bascule sur Sortie au clic", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(screen.getByText('État des lieux de sortie')).toBeInTheDocument()
  })

  it("rebascule sur Entrée après double clic", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    await user.click(screen.getByRole('button', { name: 'Entrée' }))
    expect(screen.getByText("État des lieux d'entrée")).toBeInTheDocument()
  })

  it("affiche la date de sortie en mode Sortie (sans header)", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(document.body.textContent).toContain('30/06/2025')
  })
})

describe('EdlFigeView — blocs collapsibles', () => {
  it('replie le bloc Installations au clic sur son en-tête', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Électrique')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Installations/i }))
    expect(screen.queryByText('Électrique')).not.toBeInTheDocument()
  })

  it('déplie le bloc Installations à nouveau au second clic', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: /Installations/i }))
    await user.click(screen.getByRole('button', { name: /Installations/i }))
    expect(screen.getByText('Électrique')).toBeInTheDocument()
  })

  it('replie le bloc Clés au clic sur son en-tête', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Clé principale')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Clés/i }))
    expect(screen.queryByText('Clé principale')).not.toBeInTheDocument()
  })

  it('replie le bloc Inventaire au clic sur son en-tête', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Canapé')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Inventaire/i }))
    expect(screen.queryByText('Canapé')).not.toBeInTheDocument()
  })

  it('replie le bloc Surfaces au clic sur son en-tête', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Sol')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Surfaces/i }))
    expect(screen.queryByText('Sol')).not.toBeInTheDocument()
  })

  it('replie le bloc Bail au clic (sans header)', async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    // "Caution" est le label unique de la section Bail
    expect(screen.getByText('Caution')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Bail/i }))
    expect(screen.queryByText('Caution')).not.toBeInTheDocument()
  })
})

describe('EdlFigeView — en-tête EDL officiel', () => {
  it("affiche le titre État des lieux / Inventaire des meubles quand header fourni", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('État des lieux / Inventaire des meubles')
  })

  it("affiche l'adresse du bâtiment", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('12 rue de la Paix')
  })

  it("affiche les informations du bailleur", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('MARTIN')
    expect(document.body.textContent).toContain('le Bailleur')
  })

  it("affiche les informations du locataire", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('DUPONT')
    expect(document.body.textContent).toContain('le Locataire')
  })

  it("affiche le titre État des lieux / Inventaire des meubles comme bouton de section", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(screen.getByRole('button', { name: /État des lieux \/ Inventaire des meubles/i })).toBeInTheDocument()
  })

  it("affiche la ligne Appartement quand building_short_name === 'Moulinet'", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('Appartement')
  })

  it("n'affiche pas la ligne Appartement quand building_short_name !== 'Moulinet'", () => {
    const headerAutre: EdlFigeHeader = { ...header, building_short_name: 'AutreCopro' }
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={headerAutre} />)
    expect(document.body.textContent).not.toContain('Appartement')
  })

  it("n'affiche pas la date de sortie dans l'en-tête en mode Entrée", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(screen.queryByText('30/06/2025')).not.toBeInTheDocument()
  })

  it("affiche la date de sortie dans l'en-tête en mode Sortie", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(document.body.textContent).toContain('30/06/2025')
  })
})

describe('EdlFigeView — installations', () => {
  it('affiche eau chaude et chauffage', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Électrique')).toBeInTheDocument()
    expect(screen.getByText('Gaz')).toBeInTheDocument()
  })

  it('affiche un textarea éditable avec le texte forfait quand charges_type=forfait', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByDisplayValue('Charges au forfait, aucun relevé des compteurs.')).toBeInTheDocument()
  })

  it('affiche un textarea avec les relevés de compteurs quand charges_type=compteurs', () => {
    const instCompteurs: EdlInstallation = {
      ...installation,
      charges_type: 'compteurs',
      meter_readings: 'ELECTRICITE\nHC Été : 100 KWh',
    }
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={instCompteurs}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    const tas = document.querySelectorAll('textarea')
    const chargesTa = Array.from(tas).find(t => t.value.includes('ELECTRICITE'))
    expect(chargesTa).toBeDefined()
    expect(chargesTa?.value).toContain('HC Été : 100 KWh')
  })

  it('affiche "Non renseigné" si installation null', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={null}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Non renseigné')).toBeInTheDocument()
  })
})

describe('EdlFigeView — clés', () => {
  it('affiche les clés et leurs quantités', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Clé principale')).toBeInTheDocument()
    expect(screen.getByText('Digicode')).toBeInTheDocument()
  })

  it('affiche "Aucune clé" si pas de clés', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={[]} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Aucune clé')).toBeInTheDocument()
  })
})

describe('EdlFigeView — inventaire', () => {
  it('affiche les items groupés par pièce', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Canapé')).toBeInTheDocument()
    expect(screen.getByText('Réfrigérateur')).toBeInTheDocument()
  })

  it('affiche les pièces en header de groupe', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getAllByText('Salon').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Cuisine').length).toBeGreaterThanOrEqual(1)
  })

  it('affiche "Aucun item" si inventaire vide', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={[]} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Aucun item')).toBeInTheDocument()
  })

  it("n'affiche pas la colonne COMMENTAIRE SORTIE en mode Entrée", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.queryByText('Commentaire sortie')).not.toBeInTheDocument()
  })

  it("affiche la colonne COMMENTAIRE SORTIE en mode Sortie", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(screen.getAllByText('Commentaire sortie').length).toBeGreaterThanOrEqual(1)
  })
})

describe('EdlFigeView — surfaces', () => {
  it('affiche les surfaces et leurs informations', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByText('Sol')).toBeInTheDocument()
    expect(screen.getByText('Parquet')).toBeInTheDocument()
  })

  it('affiche "Aucune surface" si vide', () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={[]} header={null} />)
    expect(screen.getByText('Aucune surface')).toBeInTheDocument()
  })

  it("affiche la colonne COMMENTAIRE SORTIE des surfaces en mode Sortie", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    // 2 colonnes COMMENTAIRE SORTIE : une inventaire + une surfaces
    expect(screen.getAllByText('Commentaire sortie').length).toBeGreaterThanOrEqual(2)
  })

  it("n'affiche pas la colonne surfaces COMMENTAIRE SORTIE en mode Entrée", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={[]} surfaces={surfaces} header={null} />)
    expect(screen.queryByText('Commentaire sortie')).not.toBeInTheDocument()
  })
})

describe('EdlFigeView — footer signatures', () => {
  it("affiche le titre Signatures par défaut", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.getByRole('button', { name: /^[▼▶]\s*Signatures$/i })).toBeInTheDocument()
  })

  it("affiche Entrée dans les lieux en mode Entrée", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('Entrée dans les lieux le')
  })

  it("affiche la caution dans le footer", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('Montant de la caution versée')
  })

  it("affiche les signatures locataire et propriétaire", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('Signature du locataire')
    expect(document.body.textContent).toContain('Signature du propriétaire')
    expect(document.body.textContent).toContain('Lu et approuvé')
  })

  it("affiche Sortie des lieux en mode Sortie", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(document.body.textContent).toContain('Sortie des lieux le')
  })

  it("affiche un textarea pour les réserves en mode Sortie", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    await user.click(screen.getByRole('button', { name: 'Sortie' }))
    expect(document.body.textContent).toContain('Commentaires, réserves et retenues éventuelles sur caution')
  })

  it("n'affiche pas le textarea réserves en mode Entrée", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.queryByPlaceholderText('Commentaires, réserves…')).not.toBeInTheDocument()
  })

  it("affiche les noms locataire et propriétaire dans les signatures quand header fourni", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={header} />)
    expect(document.body.textContent).toContain('DUPONT')
    expect(document.body.textContent).toContain('MARTIN')
  })

  it("replie le footer au clic sur son en-tête", async () => {
    const user = userEvent.setup()
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(document.body.textContent).toContain('Signature du locataire')
    await user.click(screen.getByRole('button', { name: /Signatures/i }))
    expect(screen.queryByText('Signature du locataire')).not.toBeInTheDocument()
  })
})

describe('EdlFigeView — lecture seule (pas de boutons CRUD)', () => {
  it("n'affiche pas de bouton Modifier ou Enregistrer", () => {
    render(<EdlFigeView apt={apt} leaseDates={leaseDates} installation={installation}
      keys={keys} inventory={inventory} surfaces={surfaces} header={null} />)
    expect(screen.queryByRole('button', { name: /Modifier/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enregistrer/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajouter/i })).not.toBeInTheDocument()
  })
})
