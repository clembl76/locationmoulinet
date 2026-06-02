import { describe, it, expect } from 'vitest'
import { buildTenantListEmailBody } from '@/lib/emailFormatting'

// Dates de référence indépendantes de la date d'exécution
const FUTURE = '2099-12-31'
const PAST = '2020-01-01'

const makeTenant = (overrides: Partial<{
  apartment_number: string
  title: string | null
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  move_in_inspection_date: string | null
  move_out_inspection_date: string | null
}>) => ({
  apartment_number: '1',
  title: null,
  first_name: 'Prénom',
  last_name: 'NOM',
  phone: null,
  email: null,
  move_in_inspection_date: null,
  move_out_inspection_date: null,
  ...overrides,
})

const baseTrigger = {
  title: 'M.' as string | null,
  firstName: 'Jérémie',
  lastName: 'MARTIN',
  phone: '06 12 34 56 78',
  email: 'martin@gmail.com',
  aptNumber: '10',
  moveType: 'entrée' as const,
  moveDate: '2026-10-20',
}

describe('buildTenantListEmailBody — locataire déclencheur', () => {
  it("affiche le locataire déclencheur en gras avec 'Entrée le'", () => {
    const body = buildTenantListEmailBody({ changedTenant: baseTrigger, allTenants: [] })
    expect(body).toContain('<strong>')
    expect(body).toContain('Appartement 10')
    expect(body).toContain('MARTIN Jérémie')
    expect(body).toContain('Entrée le 20/10/2026')
    expect(body).toContain('06 12 34 56 78')
    expect(body).toContain('martin@gmail.com')
  })

  it("utilise 'Sortie le' pour un départ", () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, moveType: 'sortie', moveDate: '2026-06-30' },
      allTenants: [],
    })
    expect(body).toContain('Sortie le 30/06/2026')
  })

  it("n'affiche pas de date si moveDate est vide", () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, moveDate: '' },
      allTenants: [],
    })
    expect(body).not.toContain('Entrée le')
    expect(body).not.toContain('Sortie le')
  })

  it("affiche '—' si phone ou email manquant", () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, phone: null, email: null },
      allTenants: [],
    })
    const section = body.split('<hr>')[0]
    expect(section.match(/—/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('affiche le titre si présent', () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, title: 'Mme', firstName: 'Claire', lastName: 'JONES' },
      allTenants: [],
    })
    expect(body).toContain('Mme JONES Claire')
  })

  it('met le nom en majuscules', () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, lastName: 'martin' },
      allTenants: [],
    })
    expect(body).toContain('MARTIN')
  })

  it('formate la date avec des zéros initiaux', () => {
    const body = buildTenantListEmailBody({
      changedTenant: { ...baseTrigger, moveDate: '2026-01-05' },
      allTenants: [],
    })
    expect(body).toContain('05/01/2026')
  })
})

describe('buildTenantListEmailBody — séparateur et structure', () => {
  it('contient un <hr> séparant le déclencheur du reste', () => {
    const body = buildTenantListEmailBody({ changedTenant: baseTrigger, allTenants: [] })
    expect(body).toContain('<hr>')
  })

  it('exclut le locataire déclencheur de la liste (même numéro d\'appt)', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '10', first_name: 'Double', last_name: 'DOUBLON', move_in_inspection_date: PAST }),
        makeTenant({ apartment_number: '2', first_name: 'Autre', last_name: 'AUTRE', move_in_inspection_date: PAST }),
      ],
    })
    // Le déclencheur (appt 10) ne doit apparaître qu'une fois
    const matches = body.match(/Appartement 10/g) ?? []
    expect(matches.length).toBe(1)
    expect(body).toContain('Appartement 2')
  })
})

describe('buildTenantListEmailBody — gras et ordre', () => {
  it('met en gras les locataires avec move_in >= aujourd\'hui', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '3', first_name: 'Alice', last_name: 'FUTUR', move_in_inspection_date: FUTURE }),
        makeTenant({ apartment_number: '4', first_name: 'Bob', last_name: 'STABLE', move_in_inspection_date: PAST }),
      ],
    })
    expect(body).toContain('<strong>')
    // FUTUR doit être dans un bloc <strong>
    const strongSections = body.match(/<strong>[\s\S]*?<\/strong>/g) ?? []
    expect(strongSections.some(s => s.includes('FUTUR Alice'))).toBe(true)
    expect(strongSections.some(s => s.includes('STABLE Bob'))).toBe(false)
  })

  it('met en gras les locataires avec move_out >= aujourd\'hui', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '5', first_name: 'Carmen', last_name: 'SORTIE', move_out_inspection_date: FUTURE }),
        makeTenant({ apartment_number: '6', first_name: 'David', last_name: 'STABLE', move_out_inspection_date: PAST }),
      ],
    })
    const strongSections = body.match(/<strong>[\s\S]*?<\/strong>/g) ?? []
    expect(strongSections.some(s => s.includes('SORTIE Carmen'))).toBe(true)
    expect(strongSections.some(s => s.includes('STABLE David'))).toBe(false)
  })

  it('les locataires en mouvement apparaissent avant les stables', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '2', first_name: 'Stable', last_name: 'STABLE', move_in_inspection_date: PAST }),
        makeTenant({ apartment_number: '3', first_name: 'Mobile', last_name: 'MOBILE', move_in_inspection_date: FUTURE }),
      ],
    })
    const posStable = body.indexOf('STABLE Stable')
    const posMobile = body.indexOf('MOBILE Mobile')
    expect(posMobile).toBeLessThan(posStable)
  })

  it("affiche 'Entrée le' pour un locataire en mouvement (move_in futur)", () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '3', first_name: 'Alice', last_name: 'FUTUR', move_in_inspection_date: '2099-06-15' }),
      ],
    })
    expect(body).toContain('Entrée le 15/06/2099')
  })

  it("affiche 'Sortie le' pour un locataire en mouvement (move_out futur), prioritaire sur move_in", () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({
          apartment_number: '3',
          first_name: 'Alice',
          last_name: 'DOUBLE',
          move_in_inspection_date: '2099-03-01',
          move_out_inspection_date: '2099-06-30',
        }),
      ],
    })
    expect(body).toContain('Sortie le 30/06/2099')
    expect(body).not.toContain('Entrée le 01/03/2099')
  })

  it('ne montre pas de label de date pour un locataire stable', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '7', first_name: 'Eve', last_name: 'STABLE', move_in_inspection_date: PAST, move_out_inspection_date: null }),
      ],
    })
    // Après le HR, pas de "Entrée le" ni "Sortie le" pour le locataire stable
    const afterHr = body.split('<hr>')[1] ?? ''
    expect(afterHr).not.toContain('Entrée le')
    expect(afterHr).not.toContain('Sortie le')
  })

  it("affiche '—' si phone ou email manquant dans la liste", () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '7', first_name: 'Alice', last_name: 'TEST', phone: null, email: null }),
      ],
    })
    expect(body).toContain('—')
  })

  it('affiche le titre si présent dans la liste', () => {
    const body = buildTenantListEmailBody({
      changedTenant: baseTrigger,
      allTenants: [
        makeTenant({ apartment_number: '4', title: 'Mme', first_name: 'Lucie', last_name: 'RENARD' }),
      ],
    })
    expect(body).toContain('Mme RENARD Lucie')
  })

  it('fonctionne avec une liste vide', () => {
    const body = buildTenantListEmailBody({ changedTenant: baseTrigger, allTenants: [] })
    expect(body).toContain('MARTIN Jérémie')
    expect(body).toContain('<hr>')
  })
})
