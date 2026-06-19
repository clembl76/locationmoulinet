'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ArchivedLease } from '@/lib/adminData'

export default function ArchivesSection({
  archivedLeases,
}: {
  archivedLeases: ArchivedLease[]
}) {
  const [selectedLeaseId, setSelectedLeaseId] = useState('')
  const router = useRouter()

  function handleOk() {
    if (!selectedLeaseId) return
    const lease = archivedLeases.find(l => l.lease_id === selectedLeaseId)
    if (!lease) return
    router.push(`/admin/apartments/${lease.apartment_number}?lease=${lease.lease_id}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <h2 className="px-5 pt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Archives</h2>
      <div className="px-5 py-4">
        {archivedLeases.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun bail archivé.</p>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={selectedLeaseId}
              onChange={e => setSelectedLeaseId(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-primary"
            >
              <option value="">Sélectionner un bail...</option>
              {archivedLeases.map(l => {
                const name = [l.tenant_first_name, l.tenant_last_name].filter(Boolean).join(' ') || '—'
                const dateStr = l.move_out_date
                  ? new Date(l.move_out_date + 'T12:00:00').toLocaleDateString('fr-FR')
                  : ''
                return (
                  <option key={l.lease_id} value={l.lease_id}>
                    {`Appt ${l.apartment_number} – ${name}${dateStr ? ` – ${dateStr}` : ''}`}
                  </option>
                )
              })}
            </select>
            <button
              onClick={handleOk}
              disabled={!selectedLeaseId}
              className="bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
