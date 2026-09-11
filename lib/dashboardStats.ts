// Fonctions pures pour les indicateurs annuels du tableau de bord, filtrables par
// bâtiment (et par mode CC/HC pour le CA) — sans dépendances externes.

import type { CaMonthRow, OccupationMonthRow, LeaseDurationRow } from './adminData'

/** Somme du CA (CC ou HC) sur les bâtiments sélectionnés, tous mois confondus. */
export function computeCaYtd(
  data: CaMonthRow[],
  mode: 'cc' | 'hc',
  selectedBuildings: Set<string>,
): number {
  return data
    .filter(r => selectedBuildings.has(r.building))
    .reduce((sum, r) => sum + (mode === 'cc' ? r.ca_cc : r.ca_hc), 0)
}

/**
 * Moyenne des taux d'occupation mensuels (somme des bâtiments sélectionnés / mois),
 * arrondie à l'entier — reproduit la logique "moyenne des ratios mensuels" du calcul
 * non filtré (pas un ratio global sur la somme de tous les mois).
 */
export function computeOccupationRate(
  rows: OccupationMonthRow[],
  selectedBuildings: Set<string>,
): number {
  const byMonth = new Map<number, { occupied: number; total: number }>()
  for (const r of rows) {
    if (!selectedBuildings.has(r.building)) continue
    const entry = byMonth.get(r.month) ?? { occupied: 0, total: 0 }
    entry.occupied += r.occupied
    entry.total += r.total
    byMonth.set(r.month, entry)
  }

  const ratios = Array.from(byMonth.values())
    .filter(e => e.total > 0)
    .map(e => (100 * e.occupied) / e.total)

  if (ratios.length === 0) return 0
  return Math.round(ratios.reduce((s, r) => s + r, 0) / ratios.length)
}

/** Durée moyenne d'occupation (en années, arrondie à 1 décimale) sur les bâtiments sélectionnés. */
export function computeAverageDurationYears(
  rows: LeaseDurationRow[],
  selectedBuildings: Set<string>,
  now: Date = new Date(),
): number {
  const filtered = rows.filter(r => selectedBuildings.has(r.building))
  if (filtered.length === 0) return 0

  const durations = filtered.map(r => {
    const start = new Date(r.move_in_date + 'T12:00:00')
    const end = r.move_out_date
      ? new Date(r.move_out_date + 'T12:00:00')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24))
    return days / 365
  })

  const avg = durations.reduce((s, d) => s + d, 0) / durations.length
  return Math.round(avg * 10) / 10
}
