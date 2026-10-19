// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  normalizeName,
  parseDescMonth,
  daysInMonth,
  parseTsv,
  classifyRow,
  resolveLease,
  buildRentImport,
  WRITTEN_OFF_NOTE,
} from '@/scripts/lib/rentHistory.mjs'

type Lease = {
  id: string
  apartment_number: string
  last_names: string[]
  signing_date: string | null
  move_in_date: string | null
  move_out_date: string | null
  rent_including_charges: number | null
  existing_rents: number
}

function lease(overrides: Partial<Lease> & { id: string }): Lease {
  return {
    apartment_number: '1',
    last_names: ['DUPONT'],
    signing_date: '2024-01-01',
    move_in_date: '2024-01-01',
    move_out_date: null,
    rent_including_charges: 500,
    existing_rents: 0,
    ...overrides,
  }
}

function row(overrides: Record<string, unknown> = {}) {
  return { line: 2, year: 2024, apt: '1', month: 3, name: 'DUPONT', amount: 500, description: '', ...overrides }
}

describe('parseAmount', () => {
  it('lit les formats du fichier', () => {
    expect(parseAmount('700,00')).toBe(700)
    expect(parseAmount('700 €')).toBe(700)
    expect(parseAmount('810,72')).toBe(810.72)
    expect(parseAmount('-240 €')).toBe(-240)
    expect(parseAmount('1 200 €')).toBe(1200)
  })

  it('renvoie null si vide ou illisible', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('normalizeName', () => {
  it('ignore la casse, les accents et les espaces superflus', () => {
    expect(normalizeName(' Guignon ')).toBe('GUIGNON')
    expect(normalizeName('Aïssatou')).toBe('AISSATOU')
    expect(normalizeName('BEN   BRIK')).toBe('BEN BRIK')
    expect(normalizeName(null)).toBe('')
  })
})

describe('parseDescMonth', () => {
  it('lit le mois en fin de description', () => {
    expect(parseDescMonth('LOYER - 11 - HAMMOUM - août 2025', 2025)).toBe(8)
    expect(parseDescMonth('LOYER - 21 - KONTE - fev. 2021', 2021)).toBe(2)
    expect(parseDescMonth('LOYER - 26 - KACH - avr 2025', 2025)).toBe(4)
    expect(parseDescMonth('LOYER - 8 - EVENO - déc. 2025', 2025)).toBe(12)
  })

  it('lit le mois accolé à LOYER', () => {
    expect(parseDescMonth('LOYER NOV - 27 - NEMI MBOGBA', 2025)).toBe(11)
  })

  it('ne confond pas un nom de famille avec un mois', () => {
    expect(parseDescMonth('LOYER - 12 - MARIE', 2025)).toBeNull()
    expect(parseDescMonth('LOYER - 2 - MARTIN', 2020)).toBeNull()
  })

  it("renvoie null si la description vise une autre année", () => {
    expect(parseDescMonth('LOYER - 2 - MENDY - janv. 2026', 2025)).toBeNull()
  })

  it('renvoie null sans mois lisible', () => {
    expect(parseDescMonth('', 2024)).toBeNull()
    expect(parseDescMonth('Espèces', 2024)).toBeNull()
    expect(parseDescMonth('LOYER - 12 - KASMI - avr. 2022 - prorata 11 avril', 2022)).toBeNull()
  })
})

describe('daysInMonth', () => {
  it('gère les années bissextiles', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(2025, 12)).toBe(31)
  })
})

describe('parseTsv', () => {
  it("saute l'en-tête et les lignes vides, garde le numéro de ligne", () => {
    const tsv = 'ANNEE\tAPPT\tMOIS\tFOURNISSEUR\tMontant\tDescription\tLoyer HC\tCharges\r\n'
      + '2025\t1\t1\tJOVER\t700,00\tLOYER - 1 - JOVER - janv. 2025\t550€\t150€\r\n'
      + '\r\n'
      + '2024\t30\t9\tDILIBERTO \t275,00\t\t214\t61\r\n'
    expect(parseTsv(tsv)).toEqual([
      { line: 2, year: 2025, apt: '1', month: 1, name: 'JOVER', amount: 700, description: 'LOYER - 1 - JOVER - janv. 2025' },
      { line: 4, year: 2024, apt: '30', month: 9, name: 'DILIBERTO', amount: 275, description: '' },
    ])
  })
})

describe('classifyRow', () => {
  it('distingue chaque nature de ligne', () => {
    expect(classifyRow(row())).toBe('rent')
    expect(classifyRow(row({ amount: -240, description: 'Remboursement trop perçu' }))).toBe('rent')
    expect(classifyRow(row({ name: 'AIRBNB' }))).toBe('platform')
    expect(classifyRow(row({ name: 'LE BON COIN' }))).toBe('platform')
    expect(classifyRow(row({ amount: 0, description: 'CAUTION - 10 - BLIGAND' }))).toBe('zero')
    expect(classifyRow(row({ amount: 300, description: 'IMPAYE' }))).toBe('unpaid')
    expect(classifyRow(row({ amount: 40, description: 'CAUTION moins LOYER juil' }))).toBe('deposit')
    expect(classifyRow(row({ amount: null }))).toBe('invalid')
    expect(classifyRow(row({ month: 13 }))).toBe('invalid')
  })
})

describe('resolveLease', () => {
  it('retrouve le bail par nom, appartement et période', () => {
    const leases = [
      lease({ id: 'a', apartment_number: '14', last_names: ['ABASSA'], signing_date: '2022-08-01', move_in_date: '2022-08-01', move_out_date: '2024-10-03' }),
      lease({ id: 'b', apartment_number: '23', last_names: ['ABASSA'], signing_date: '2024-10-04', move_in_date: '2024-10-04' }),
    ]
    expect(resolveLease(row({ name: 'ABASSA', apt: '14', month: 9 }), 9, leases)).toMatchObject({ lease: { id: 'a' }, quality: 'exact' })
    expect(resolveLease(row({ name: 'ABASSA', apt: '23', month: 11 }), 11, leases)).toMatchObject({ lease: { id: 'b' }, quality: 'exact' })
  })

  it("se rabat sur l'autre appartement du locataire quand celui du fichier n'a pas de bail en cours", () => {
    const leases = [
      lease({ id: 'apt30', apartment_number: '30', last_names: ['BEN BRIK'], signing_date: '2020-04-23', move_in_date: '2020-04-23', move_out_date: '2022-02-22' }),
      lease({ id: 'apt8', apartment_number: '8', last_names: ['BEN BRIK'], signing_date: '2022-02-22', move_in_date: '2022-02-22', move_out_date: '2023-04-30' }),
    ]
    const r = row({ name: 'BEN BRIK', apt: '8', year: 2022, month: 1 })
    expect(resolveLease(r, 1, leases)).toMatchObject({ lease: { id: 'apt30' }, quality: 'other_apartment' })
  })

  it('signale un mois hors période et prend le bail le plus proche', () => {
    const leases = [
      lease({ id: 'vieux', signing_date: '2018-01-01', move_in_date: '2018-01-01', move_out_date: '2019-01-01' }),
      lease({ id: 'proche', signing_date: '2023-02-01', move_in_date: '2023-02-01', move_out_date: '2025-10-13' }),
    ]
    expect(resolveLease(row({ year: 2025, month: 11 }), 11, leases)).toMatchObject({ lease: { id: 'proche' }, quality: 'out_of_range' })
    expect(resolveLease(row({ year: 2017, month: 11 }), 11, leases)).toMatchObject({ lease: { id: 'vieux' }, quality: 'out_of_range' })
  })

  it('renvoie null pour un nom inconnu ou un locataire sans bail exploitable', () => {
    const leases = [lease({ id: 'a', apartment_number: '5', move_out_date: '2024-02-01' })]
    expect(resolveLease(row({ name: 'INCONNU' }), 3, leases)).toEqual({ lease: null, quality: null, candidates: 0 })
    expect(resolveLease(row({ apt: '9', month: 6 }), 6, leases)).toEqual({ lease: null, quality: null, candidates: 0 })
  })

  it("reconnaît « BE RDC » comme l'appartement 80", () => {
    const leases = [
      lease({ id: 'apt2', apartment_number: '2', last_names: ['PIOCHELLE'], signing_date: '2016-10-13', move_in_date: '2016-10-13', move_out_date: '2020-07-04' }),
      lease({ id: 'apt80', apartment_number: '80', last_names: ['PIOCHELLE'], signing_date: '2022-10-16', move_in_date: '2022-10-16', move_out_date: '2023-10-27' }),
    ]
    const r = row({ name: 'PIOCHELLE', apt: 'BE RDC', year: 2022, month: 11 })
    expect(resolveLease(r, 11, leases)).toMatchObject({ lease: { id: 'apt80' }, quality: 'exact' })
  })

  it('applique les alias de nom', () => {
    const leases = [lease({ id: 'a', apartment_number: '27', last_names: ['ONEHI LHOTU'] })]
    expect(resolveLease(row({ name: 'LOTHU ONEHI', apt: '27' }), 3, leases).lease?.id).toBe('a')
  })

  it('départage deux baux qui se chevauchent : celui qui couvre le 1er du mois, puis le plus récent', () => {
    const leases = [
      lease({ id: 'ancien', signing_date: '2020-04-23', move_in_date: '2020-04-23', move_out_date: '2022-02-22' }),
      lease({ id: 'renouv', signing_date: '2021-02-23', move_in_date: '2021-02-23', move_out_date: '2021-12-31' }),
    ]
    expect(resolveLease(row({ year: 2021, month: 2 }), 2, leases)).toMatchObject({ lease: { id: 'ancien' }, candidates: 2 })
    expect(resolveLease(row({ year: 2021, month: 3 }), 3, leases)).toMatchObject({ lease: { id: 'renouv' }, candidates: 2 })
  })

  it('départage deux baux en doublon : celui qui a déjà des loyers, sinon le plus petit id', () => {
    const dates = { signing_date: '2025-10-02', move_in_date: '2025-10-02' }
    const avecLoyers = [
      lease({ id: 'a', ...dates, move_out_date: '2025-10-02' }),
      lease({ id: 'b', ...dates, move_out_date: '2026-02-28', existing_rents: 2 }),
    ]
    expect(resolveLease(row({ year: 2025, month: 10 }), 10, avecLoyers).lease?.id).toBe('b')
    const identiques = [lease({ id: 'z', ...dates }), lease({ id: 'c', ...dates })]
    expect(resolveLease(row({ year: 2025, month: 11 }), 11, identiques).lease?.id).toBe('c')
  })
})

describe('buildRentImport', () => {
  const dupont = lease({ id: 'L1' })

  it('produit un loyer payé, sans prorata', () => {
    const { records, warnings } = buildRentImport([row({ year: 2024, month: 2, amount: 247 })], [dupont])
    expect(warnings).toEqual([])
    expect(records).toEqual([{
      lease_id: 'L1',
      year: 2024,
      month: 2,
      amount_expected: 247,
      is_prorata: false,
      prorata_days: null,
      days_in_month: 29,
      amount_received: 247,
      written_off: false,
      received_at: null,
      notes: null,
      source_lines: [2],
    }])
  })

  it('range les lignes non importables dans la bonne liste', () => {
    const result = buildRentImport([
      row({ line: 2, name: 'AIRBNB' }),
      row({ line: 3, amount: 0, description: 'CAUTION' }),
      row({ line: 4, amount: null }),
      row({ line: 7, name: 'INCONNU' }),
    ], [dupont])
    expect(result.records).toEqual([])
    expect(result.skipped.map(s => s.row.line)).toEqual([2, 3, 4])
    expect(result.unmatched.map(r => r.line)).toEqual([7])
  })

  it('importe une ligne IMPAYE comme loyer dû, non encaissé et irrécouvrable', () => {
    const { records } = buildRentImport([
      row({ line: 2, month: 8, amount: 300 }),
      row({ line: 3, month: 9, amount: 300, description: 'IMPAYE' }),
    ], [dupont])
    expect(records[0]).toMatchObject({ month: 8, amount_received: 300, written_off: false, notes: null })
    expect(records[1]).toMatchObject({
      month: 9,
      amount_expected: 300,
      amount_received: null,
      written_off: true,
      notes: WRITTEN_OFF_NOTE,
    })
  })

  it("applique une régularisation négative au montant dû d'un impayé, sans rien encaisser", () => {
    const { records } = buildRentImport([
      row({ line: 2, month: 9, amount: 300, description: 'IMPAYE' }),
      row({ line: 3, month: 9, amount: -100, description: 'Remise' }),
    ], [dupont])
    expect(records[0]).toMatchObject({ amount_expected: 200, amount_received: null, written_off: true })
  })

  it('importe un solde « caution moins loyer » comme loyer du mois, avec une note', () => {
    const l = lease({ id: 'L3', signing_date: '2021-09-10', move_in_date: '2021-09-10', move_out_date: '2022-07-02', rent_including_charges: 450 })
    const { records, warnings } = buildRentImport(
      [row({ year: 2022, month: 7, amount: 40, description: 'CAUTION moins LOYER juil - 1 - DUPONT - juil. 2022' })], [l])
    expect(warnings).toEqual([])
    expect(records[0]).toMatchObject({ year: 2022, month: 7, amount_expected: 40, amount_received: 40, written_off: false, notes: 'loyer juil. 2022' })
  })

  it('garde en note une description qui ne commence pas par LOYER', () => {
    const { records } = buildRentImport([
      row({ month: 1, description: 'Espèces' }),
      row({ month: 2, description: 'LOYER - 1 - DUPONT - févr. 2024' }),
    ], [dupont])
    expect(records.map(r => r.notes)).toEqual(['Espèces', null])
  })

  it('corrige un MOIS hors bail grâce à la description', () => {
    const l = lease({ id: 'L2', signing_date: '2025-08-01', move_in_date: '2025-08-09' })
    const { records, warnings } = buildRentImport(
      [row({ year: 2025, month: 7, description: 'LOYER - 1 - DUPONT - août 2025' })], [l])
    expect(records[0]).toMatchObject({ year: 2025, month: 8 })
    expect(warnings[0].message).toContain('mois 8')
  })

  it('garde le MOIS quand la description ne tombe pas mieux, et le signale', () => {
    const l = lease({ id: 'L2', move_out_date: '2025-10-13' })
    const { records, warnings } = buildRentImport(
      [row({ year: 2025, month: 11, amount: 238, description: 'LOYER - 1 - DUPONT - nov. 2025' })], [l])
    expect(records[0]).toMatchObject({ lease_id: 'L2', month: 11, amount_received: 238 })
    expect(warnings[0].message).toContain('hors période')
  })

  it("signale un rattachement à un autre appartement et un choix entre plusieurs baux", () => {
    const leases = [lease({ id: 'a', apartment_number: '30' }), lease({ id: 'b', apartment_number: '30' })]
    const { records, warnings } = buildRentImport([row({ apt: 'BE RDC' })], leases)
    expect(records[0].lease_id).toBe('a')
    expect(warnings.map(w => w.message).join('\n')).toMatch(/appt 30[\s\S]*2 baux possibles/)
  })

  it('ne garde que le loyer du bail quand le paiement inclut la caution', () => {
    const { records } = buildRentImport(
      [row({ amount: 870, description: 'LOYER ET CAUTION - 1 - DUPONT - mars 2024' })], [dupont])
    expect(records[0]).toMatchObject({ amount_expected: 500, amount_received: 500, notes: 'Paiement de 870 € caution incluse' })
  })

  it('laisse intact un « loyer + caution » qui ne dépasse pas le loyer du bail', () => {
    const { records } = buildRentImport(
      [row({ amount: 335, description: 'LOYER + CAUTION - 1 - DUPONT - mars 2024' })], [dupont])
    expect(records[0]).toMatchObject({ amount_received: 335, notes: null })
  })

  it('départage deux paiements du même mois avec la description', () => {
    const { records } = buildRentImport([
      row({ line: 2, month: 10, description: 'LOYER - 1 - DUPONT - oct. 2024' }),
      row({ line: 3, month: 10, description: 'LOYER - 1 - DUPONT - nov. 2024' }),
    ], [dupont])
    expect(records.map(r => [r.month, r.source_lines])).toEqual([[10, [2]], [11, [3]]])
  })

  it("reporte en cascade un loyer payé d'avance, y compris sur l'année suivante", () => {
    const { records, warnings } = buildRentImport([
      row({ line: 2, year: 2024, month: 11, amount: 39 }),
      row({ line: 3, year: 2024, month: 11, amount: 400 }),
      row({ line: 4, year: 2024, month: 12, amount: 401 }),
      row({ line: 5, year: 2025, month: 1, amount: 402 }),
      row({ line: 6, year: 2025, month: 4, amount: 403 }),
    ], [dupont])
    expect(records.map(r => [r.year, r.month, r.amount_received])).toEqual([
      [2024, 11, 39], [2024, 12, 400], [2025, 1, 401], [2025, 2, 402], [2025, 4, 403],
    ])
    expect(records[2].days_in_month).toBe(31)
    expect(warnings).toHaveLength(3)
  })

  it("écarte un loyer payé d'avance qui déborde sur 2026", () => {
    const { records, skipped } = buildRentImport([
      row({ line: 2, year: 2025, month: 11 }),
      row({ line: 3, year: 2025, month: 11 }),
      row({ line: 4, year: 2025, month: 12 }),
    ], [dupont])
    expect(records.map(r => [r.year, r.month])).toEqual([[2025, 11], [2025, 12]])
    expect(skipped).toHaveLength(1)
    expect(skipped[0].row.line).toBe(4)
    expect(skipped[0].reason).toContain('2026-01')
  })

  it('déduit une régularisation négative du loyer du même mois', () => {
    const { records } = buildRentImport([
      row({ line: 2, month: 2, amount: 400 }),
      row({ line: 3, month: 2, amount: -240, description: 'Remboursement trop perçu prorata février' }),
    ], [dupont])
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      amount_expected: 160,
      amount_received: 160,
      notes: '2 lignes cumulées : 400 - 240 € — Remboursement trop perçu prorata février',
      source_lines: [2, 3],
    })
  })

  it("n'importe pas un loyer intégralement remboursé", () => {
    const { records, skipped } = buildRentImport([
      row({ line: 2, amount: 450 }),
      row({ line: 3, amount: -450, description: 'REMBOURSEMENT CAUTION + LOYER TROP PERCU' }),
    ], [dupont])
    expect(records).toEqual([])
    expect(skipped.map(s => s.row.line)).toEqual([2, 3])
  })

  it('suit un locataire à travers ses baux successifs', () => {
    const leases = [
      lease({ id: 'apt14', apartment_number: '14', move_out_date: '2024-10-03' }),
      lease({ id: 'apt23', apartment_number: '23', signing_date: '2024-10-04', move_in_date: '2024-10-04' }),
    ]
    const { records } = buildRentImport([
      row({ line: 2, apt: '14', month: 9 }),
      row({ line: 3, apt: '23', month: 10 }),
    ], leases)
    expect(records.map(r => r.lease_id)).toEqual(['apt14', 'apt23'])
  })
})
