import { describe, it, expect } from 'vitest'
import { categorize, type CategorizedResult } from '../../lib/linxoCategorization'

type Tx = { libelle: string | null; notes: string | null; montant: number | null; date: string | null }
type Tenant = { last_name: string; first_name: string | null; apartment_num: string; rent_including_charges: number | null; lease_id: string }
type Guarantor = { last_name: string; tenant_last_name: string; apartment_num: string; lease_id: string }
type Mapping = { libelle_pattern: string; type: string; supplier: string }

const TENANT_HAMMOUM: Tenant = {
  last_name: 'HAMMOUM',
  first_name: 'Karim',
  apartment_num: '11',
  rent_including_charges: 850,
  lease_id: 'lease-uuid-hammoum',
}

const TENANT_MARTIN: Tenant = {
  last_name: 'MARTIN',
  first_name: 'Sophie',
  apartment_num: '3',
  rent_including_charges: 620,
  lease_id: 'lease-uuid-martin',
}

const GUARANTOR_DUPONT: Guarantor = {
  last_name: 'DUPONT',
  tenant_last_name: 'HAMMOUM',
  apartment_num: '11',
  lease_id: 'lease-uuid-hammoum',
}

const MAPPING_EDF: Mapping = { libelle_pattern: 'EDF', type: 'CHARGE', supplier: 'EDF' }
const MAPPING_LONG: Mapping = { libelle_pattern: 'EDF ENERGIE', type: 'CHARGE', supplier: 'EDF Energie' }

describe('categorize — règle 1 : correspondance locataire', () => {
  it('identifie le locataire par son nom dans le libellé', () => {
    const tx: Tx = { libelle: 'VIR HAMMOUM KARIM', notes: null, montant: 850, date: '2026-03-01' }
    const result = categorize(tx, [TENANT_HAMMOUM], [], [])
    expect(result.type).toBe('LOYER')
    expect(result.supplier).toBe('HAMMOUM')
    expect(result.apartment_num).toBe('11')
    expect(result.lease_id).toBe('lease-uuid-hammoum')
    expect(result.tenant_name).toBe('Karim HAMMOUM')
  })

  it('génère une description quand le montant correspond exactement au loyer', () => {
    const tx: Tx = { libelle: 'VIR HAMMOUM', notes: null, montant: 850, date: '2026-03-01' }
    const result = categorize(tx, [TENANT_HAMMOUM], [], [])
    expect(result.description).toContain('HAMMOUM')
    expect(result.description).toContain('11')
    expect(result.description).toContain('mars')
  })

  it('ne génère pas de description si le montant diffère du loyer', () => {
    const tx: Tx = { libelle: 'VIR HAMMOUM', notes: null, montant: 500, date: '2026-03-01' }
    const result = categorize(tx, [TENANT_HAMMOUM], [], [])
    expect(result.description).toBeNull()
  })

  it('correspond via les notes si le libellé ne contient pas le nom', () => {
    const tx: Tx = { libelle: 'VIR DIVERS', notes: 'de MARTIN', montant: 620, date: '2026-05-01' }
    const result = categorize(tx, [TENANT_MARTIN], [], [])
    expect(result.supplier).toBe('MARTIN')
    expect(result.lease_id).toBe('lease-uuid-martin')
  })

  it('est insensible à la casse et aux accents', () => {
    const tx: Tx = { libelle: 'vir hammoüm loyer', notes: null, montant: null, date: null }
    const result = categorize(tx, [TENANT_HAMMOUM], [], [])
    expect(result.supplier).toBe('HAMMOUM')
  })

  it('ignore les locataires dont le nom fait moins de 3 caractères', () => {
    const shortTenant: Tenant = { last_name: 'Li', first_name: 'Wei', apartment_num: '5', rent_including_charges: 500, lease_id: 'lease-li' }
    const tx: Tx = { libelle: 'VIR Li Wei 500', notes: null, montant: 500, date: null }
    const result = categorize(tx, [shortTenant], [], [])
    expect(result.supplier).toBeNull()
  })

  it('ne confond pas les locataires de baux différents — HAMMOUM vs MASSON', () => {
    const TENANT_MASSON: Tenant = {
      last_name: 'MASSON',
      first_name: 'Pierre',
      apartment_num: '11',
      rent_including_charges: 900,
      lease_id: 'lease-uuid-masson',
    }
    const txHammoum: Tx = { libelle: 'VIR HAMMOUM', notes: null, montant: 850, date: '2023-06-01' }
    const txMasson: Tx = { libelle: 'VIR MASSON', notes: null, montant: 900, date: '2026-03-01' }

    const rHammoum = categorize(txHammoum, [TENANT_MASSON], [], [])
    expect(rHammoum.lease_id).not.toBe('lease-uuid-hammoum')

    const rMasson = categorize(txMasson, [TENANT_MASSON], [], [])
    expect(rMasson.lease_id).toBe('lease-uuid-masson')
  })
})

