'use client'

import { useState, useTransition } from 'react'
import type { LettingVisit } from '@/lib/adminData'
import { deleteVisitAction } from './visitsActions'

const PAGE_SIZE = 5

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'En attente',
  confirmed: 'Confirmée',
  done:      'Effectuée',
  cancelled: 'Annulée',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  done:      'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function VisitsTable({ visits: initialVisits }: { visits: LettingVisit[] }) {
  const [visits, setVisits] = useState(initialVisits)
  const [page, setPage] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const totalPages = Math.ceil(visits.length / PAGE_SIZE)
  const pageVisits = visits.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleDelete(visit: LettingVisit) {
    const ok = window.confirm(
      `Supprimer la visite de ${visit.first_name} ${visit.last_name.toUpperCase()} ?\n\nCette action est irréversible.`
    )
    if (!ok) return

    setError(null)
    setDeletingId(visit.id)
    startTransition(async () => {
      const result = await deleteVisitAction(visit.id)
      setDeletingId(null)
      if (!result.ok) {
        setError(result.error ?? 'Erreur lors de la suppression')
        return
      }
      setVisits(prev => {
        const next = prev.filter(v => v.id !== visit.id)
        const lastPage = Math.max(0, Math.ceil(next.length / PAGE_SIZE) - 1)
        setPage(p => Math.min(p, lastPage))
        return next
      })
    })
  }

  if (visits.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">Aucune visite.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-4 py-3">Visiteur</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Date souhaitée</th>
              <th className="text-left px-4 py-3">Appartements</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageVisits.map(v => (
              <tr key={v.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {v.first_name} {v.last_name.toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <a href={`mailto:${v.email}`} className="text-blue-primary hover:underline text-xs block">
                    {v.email}
                  </a>
                  {v.phone && <span className="text-gray-400 text-xs">{v.phone}</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="font-medium text-gray-800">{fmtDate(v.visit_date)}</p>
                  {v.visit_time && <p className="text-xs text-gray-400">{v.visit_time.slice(0, 5)}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{v.apartment_numbers}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[v.status] ?? v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleDelete(v)}
                    disabled={deletingId === v.id}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                    title="Supprimer la visite"
                  >
                    {deletingId === v.id ? '…' : '✕'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="px-4 py-2 text-xs text-red-500 border-t border-gray-100">{error}</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visits.length)} sur {visits.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >
              ‹ Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
            >
              Suivant ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
