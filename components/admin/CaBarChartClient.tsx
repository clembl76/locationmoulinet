'use client'

import { useState, useMemo } from 'react'
import type { CaMonthRow } from '@/lib/adminData'

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const BUILDING_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#f43f5e',
  '#14b8a6',
]

const BUILDING_TOGGLE_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-teal-50 text-teal-700 border-teal-200',
]

function Toggle({
  active, onClick, children, colorCls,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; colorCls?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
        active
          ? (colorCls ?? 'bg-blue-50 text-blue-700 border-blue-200')
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function fmtEur(v: number): string {
  return `${Math.round(v).toLocaleString('fr-FR')} €`
}

export default function CaBarChartClient({
  data,
  year,
}: {
  data: CaMonthRow[]
  year: number
}) {
  const buildings = useMemo(() => {
    const names = new Set<string>()
    for (const row of data) names.add(row.building)
    return Array.from(names).sort()
  }, [data])

  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(
    () => new Set(buildings)
  )
  const [mode, setMode] = useState<'cc' | 'hc'>('cc')

  function toggleBuilding(b: string) {
    setSelectedBuildings(prev => {
      const next = new Set(prev)
      next.has(b) ? next.delete(b) : next.add(b)
      return next
    })
  }

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

  const CHART_H = 180
  const BAR_GAP = 4

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        CA encaissé — {year}
      </h2>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Affichage</span>
          <Toggle active={mode === 'cc'} onClick={() => setMode('cc')} colorCls="bg-blue-50 text-blue-700 border-blue-200">
            Loyers CC
          </Toggle>
          <Toggle active={mode === 'hc'} onClick={() => setMode('hc')} colorCls="bg-indigo-50 text-indigo-700 border-indigo-200">
            Loyers HC
          </Toggle>
        </div>
        {buildings.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Bâtiment</span>
            {buildings.map((b, i) => (
              <Toggle
                key={b}
                active={selectedBuildings.has(b)}
                onClick={() => toggleBuilding(b)}
                colorCls={BUILDING_TOGGLE_COLORS[i % BUILDING_TOGGLE_COLORS.length]}
              >
                {b}
              </Toggle>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs text-gray-400">
            YTD{'\u00a0'}:{' '}
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
          <div style={{ minWidth: 480 }}>
            <svg width="100%" height={CHART_H + 28} style={{ display: 'block' }}>
              {/* Y-axis grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                const y = CHART_H * (1 - frac)
                const label = Math.round(maxValue * frac)
                return (
                  <g key={frac}>
                    <line x1="36" y1={y} x2="100%" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x="32" y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                      {label >= 1000 ? `${Math.round(label / 100) / 10}k` : label}
                    </text>
                  </g>
                )
              })}

              {/* Bars */}
              {bars.map((bar, mi) => {
                const xPct = (mi / 12) * 100
                return (
                  <g key={bar.month}>
                    <text
                      x={`${xPct + 100 / 24}%`}
                      y={CHART_H + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#9ca3af"
                    >
                      {MONTHS_SHORT[mi]}
                    </text>

                    {(() => {
                      let cumulH = 0
                      return bar.segments.map((seg, si) => {
                        const bIdx = buildings.indexOf(seg.building)
                        const color = BUILDING_COLORS[bIdx % BUILDING_COLORS.length]
                        const barH = Math.max((seg.value / maxValue) * CHART_H, seg.value > 0 ? 2 : 0)
                        const y = CHART_H - cumulH - barH
                        cumulH += barH
                        return (
                          <rect
                            key={si}
                            x={`calc(${xPct}% + ${BAR_GAP / 2}px)`}
                            y={y}
                            width={`calc(${100 / 12}% - ${BAR_GAP}px)`}
                            height={barH}
                            fill={color}
                            rx="2"
                          />
                        )
                      })
                    })()}

                    {bar.total > 0 && (
                      <text
                        x={`${xPct + 100 / 24}%`}
                        y={CHART_H - (bar.total / maxValue) * CHART_H - 3}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#6b7280"
                      >
                        {bar.total >= 1000
                          ? `${Math.round(bar.total / 100) / 10}k`
                          : Math.round(bar.total)}
                      </text>
                    )}
                  </g>
                )
              })}

              <line x1="36" y1={CHART_H} x2="100%" y2={CHART_H} stroke="#e5e7eb" strokeWidth="1" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
