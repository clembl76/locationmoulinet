'use client'

import { useState, useTransition, useEffect } from 'react'
import type { ApartmentWithLease } from '@/lib/adminData'
import { generateQuittancesForMonthsAction, getRentsForYearAction } from '@/app/admin/payments/quittancesActions'

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type RentInfo = { month: number; amount_expected: number; amount_received: number | null; is_prorata: boolean }
type MonthResult = { month: number; ok: boolean; filename?: string; error?: string }

function fmtAmount(r: RentInfo) {
  const amount = r.amount_received ?? r.amount_expected
  return `${amount.toFixed(0)} €${r.is_prorata ? ' (prorata)' : ''}`
}

export default function QuittancesGenerator({ apartments }: { apartments: ApartmentWithLease[] }) {
  const now = new Date()
  const [leaseId, setLeaseId]       = useState(apartments[0]?.lease_id ?? '')
  const [aptNumber, setAptNumber]   = useState(apartments[0]?.apartment_number ?? '')
  const [year, setYear]             = useState(now.getFullYear())
  const [rents, setRents]           = useState<RentInfo[]>([])
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [results, setResults]       = useState<MonthResult[] | null>(null)
  const [loadingRents, setLoadingRents] = useState(false)
  const [pending, startTransition]  = useTransition()

  useEffect(() => {
    if (!leaseId) return
    setSelected(new Set())
    setResults(null)
    setLoadingRents(true)
    getRentsForYearAction(leaseId, year).then(r => {
      setRents(r)
      setLoadingRents(false)
    })
  }, [leaseId, year])

  function toggleMonth(m: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(m) ? next.delete(m) : next.add(m)
      return next
    })
  }

  function toggleAll() {
    const available = rents.map(r => r.month)
    if (selected.size === available.length) setSelected(new Set())
    else setSelected(new Set(available))
  }

  function handleGenerate() {
    if (selected.size === 0) return
    setResults(null)
    startTransition(async () => {
      const res = await generateQuittancesForMonthsAction(leaseId, aptNumber, year, Array.from(selected).sort())
      setResults(res)
    })
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Générer des quittances</h2>

      {/* Sélecteurs appartement + année */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Appartement
          </label>
          <select
            value={leaseId}
            onChange={e => {
              const apt = apartments.find(a => a.lease_id === e.target.value)
              setLeaseId(e.target.value)
              setAptNumber(apt?.apartment_number ?? '')
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
          >
            {apartments.map(a => (
              <option key={a.lease_id} value={a.lease_id}>
                Apt {a.apartment_number} — {a.tenant_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Année
          </label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Sélection des mois */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mois</span>
          {rents.length > 0 && (
            <button onClick={toggleAll} className="text-xs text-blue-primary hover:underline">
              {selected.size === rents.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
          )}
        </div>

        {loadingRents ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : rents.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun loyer enregistré pour {year}.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {rents.map(r => {
              const isSelected = selected.has(r.month)
              const monthResult = results?.find(res => res.month === r.month)
              return (
                <button
                  key={r.month}
                  type="button"
                  onClick={() => toggleMonth(r.month)}
                  className={[
                    'text-left px-3 py-2.5 rounded-xl border text-sm transition-all',
                    isSelected
                      ? 'border-blue-primary bg-blue-light text-blue-dark'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-primary/40',
                    monthResult?.ok === true ? 'border-green-300 bg-green-50' : '',
                    monthResult?.ok === false ? 'border-red-200 bg-red-50' : '',
                  ].join(' ')}
                >
                  <p className="font-medium">{MOIS[r.month - 1]}</p>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-primary' : 'text-gray-400'}`}>
                    {fmtAmount(r)}
                  </p>
                  {monthResult?.ok === true && (
                    <p className="text-xs text-green-600 mt-0.5">✓ Brouillon créé</p>
                  )}
                  {monthResult?.ok === false && (
                    <p className="text-xs text-red-500 mt-0.5">{monthResult.error}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bouton */}
      <button
        onClick={handleGenerate}
        disabled={selected.size === 0 || pending}
        className="w-full bg-blue-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending
          ? 'Génération en cours…'
          : selected.size === 0
            ? 'Sélectionner au moins un mois'
            : `Générer ${selected.size} quittance${selected.size > 1 ? 's' : ''}`}
      </button>

      {results && results.every(r => r.ok) && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2">
          ✓ {results.length} brouillon{results.length > 1 ? 's' : ''} Gmail créé{results.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
