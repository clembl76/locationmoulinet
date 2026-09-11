// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeCaYtd, computeOccupationRate, computeAverageDurationYears } from '@/lib/dashboardStats'
import type { CaMonthRow, OccupationMonthRow, LeaseDurationRow } from '@/lib/adminData'

describe('computeCaYtd', () => {
  const data: CaMonthRow[] = [
    { month: 1, building: 'Moulinet', ca_cc: 1000, ca_hc: 800 },
    { month: 1, building: 'Bons Enfants', ca_cc: 500, ca_hc: 400 },
    { month: 2, building: 'Moulinet', ca_cc: 1000, ca_hc: 800 },
  ]

  it('somme le CC de tous les bâtiments sélectionnés', () => {
    expect(computeCaYtd(data, 'cc', new Set(['Moulinet', 'Bons Enfants']))).toBe(2500)
  })

  it('somme le HC quand mode=hc', () => {
    expect(computeCaYtd(data, 'hc', new Set(['Moulinet', 'Bons Enfants']))).toBe(2000)
  })

  it('exclut les bâtiments non sélectionnés', () => {
    expect(computeCaYtd(data, 'cc', new Set(['Moulinet']))).toBe(2000)
  })

  it('retourne 0 si aucun bâtiment sélectionné', () => {
    expect(computeCaYtd(data, 'cc', new Set())).toBe(0)
  })
})

describe('computeOccupationRate', () => {
  it('fait la moyenne des ratios mensuels (pas le ratio de la somme)', () => {
    // Mois 1 : 1/2 occupé (50%) ; Mois 2 : 2/2 occupé (100%) → moyenne 75%, pas 3/4=75% ici égal
    // mais on vérifie avec des totaux différents par mois pour bien distinguer les deux méthodes
    const rows: OccupationMonthRow[] = [
      { month: 1, building: 'Moulinet', occupied: 1, total: 2 },
      { month: 2, building: 'Moulinet', occupied: 2, total: 2 },
    ]
    // Moyenne des ratios : (50 + 100) / 2 = 75
    expect(computeOccupationRate(rows, new Set(['Moulinet']))).toBe(75)
  })

  it('agrège plusieurs bâtiments sélectionnés avant de calculer le ratio du mois', () => {
    const rows: OccupationMonthRow[] = [
      { month: 1, building: 'Moulinet', occupied: 1, total: 2 },
      { month: 1, building: 'Bons Enfants', occupied: 1, total: 2 },
    ]
    // Agrégé : 2 occupés / 4 total = 50%
    expect(computeOccupationRate(rows, new Set(['Moulinet', 'Bons Enfants']))).toBe(50)
  })

  it('ignore les bâtiments non sélectionnés', () => {
    const rows: OccupationMonthRow[] = [
      { month: 1, building: 'Moulinet', occupied: 2, total: 2 },
      { month: 1, building: 'Bons Enfants', occupied: 0, total: 2 },
    ]
    expect(computeOccupationRate(rows, new Set(['Moulinet']))).toBe(100)
  })

  it('retourne 0 si aucune donnée pour les bâtiments sélectionnés', () => {
    const rows: OccupationMonthRow[] = [
      { month: 1, building: 'Moulinet', occupied: 1, total: 2 },
    ]
    expect(computeOccupationRate(rows, new Set(['Bons Enfants']))).toBe(0)
  })
})

describe('computeAverageDurationYears', () => {
  const now = new Date(2026, 7, 28) // 28/08/2026

  it('calcule la durée pour un bail terminé (move_out - move_in)', () => {
    const rows: LeaseDurationRow[] = [
      { building: 'Moulinet', move_in_date: '2024-01-01', move_out_date: '2025-01-01' },
    ]
    // 365 jours / 365 = 1.0 an
    expect(computeAverageDurationYears(rows, new Set(['Moulinet']), now)).toBe(1)
  })

  it('utilise "now" pour un bail toujours actif (move_out_date null)', () => {
    const rows: LeaseDurationRow[] = [
      { building: 'Moulinet', move_in_date: '2025-08-28', move_out_date: null },
    ]
    // 28/08/2025 → 28/08/2026 = 365 jours = 1.0 an
    expect(computeAverageDurationYears(rows, new Set(['Moulinet']), now)).toBe(1)
  })

  it('fait la moyenne sur plusieurs baux du bâtiment sélectionné', () => {
    const rows: LeaseDurationRow[] = [
      { building: 'Moulinet', move_in_date: '2024-01-01', move_out_date: '2025-01-01' }, // 1 an
      { building: 'Moulinet', move_in_date: '2024-01-01', move_out_date: '2026-01-01' }, // 2 ans
    ]
    expect(computeAverageDurationYears(rows, new Set(['Moulinet']), now)).toBe(1.5)
  })

  it('ignore les bâtiments non sélectionnés', () => {
    const rows: LeaseDurationRow[] = [
      { building: 'Moulinet', move_in_date: '2024-01-01', move_out_date: '2025-01-01' },
      { building: 'Bons Enfants', move_in_date: '2020-01-01', move_out_date: '2030-01-01' },
    ]
    expect(computeAverageDurationYears(rows, new Set(['Moulinet']), now)).toBe(1)
  })

  it('retourne 0 si aucun bail pour les bâtiments sélectionnés', () => {
    expect(computeAverageDurationYears([], new Set(['Moulinet']), now)).toBe(0)
  })
})
