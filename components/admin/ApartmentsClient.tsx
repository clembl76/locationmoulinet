'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminApartment } from '@/lib/adminData'

// ─── Types ────────────────────────────────────────────────────────────────────

type OccupationFilter = 'loue' | 'depart' | 'disponible'
type PaymentFilter = 'encaisse' | 'non_encaisse'
type SortKey = 'number' | 'tenant' | 'status' | 'payment' | 'price'
type SortDir = 'asc' | 'desc'

function getOccupation(apt: AdminApartment): OccupationFilter {
  if (!apt.lease_id) return 'disponible'
  if (apt.move_out_date) return 'depart'
  return 'loue'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PaymentBadge({ apt }: { apt: AdminApartment }) {
  if (!apt.lease_id || !apt.has_rent_this_month) return <span className="text-xs text-gray-300">—</span>
  return apt.paid_this_month
    ? <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Encaissé</span>
    : <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Non encaissé</span>
}

function StatusBadge({ apt }: { apt: AdminApartment }) {
  const occ = getOccupation(apt)
  if (occ === 'disponible')
    return <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Disponible</span>
  if (occ === 'depart') {
    const d = new Date(apt.move_out_date!).toLocaleDateString('fr-FR')
    return <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Départ {d}</span>
  }
  return <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Loué</span>
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

function SortArrow({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <span className="text-gray-200 ml-1">↕</span>
  return <span className="text-blue-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApartmentsClient({
  apartments,
  initialStatus,
  mois,
}: {
  apartments: AdminApartment[]
  initialStatus: string | null
  mois: string
}) {
  const initialOccupation: Set<OccupationFilter> =
    initialStatus === 'available' ? new Set<OccupationFilter>(['disponible'])
    : initialStatus === 'loue' ? new Set<OccupationFilter>(['loue'])
    : initialStatus === 'depart' ? new Set<OccupationFilter>(['depart'])
    : new Set<OccupationFilter>(['loue', 'depart', 'disponible'])

  const router = useRouter()

  const [occupation, setOccupation] = useState<Set<OccupationFilter>>(initialOccupation)
  const [payment, setPayment] = useState<Set<PaymentFilter>>(new Set(['encaisse', 'non_encaisse']))
  const [sortKey, setSortKey] = useState<SortKey>('number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Quand le navigateur restaure la page depuis le bfcache (bouton retour),
  // forcer un rechargement serveur pour que les données soient à jour et
  // que les handlers React soient correctement rattachés.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [router])

  function toggleOcc(v: OccupationFilter) {
    setOccupation(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
  }

  function togglePay(v: PaymentFilter) {
    setPayment(prev => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    const filtered = apartments.filter(apt => {
      const occ = getOccupation(apt)
      if (!occupation.has(occ)) return false
      // Filtre paiement : seulement si un loyer a été généré pour ce mois
      if (apt.lease_id && apt.has_rent_this_month) {
        const paid: PaymentFilter = apt.paid_this_month ? 'encaisse' : 'non_encaisse'
        if (!payment.has(paid)) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'number') cmp = parseInt(a.number) - parseInt(b.number)
      else if (sortKey === 'tenant') {
        const na = a.tenant_last_name ?? ''
        const nb = b.tenant_last_name ?? ''
        cmp = na.localeCompare(nb, 'fr')
      } else if (sortKey === 'status') {
        const order: Record<OccupationFilter, number> = { loue: 0, depart: 1, disponible: 2 }
        cmp = order[getOccupation(a)] - order[getOccupation(b)]
      } else if (sortKey === 'payment') {
        cmp = (a.paid_this_month ? 0 : 1) - (b.paid_this_month ? 0 : 1)
      } else if (sortKey === 'price') {
        cmp = a.rent_including_charges - b.rent_including_charges
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [apartments, occupation, payment, sortKey, sortDir])

  const thCls = 'text-left px-5 py-3 font-semibold cursor-pointer select-none hover:text-gray-700 transition-colors'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appartements</h1>
        <span className="text-sm text-gray-400">{displayed.length} / {apartments.length}</span>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Occupation</span>
          <Toggle active={occupation.has('loue')} onClick={() => toggleOcc('loue')} colorCls="bg-blue-50 text-blue-700 border-blue-200">Loué</Toggle>
          <Toggle active={occupation.has('disponible')} onClick={() => toggleOcc('disponible')} colorCls="bg-green-50 text-green-700 border-green-200">Disponible</Toggle>
          <Toggle active={occupation.has('depart')} onClick={() => toggleOcc('depart')} colorCls="bg-amber-50 text-amber-700 border-amber-200">Départ prévu</Toggle>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Loyer {mois}</span>
          <Toggle active={payment.has('encaisse')} onClick={() => togglePay('encaisse')} colorCls="bg-green-50 text-green-700 border-green-200">Encaissé</Toggle>
          <Toggle active={payment.has('non_encaisse')} onClick={() => togglePay('non_encaisse')} colorCls="bg-red-50 text-red-600 border-red-200">Non encaissé</Toggle>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
              <th className={thCls} onClick={() => handleSort('number')}>
                Appt <SortArrow col="number" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls} onClick={() => handleSort('tenant')}>
                Locataire <SortArrow col="tenant" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden md:table-cell`} onClick={() => handleSort('status')}>
                Statut <SortArrow col="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls} onClick={() => handleSort('payment')}>
                Loyer {mois} <SortArrow col="payment" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} text-right hidden sm:table-cell`} onClick={() => handleSort('price')}>
                CC/mois <SortArrow col="price" sortKey={sortKey} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                  Aucun appartement ne correspond aux filtres.
                </td>
              </tr>
            ) : displayed.map(apt => (
              <tr
                key={apt.id}
                onClick={() => router.push(`/admin/apartments/${apt.number}`)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-5 py-3 font-bold text-blue-dark">{apt.number}</td>
                <td className="px-5 py-3 text-gray-700">
                  {apt.tenant_last_name
                    ? `${apt.tenant_first_name ?? ''} ${apt.tenant_last_name}`.trim()
                    : <span className="text-gray-300 italic">Vacant</span>
                  }
                </td>
                <td className="px-5 py-3 hidden md:table-cell"><StatusBadge apt={apt} /></td>
                <td className="px-5 py-3"><PaymentBadge apt={apt} /></td>
                <td className="px-5 py-3 text-right text-gray-500 hidden sm:table-cell">
                  {apt.rent_including_charges} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
