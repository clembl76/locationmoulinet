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

export default function AdminActionsTable({ actions }: { actions: AdminAction[] }) {
  const [filterOwner, setFilterOwner] = useState<'' | AdminActionOwner>('')
  const today = todayStr()

  const filtered = useMemo(
    () => filterOwner ? actions.filter(a => a.owner === filterOwner) : actions,
    [actions, filterOwner]
  )

  return (
    <div className="space-y-4">
      <select
        value={filterOwner}
        onChange={e => setFilterOwner(e.target.value as '' | AdminActionOwner)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
      >
        <option value="">Owner (tous)</option>
        <option value="proprietaire">Propriétaire</option>
        <option value="locataire">Locataire</option>
        <option value="candidat">Candidat</option>
      </select>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune action en attente.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 720 }}>
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="text-left px-4 py-3">Titre</th>
                <th className="text-left px-4 py-3">Appartement</th>
                <th className="text-left px-4 py-3">Locataire / candidat</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">Date de création</th>
                <th className="text-left px-4 py-3">Date limite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a, i) => {
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
                    <td className="px-4 py-2.5 text-gray-500">{fmtDate(a.createdAt)}</td>
                    <td className={`px-4 py-2.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                      {fmtDate(a.dueDate)}
                      {isOverdue && <span className="ml-1.5 text-xs">(en retard)</span>}
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
