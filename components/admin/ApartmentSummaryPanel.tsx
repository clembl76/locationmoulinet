'use client'

import { useState, useEffect } from 'react'
import { getLeaseDatesAction, type LeaseDates } from '@/app/admin/inventory/summaryActions'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const sectionTitle = 'text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'

export default function ApartmentSummaryPanel({
  apartmentId: _apartmentId,
  leaseId,
}: {
  apartmentId: string
  leaseId: string
}) {
  const [dates, setDates] = useState<LeaseDates | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getLeaseDatesAction(leaseId).then(d => {
      setDates(d)
      setLoading(false)
    })
  }, [leaseId])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : !dates ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className={sectionTitle}>Entrée</p>
            <p className="text-base font-semibold text-gray-900">
              {formatDate(dates.move_in_date)}
            </p>
          </div>
          <div>
            <p className={sectionTitle}>Sortie</p>
            <p className="text-base font-semibold text-gray-900">
              {formatDate(dates.move_out_date)}
            </p>
          </div>
          <div>
            <p className={sectionTitle}>Caution</p>
            <p className="text-base font-semibold text-gray-900">
              {dates.deposit != null ? `${dates.deposit} €` : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
