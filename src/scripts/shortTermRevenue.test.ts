// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { splitEqually, buildShortTermImport } from '@/scripts/lib/shortTermRevenue.mjs'

const apartments = [
  { id: 'id-1', number: '1' },
  { id: 'id-24', number: '24' },
  { id: 'id-25', number: '25' },
  { id: 'id-28', number: '28' },
  { id: 'id-29', number: '29' },
  { id: 'id-80', number: '80' },
]

function row(overrides: Record<string, unknown> = {}) {
  return { line: 2, year: 2022, apt: '24', month: 3, name: 'AIRBNB', amount: 100, description: 'LOYER - 24 - AIRBNB - mars 2022', ...overrides }
}

describe('splitEqually', () => {
  it('répartit à parts égales', () => {
    expect(splitEqually(110, 5)).toEqual([22, 22, 22, 22, 22])
  })

  it('donne les centimes restants aux premières parts, sans perdre un centime', () => {
    const shares = splitEqually(38, 5)
    expect(shares).toEqual([7.6, 7.6, 7.6, 7.6, 7.6])
    const odd = splitEqually(32, 5)
    expect(odd).toEqual([6.4, 6.4, 6.4, 6.4, 6.4])
    const uneven = splitEqually(100.03, 5)
    expect(uneven).toEqual([20.01, 20.01, 20.01, 20, 20])
    expect(Math.round(uneven.reduce((s, x) => s + x, 0) * 100)).toBe(10003)
  })

  it('gère une seule part et un montant négatif', () => {
    expect(splitEqually(810.72, 1)).toEqual([810.72])
    expect(splitEqually(-10.01, 2)).toEqual([-5.01, -5])
  })
})

describe('buildShortTermImport', () => {
  it('importe un paiement sur un seul appartement', () => {
    const { records, skipped, unmatched } = buildShortTermImport([row({ line: 975, year: 2020, apt: '1', month: 2, amount: 810.72 })], apartments)
    expect(skipped).toEqual([])
    expect(unmatched).toEqual([])
    expect(records).toEqual([{
      apartment_id: 'id-1',
      apartment_number: '1',
      year: 2020,
      month: 2,
      platform: 'AIRBNB',
      amount: 810.72,
      description: 'LOYER - 24 - AIRBNB - mars 2022',
      import_key: 'historique-l975-appt1',
    }])
  })

  it('répartit un paiement groupé à parts égales entre les 5 logements (BE = appt 80)', () => {
    const { records } = buildShortTermImport([row({ line: 816, apt: '24 25 28 29 BE', month: 1, amount: 110 })], apartments)
    expect(records.map(r => [r.apartment_number, r.amount])).toEqual([
      ['24', 22], ['25', 22], ['28', 22], ['29', 22], ['80', 22],
    ])
    expect(records.map(r => r.import_key)).toEqual([
      'historique-l816-appt24', 'historique-l816-appt25', 'historique-l816-appt28', 'historique-l816-appt29', 'historique-l816-appt80',
    ])
    expect(new Set(records.map(r => `${r.year}-${r.month}`))).toEqual(new Set(['2022-1']))
  })

  it('garde la plateforme et laisse la description vide à null', () => {
    const { records } = buildShortTermImport([row({ name: 'LE BON COIN', description: '' })], apartments)
    expect(records[0]).toMatchObject({ platform: 'LE BON COIN', description: null })
  })

  it('ignore les lignes de locataires (seules les plateformes sont concernées)', () => {
    const { records, skipped, unmatched } = buildShortTermImport([row({ name: 'JOVER' })], apartments)
    expect(records).toEqual([])
    expect(skipped).toEqual([])
    expect(unmatched).toEqual([])
  })

  it('écarte un montant nul ou une ligne illisible', () => {
    const { records, skipped } = buildShortTermImport([
      row({ line: 2, amount: 0 }),
      row({ line: 3, amount: null }),
      row({ line: 4, month: 13 }),
    ], apartments)
    expect(records).toEqual([])
    expect(skipped.map(s => [s.row.line, s.reason])).toEqual([
      [2, 'Montant nul'],
      [3, 'Ligne illisible (année, mois ou montant)'],
      [4, 'Ligne illisible (année, mois ou montant)'],
    ])
  })

  it("n'importe rien d'un paiement groupé dont un appartement est introuvable", () => {
    const { records, unmatched } = buildShortTermImport([
      row({ line: 5, apt: '24 99' }),
      row({ line: 6, apt: '' }),
    ], apartments)
    expect(records).toEqual([])
    expect(unmatched.map(u => [u.row.line, u.unknown])).toEqual([[5, ['99']], [6, []]])
  })

  it("ne compte qu'une fois un appartement cité deux fois", () => {
    const { records } = buildShortTermImport([row({ apt: '80 BE', amount: 50 })], apartments)
    expect(records.map(r => [r.apartment_number, r.amount])).toEqual([['80', 50]])
  })
})
