import { describe, it, expect } from 'vitest'
import { MONTHS_FULL, MONTHS_SHORT, MONTH_LABELS } from '@/lib/monthLabels'

describe('MONTHS_FULL', () => {
  it('contient les 12 noms complets, janvier en index 0', () => {
    expect(MONTHS_FULL).toEqual([
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ])
  })
})

describe('MONTHS_SHORT', () => {
  it('contient les 12 abréviations 3 lettres sans point, janvier en index 0', () => {
    expect(MONTHS_SHORT).toEqual(
      ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    )
  })
})

describe('MONTH_LABELS', () => {
  it('contient les 12 abréviations avec point, indexées de 1 à 12', () => {
    expect(MONTH_LABELS).toEqual({
      1: 'janv.', 2: 'févr.', 3: 'mars', 4: 'avr.',
      5: 'mai', 6: 'juin', 7: 'juil.', 8: 'août',
      9: 'sept.', 10: 'oct.', 11: 'nov.', 12: 'déc.',
    })
  })
})
