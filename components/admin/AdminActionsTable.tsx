'use client'

import { useState, useMemo } from 'react'
import type { AdminAction, AdminActionOwner } from '@/lib/adminData'

const OWNER_LABELS: Record<AdminActionOwner, string> = {
  proprietaire: 'Propriétaire',
  locataire: 'Locataire',
  candidat: 'Candidat',
}

const OWNER_COLORS: Record<AdminActionOwner, string> = {
  proprietaire: 'bg-blue-100 text-blue-700',
  locataire: 'bg-emerald-100 text-emerald-700',
  candidat: 'bg-violet-100 text-violet-700',
}

function fmtDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SortKey = 'title' | 'apartmentNumber' | 'tenantName' | 'owner' | 'dueDate'
type SortDir = 'asc' | 'desc'

export default function AdminActionsTable({ actions }: { actions: AdminAction[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const today = todayStr()

  const sorted = useMemo(() => {
    const rows = [...actions]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'apartmentNumber') {
        cmp = Number(a.apartmentNumber) - Number(b.apartmentNumber)
      } else if (sortKey === 'owner') {
        cmp = OWNER_LABELS[a.owner].localeCompare(OWNER_LABELS[b.owner])
      } else {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        cmp = av < bv ? -1 : av > bv ? 1 : 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [actions, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        {label}
        {sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune action en attente.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 720 }}>
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="text-left px-4 py-3"><SortBtn col="title" label="Titre" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="apartmentNumber" label="Appartement" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="tenantName" label="Locataire / candidat" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="owner" label="Owner" /></th>
                <th className="text-left px-4 py-3"><SortBtn col="dueDate" label="Date limite" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((a, i) => {
                const isOverdue = a.dueDate.slice(0, 10) < today
                return (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-medium">
                      <a
                        href={a.linkUrl}
                        className="text-blue-primary hover:text-blue-dark underline underline-offset-2"
                      >
                        {a.title}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{a.apartmentNumber}</td>
                    <td className="px-4 py-2.5 text-gray-700">{a.tenantName ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${OWNER_COLORS[a.owner]}`}>
                        {OWNER_LABELS[a.owner]}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {fmtDate(a.dueDate)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
