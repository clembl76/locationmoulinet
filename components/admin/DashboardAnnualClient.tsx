'use client'

import { useMemo, useState } from 'react'
import type { CaMonthRow, OccupationMonthRow, LeaseDurationRow } from '@/lib/adminData'
import { computeCaYtd, computeOccupationRate, computeAverageDurationYears } from '@/lib/dashboardStats'
import CaBarChartClient from './CaBarChartClient'
import StatCard from './StatCard'

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
      type="button"
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

export default function DashboardAnnualClient({
  year,
  caByMonth,
  occupationByMonth,
  leaseDurations,
}: {
  year: number
  caByMonth: CaMonthRow[]
  occupationByMonth: OccupationMonthRow[]
  leaseDurations: LeaseDurationRow[]
}) {
  const buildings = useMemo(() => {
    const names = new Set<string>()
    for (const row of caByMonth) names.add(row.building)
    return Array.from(names).sort()
  }, [caByMonth])

  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(() => new Set(buildings))
  const [mode, setMode] = useState<'cc' | 'hc'>('cc')

  function toggleBuilding(b: string) {
    setSelectedBuildings(prev => {
      const next = new Set(prev)
      next.has(b) ? next.delete(b) : next.add(b)
      return next
    })
  }

  const caYtd = computeCaYtd(caByMonth, mode, selectedBuildings)
  const tauxOccupationMoyen = computeOccupationRate(occupationByMonth, selectedBuildings)
  const dureeMoyenneAns = computeAverageDurationYears(leaseDurations, selectedBuildings)

  const caFormatted = caYtd.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <>
      {/* CA encaissé — filtres partagés avec les Indicateurs ci-dessous */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          CA encaissé — {year}
        </h2>

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

        <CaBarChartClient data={caByMonth} mode={mode} selectedBuildings={selectedBuildings} />
      </section>

      {/* Indicateurs — filtrés par les mêmes bâtiments (le mode CC/HC n'affecte que le CA) */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Indicateurs {year}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="CA encaissé YTD" value={caFormatted} />
          <StatCard
            label="Taux d'occupation moyen"
            value={`${tauxOccupationMoyen} %`}
            sub="Moyenne mensuelle depuis janvier"
          />
          <StatCard
            label="Durée moy. d'occupation"
            value={`${dureeMoyenneAns} ans`}
            sub="Tous baux confondus"
          />
        </div>
      </section>
    </>
  )
}
