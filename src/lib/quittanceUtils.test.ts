import { describe, it, expect } from 'vitest'
import { calcProrataBreakdown, computeQuittancePeriod, fmtShortDate } from '@/lib/quittanceUtils'

describe('calcProrataBreakdown', () => {
  it('cas plein (pas de prorata) : répartit exactement loyer HC + charges', () => {
    const { loyerHc, charges } = calcProrataBreakdown(485, 385, 485)
    expect(loyerHc).toBe(385)
    expect(charges).toBe(100)
    expect(loyerHc + charges).toBe(485)
  })

  it('cas prorata : répartit proportionnellement et la somme égale amountReceived (en centimes)', () => {
    // Exemple du bug : loyer HC 385, charges 100, CC 485, prorata 452.67
    const { loyerHc, charges } = calcProrataBreakdown(452.67, 385, 485)
    expect(Math.round((loyerHc + charges) * 100)).toBe(Math.round(452.67 * 100))
    expect(loyerHc).toBeLessThan(385)
    expect(charges).toBeLessThan(100)
  })

  it('cas prorata : loyer et charges sont arrondis au centième', () => {
    const { loyerHc, charges } = calcProrataBreakdown(452.67, 385, 485)
    expect(Number.isInteger(Math.round(loyerHc * 100))).toBe(true)
    expect(Number.isInteger(Math.round(charges * 100))).toBe(true)
  })

  it('premier mois (prorata entrée mi-mois) : somme correcte', () => {
    // Entrée le 15 : 16 jours / 30 = 0.5333...
    const prorata = Math.round((16 / 30) * 485 * 100) / 100
    const { loyerHc, charges } = calcProrataBreakdown(prorata, 385, 485)
    expect(loyerHc + charges).toBe(prorata)
  })

  it('dernier mois (prorata sortie) : somme correcte en centimes', () => {
    // Sortie le 10 : 10 jours / 30
    const prorata = Math.round((10 / 30) * 485 * 100) / 100
    const { loyerHc, charges } = calcProrataBreakdown(prorata, 385, 485)
    expect(Math.round((loyerHc + charges) * 100)).toBe(Math.round(prorata * 100))
  })

  it('charges nulles (loyer HC = CC) : charges prorata = 0', () => {
    const { loyerHc, charges } = calcProrataBreakdown(300, 300, 300)
    expect(loyerHc).toBe(300)
    expect(charges).toBe(0)
  })

  it('rent_including_charges = 0 : ne divise pas par zéro, ratio = 1', () => {
    const { loyerHc, charges } = calcProrataBreakdown(0, 0, 0)
    expect(loyerHc).toBe(0)
    expect(charges).toBe(0)
  })

  it('montant reçu = 0 : répartition à zéro', () => {
    const { loyerHc, charges } = calcProrataBreakdown(0, 385, 485)
    expect(loyerHc).toBe(0)
    expect(charges).toBe(0)
  })
})

describe('computeQuittancePeriod', () => {
  it('mois plein (pas de signature ni de sortie ce mois-ci) : du 1er au dernier jour du mois', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, null, null)
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('mois plein : gère correctement un mois de 30 jours', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 4, null, null)
    expect(periodStartIso).toBe('2026-04-01')
    expect(periodEndIso).toBe('2026-04-30')
  })

  it('mois plein : gère correctement février en année bissextile', () => {
    const { periodEndIso } = computeQuittancePeriod(2024, 2, null, null)
    expect(periodEndIso).toBe('2024-02-29')
  })

  it('mois plein : signature/sortie dans un autre mois ne change rien', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-05-15', '2026-09-10')
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('prorata d\'entrée : la période commence à la date de signature, finit au dernier jour du mois', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-07-15', null)
    expect(periodStartIso).toBe('2026-07-15')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('prorata de sortie : la période commence au 1er du mois, finit à la date de fin du bail', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, null, '2026-07-10')
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-10')
  })

  it('bail signé et terminé dans le même mois : les deux bornes sont ajustées', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-07-05', '2026-07-20')
    expect(periodStartIso).toBe('2026-07-05')
    expect(periodEndIso).toBe('2026-07-20')
  })

  it('signature le 1er du mois : équivalent à un mois plein (pas de décalage)', () => {
    const { periodStartIso } = computeQuittancePeriod(2026, 7, '2026-07-01', null)
    expect(periodStartIso).toBe('2026-07-01')
  })

  it('sortie le dernier jour du mois : équivalent à un mois plein (pas de décalage)', () => {
    const { periodEndIso } = computeQuittancePeriod(2026, 7, null, '2026-07-31')
    expect(periodEndIso).toBe('2026-07-31')
  })
})

describe('fmtShortDate', () => {
  it('formate une date ISO YYYY-MM-DD en DD/MM/YYYY', () => {
    expect(fmtShortDate('1983-08-02')).toBe('02/08/1983')
    expect(fmtShortDate('1954-02-10')).toBe('10/02/1954')
    expect(fmtShortDate('2026-07-06')).toBe('06/07/2026')
  })

  it('retourne une chaîne vide pour null', () => {
    expect(fmtShortDate(null)).toBe('')
  })

  it('conserve les zéros de padding du mois et du jour', () => {
    expect(fmtShortDate('2024-01-05')).toBe('05/01/2024')
  })
})
