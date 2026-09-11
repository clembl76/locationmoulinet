'use client'

import { useMemo } from 'react'
import type { CaMonthRow } from '@/lib/adminData'
import { MONTHS_SHORT } from '@/lib/monthLabels'

export const BUILDING_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#14b8a6',
]

function fmtEur(v: number): string {
  return `${Math.round(v).toLocaleString('fr-FR')} €`
}

function fmtAxis(v: number): string {
  return v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v)
}

// Graphique construit en HTML/CSS (flexbox + pourcentages) plutôt qu'en SVG. Deux essais SVG
// précédents ont échoué : `calc()` en attribut de présentation SVG (x/width sur <rect>) n'est
// pas fiable selon les navigateurs (les barres retombaient à x invalide, collées à gauche), et
// `viewBox` + `preserveAspectRatio="none"` pour rendre ça responsive déformait tout le rendu
// (étirement non uniforme dès que la largeur réelle du conteneur diffère du viewBox). Les
// pourcentages CSS sur des éléments HTML n'ont aucun de ces deux problèmes.
const CHART_H = 180
const BAR_GAP = 4
// Marge au-dessus des barres pour que l'étiquette de valeur de la barre la plus haute
// (juste au-dessus) ne soit jamais rognée par un ancêtre qui recalcule overflow-y en "auto"
// (cas de la div overflow-x-auto qui enveloppe le graphique).
const TOP_PAD = 14
const LEFT_MARGIN = 40
const MIN_WIDTH = 480

export default function CaBarChartClient({
  data,
  mode,
  selectedBuildings,
}: {
  data: CaMonthRow[]
  mode: 'cc' | 'hc'
  selectedBuildings: Set<string>
}) {
  const buildings = useMemo(() => {
    const names = new Set<string>()
    for (const row of data) names.add(row.building)
    return Array.from(names).sort()
  }, [data])

  const bars = useMemo(() => {
    return MONTHS_SHORT.map((_, mi) => {
      const monthNum = mi + 1
      const segments = buildings
        .filter(b => selectedBuildings.has(b))
        .map(b => {
          const row = data.find(r => r.month === monthNum && r.building === b)
          return { building: b, value: row ? (mode === 'cc' ? row.ca_cc : row.ca_hc) : 0 }
        })
        .filter(s => s.value > 0)
      const total = segments.reduce((s, seg) => s + seg.value, 0)
      return { month: monthNum, segments, total }
    })
  }, [data, buildings, selectedBuildings, mode])

  const maxValue = useMemo(() => Math.max(...bars.map(b => b.total), 1), [bars])
  const ytd = useMemo(() => bars.reduce((s, b) => s + b.total, 0), [bars])

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-xs text-gray-400">
          YTD{' '}:{' '}
          <span className="text-blue-dark font-semibold text-sm">{fmtEur(ytd)}</span>
          <span className="ml-1 text-gray-300">({mode === 'cc' ? 'CC' : 'HC'})</span>
        </p>
        {buildings.length > 1 && (
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {buildings.map((b, i) => (
              <span key={b} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: BUILDING_COLORS[i % BUILDING_COLORS.length] }} />
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: MIN_WIDTH, paddingTop: TOP_PAD }} className="flex">
          {/* Colonne échelle Y — largeur fixe, jamais recouverte par les barres */}
          <div className="relative flex-shrink-0" style={{ width: LEFT_MARGIN, height: CHART_H }}>
            {yTicks.map(frac => (
              <span
                key={frac}
                className="absolute text-[9px] text-gray-400 leading-none"
                style={{ right: 6, top: CHART_H * (1 - frac) - 5 }}
              >
                {fmtAxis(Math.round(maxValue * frac))}
              </span>
            ))}
          </div>

          {/* Colonne graphique — largeur flexible (remplit le conteneur, jamais étirée) */}
          <div className="flex-1 min-w-0">
            <div className="relative" style={{ height: CHART_H }}>
              {/* Lignes de grille */}
              {yTicks.map(frac => (
                <div
                  key={frac}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: CHART_H * (1 - frac) }}
                />
              ))}
              {/* Ligne de base */}
              <div className="absolute left-0 right-0 border-t border-gray-200" style={{ top: CHART_H }} />

              {/* Barres */}
              {bars.map((bar, mi) => {
                let cumulH = 0
                return (
                  <div
                    key={bar.month}
                    className="absolute top-0"
                    style={{ left: `${(mi / 12) * 100}%`, width: `${100 / 12}%`, height: CHART_H }}
                  >
                    <div className="relative h-full" style={{ marginLeft: BAR_GAP / 2, marginRight: BAR_GAP / 2 }}>
                      {bar.segments.map((seg, si) => {
                        const bIdx = buildings.indexOf(seg.building)
                        const color = BUILDING_COLORS[bIdx % BUILDING_COLORS.length]
                        const barH = Math.max((seg.value / maxValue) * CHART_H, seg.value > 0 ? 2 : 0)
                        const bottom = cumulH
                        cumulH += barH
                        return (
                          <div
                            key={si}
                            className="absolute left-0 right-0 rounded-sm"
                            style={{ bottom, height: barH, background: color }}
                          />
                        )
                      })}
                      {bar.total > 0 && (
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-[8px] text-gray-500 whitespace-nowrap"
                          style={{ bottom: (bar.total / maxValue) * CHART_H + 3 }}
                        >
                          {fmtAxis(bar.total)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Libellés des mois */}
            <div className="flex mt-1">
              {MONTHS_SHORT.map((m, mi) => (
                <div key={mi} className="flex-1 text-center text-[10px] text-gray-400">
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
