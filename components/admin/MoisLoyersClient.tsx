'use client'

import { useState, useMemo } from 'react'
import type { AdminApartment } from '@/lib/adminData'

type OccupationFilter = 'loue' | 'depart' | 'disponible'

function getOccupation(apt: AdminApartment): OccupationFilter {
  if (!apt.lease_id) return 'disponible'
  if (apt.move_out_date) return 'depart'
  return 'loue'
}

function Toggle({
  active, onClick, children, colorCls,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; colorCls: string
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
        active ? colorCls : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function PieChart({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid
  if (total === 0) return <div className="w-28 h-28 rounded-full bg-gray-100" />

  const paidPct = paid / total
  function arc(pct: number, offset: number) {
    if (pct >= 1) return `M 50 50 m 0 -40 a 40 40 0 1 1 -0.001 0 Z`
    const startAngle = (offset - 0.25) * 2 * Math.PI
    const endAngle = (offset + pct - 0.25) * 2 * Math.PI
    const x1 = 50 + 40 * Math.cos(startAngle)
    const y1 = 50 + 40 * Math.sin(startAngle)
    const x2 = 50 + 40 * Math.cos(endAngle)
    const y2 = 50 + 40 * Math.sin(endAngle)
    const large = pct > 0.5 ? 1 : 0
    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      <path d={arc(paidPct, 0)} fill="#16a34a" />
      <path d={arc(1 - paidPct, paidPct)} fill="#dc2626" />
    </svg>
  )
}

export default function MoisLoyersClient({
  apartments,
  mois,
}: {
  apartments: AdminApartment[]
  mois: string
}) {
  const buildings = useMemo(() => {
    const names = new Set<string>()
    for (const apt of apartments) if (apt.building_short_name) names.add(apt.building_short_name)
    return Array.from(names).sort()
  }, [apartments])

  const [occupation, setOccupation] = useState<Set<OccupationFilter>>(
    new Set(['loue', 'depart', 'disponible'])
  )
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(
    () => new Set(buildings)
  )

  function toggleOcc(v: OccupationFilter) {
    setOccupation(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
  }

  function toggleBuilding(v: string) {
    setSelectedBuildings(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
  }

  const pie = useMemo(() => {
    let amountPaid = 0
    let amountUnpaid = 0
    let countPaid = 0
    let countUnpaid = 0
    for (const apt of apartments) {
      if (!occupation.has(getOccupation(apt))) continue
      if (!selectedBuildings.has(apt.building_short_name)) continue
      if (!apt.lease_id || !apt.has_rent_this_month) continue
      if (apt.paid_this_month) {
        amountPaid += apt.rent_including_charges
        countPaid++
      } else {
        amountUnpaid += apt.rent_including_charges
        countUnpaid++
      }
    }
    return { amountPaid, amountUnpaid, countPaid, countUnpaid }
  }, [apartments, occupation, selectedBuildings])

  const grandTotal = pie.amountPaid + pie.amountUnpaid
  const caFormatted = pie.amountPaid.toLocaleString('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  })

  return (
    <section>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Loyers — {mois}
      </h2>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Occupation</span>
          <Toggle active={occupation.has('loue')} onClick={() => toggleOcc('loue')} colorCls="bg-blue-50 text-blue-700 border-blue-200">Loué</Toggle>
          <Toggle active={occupation.has('disponible')} onClick={() => toggleOcc('disponible')} colorCls="bg-green-50 text-green-700 border-green-200">Disponible</Toggle>
          <Toggle active={occupation.has('depart')} onClick={() => toggleOcc('depart')} colorCls="bg-amber-50 text-amber-700 border-amber-200">Départ prévu</Toggle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Bâtiment</span>
          {buildings.map(b => (
            <Toggle
              key={b}
              active={selectedBuildings.has(b)}
              onClick={() => toggleBuilding(b)}
              colorCls="bg-violet-50 text-violet-700 border-violet-200"
            >
              {b}
            </Toggle>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA encaissé */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">CA encaissé — {mois}</p>
          <p className="text-3xl font-bold text-blue-dark">{caFormatted}</p>
          <p className="text-xs text-gray-400 mt-1">
            {pie.countPaid} locataire{pie.countPaid !== 1 ? 's' : ''} ont payé
          </p>
        </div>

        {/* Pie */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8 flex-wrap">
            <PieChart paid={pie.amountPaid} unpaid={pie.amountUnpaid} />
            <div className="space-y-3 flex-1 min-w-[180px]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Encaissé — {pie.amountPaid.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-gray-400">
                    {pie.countPaid} locataire{pie.countPaid > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Non encaissé — {pie.amountUnpaid.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-gray-400">
                    {pie.countUnpaid} locataire{pie.countUnpaid > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {grandTotal > 0 && (
                <p className="text-xs text-gray-300 pt-1">
                  Total attendu : {grandTotal.toLocaleString('fr-FR')} €/mois
                </p>
              )}
            </div>
            <a
              href="/admin/apartments"
              className="ml-auto text-xs text-blue-primary hover:underline flex-shrink-0"
            >
              Voir les appartements →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