describe('categorize — règle 2 : correspondance garant', () => {
  it('identifie la transaction via le nom du garant', () => {
    const tx: Tx = { libelle: 'VIR DUPONT loyer', notes: null, montant: null, date: null }
    const result = categorize(tx, [TENANT_HAMMOUM], [GUARANTOR_DUPONT], [])
    expect(result.type).toBe('LOYER')
    expect(result.supplier).toBe('DUPONT')
    expect(result.apartment_num).toBe('11')
    expect(result.lease_id).toBe('lease-uuid-hammoum')
    expect(result.tenant_name).toBe('HAMMOUM')
    expect(result.description).toBeNull()
  })

  it('le garant ne prend pas la priorité sur un locataire correspondant', () => {
    const tx: Tx = { libelle: 'VIR HAMMOUM', notes: null, montant: null, date: null }
    const result = categorize(tx, [TENANT_HAMMOUM], [GUARANTOR_DUPONT], [])
    expect(result.supplier).toBe('HAMMOUM')
  })
})

describe('categorize — règle 3 : correspondance mapping', () => {
  it('identifie la transaction via un mapping', () => {
    const tx: Tx = { libelle: 'PRELEVEMENT EDF MENSUEL', notes: null, montant: null, date: null }
    const result = categorize(tx, [], [], [MAPPING_EDF])
    expect(result.type).toBe('CHARGE')
    expect(result.supplier).toBe('EDF')
    expect(result.apartment_num).toBeNull()
    expect(result.lease_id).toBeNull()
  })

  it('prend le mapping le plus long en premier (pattern le plus spécifique)', () => {
    const tx: Tx = { libelle: 'PRELEVEMENT EDF ENERGIE', notes: null, montant: null, date: null }
    // Les mappings sont déjà triés par longueur décroissante (comme en DB)
    const result = categorize(tx, [], [], [MAPPING_LONG, MAPPING_EDF])
    expect(result.supplier).toBe('EDF Energie')
  })

  it('ne déclenche pas le mapping si le pattern ne correspond pas', () => {
    const tx: Tx = { libelle: 'PRELEVEMENT ENGIE', notes: null, montant: null, date: null }
    const result = categorize(tx, [], [], [MAPPING_EDF])
    expect(result.supplier).toBeNull()
  })
})

describe('categorize — aucune correspondance', () => {
  it('retourne tous les champs null si aucune règle ne correspond', () => {
    const tx: Tx = { libelle: 'VIREMENT INCONNU', notes: null, montant: 999, date: '2026-01-15' }
    const result = categorize(tx, [], [], [])
    const expected: CategorizedResult = {
      supplier: null, type: null, description: null,
      apartment_num: null, tenant_name: null, lease_id: null,
    }
    expect(result).toEqual(expected)
  })

  it('ne plante pas sur des libellés null', () => {
    const tx: Tx = { libelle: null, notes: null, montant: null, date: null }
    expect(() => categorize(tx, [TENANT_HAMMOUM], [GUARANTOR_DUPONT], [MAPPING_EDF])).not.toThrow()
  })
})
