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

function DonutChart({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid
  if (total === 0) return <div className="w-28 h-28 rounded-full bg-gray-100" />

  // Le cercle de rayon 15.9 a une circonférence ≈ 100, donc son stroke-dasharray
  // s'exprime directement en pourcentage — pas de trigonométrie, donc aucun risque
  // de dernier chiffre différent entre le rendu serveur et le rendu client.
  const paidPct = Math.round((paid / total) * 1000) / 10
  const restPct = Math.round((1000 - paidPct * 10)) / 10

  return (
    <svg viewBox="0 0 36 36" className="w-28 h-28">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(92% 0.01 150)" strokeWidth="4" />
      <circle
        cx="18" cy="18" r="15.9" fill="none"
        stroke="oklch(55% 0.13 150)" strokeWidth="4"
        strokeDasharray={`${paidPct} ${restPct}`}
        strokeDashoffset="25"
        strokeLinecap="round"
      />
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
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Occupation</span>
          <Toggle active={occupation.has('loue')} onClick={() => toggleOcc('loue')} colorCls="bg-gray-900 text-white border-gray-900">Loué</Toggle>
          <Toggle active={occupation.has('disponible')} onClick={() => toggleOcc('disponible')} colorCls="bg-gray-900 text-white border-gray-900">Disponible</Toggle>
          <Toggle active={occupation.has('depart')} onClick={() => toggleOcc('depart')} colorCls="bg-gray-900 text-white border-gray-900">Départ prévu</Toggle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-28 shrink-0">Bâtiment</span>
          {buildings.map(b => (
            <Toggle
              key={b}
              active={selectedBuildings.has(b)}
              onClick={() => toggleBuilding(b)}
              colorCls="bg-gray-900 text-white border-gray-900"
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
          <p className="text-3xl font-bold text-gray-900">{caFormatted}</p>
          <p className="text-xs text-gray-400 mt-1">
            {pie.countPaid} locataire{pie.countPaid !== 1 ? 's' : ''} ont payé
          </p>
        </div>

        {/* Pie */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8 flex-wrap">
            <DonutChart paid={pie.amountPaid} unpaid={pie.amountUnpaid} />
            <div className="space-y-3 flex-1 min-w-[180px]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: 'oklch(55% 0.13 150)' }} />
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
                <span className="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0" />
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
              className="ml-auto text-xs text-teal hover:underline flex-shrink-0"
            >
              Voir les appartements →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
