import { describe, it, expect } from 'vitest'
import { calcProrataBreakdown } from '@/lib/quittanceUtils'

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
