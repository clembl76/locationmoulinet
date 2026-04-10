'use client'

import { useState, Fragment } from 'react'
import type { LettingApartment, LettingCandidate } from '@/lib/adminData'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Nouvelle',
  accepted:  'Acceptée',
  rejected:  'Rejetée',
  withdrawn: 'Plus intéressé',
  signed:    'Bail signé',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-blue-50 text-blue-700',
  accepted:  'bg-green-50 text-green-700',
  rejected:  'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  signed:    'bg-green-100 text-green-800',
}

export default function LettingTable({
  apartments,
  candidates,
}: {
  apartments: LettingApartment[]
  candidates: LettingCandidate[]
}) {
  const [openApt, setOpenApt] = useState<string | null>(null)

  // Group candidates by apartment number
  const byApt = new Map<string, LettingCandidate[]>()
  for (const c of candidates) {
    if (!byApt.has(c.apartment_number)) byApt.set(c.apartment_number, [])
    byApt.get(c.apartment_number)!.push(c)
  }

  if (apartments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-gray-400 text-sm">Aucun appartement disponible.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <th className="text-left px-4 py-3">Appartement</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-left px-4 py-3">Disponible le</th>
            <th className="text-right px-4 py-3">Visites</th>
            <th className="text-right px-4 py-3">Candidatures</th>
            <th className="w-8 px-2 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {apartments.map(apt => {
            const isOpen = openApt === apt.number
            const aptCandidates = byApt.get(apt.number) ?? []
            const hasCandidates = aptCandidates.length > 0

            return (
              <Fragment key={apt.id}>
                <tr
                  onClick={() => hasCandidates && setOpenApt(isOpen ? null : apt.number)}
                  className={`border-t border-gray-50 transition-colors ${hasCandidates ? 'cursor-pointer hover:bg-gray-50/70' : ''} ${isOpen ? 'bg-blue-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      Apt n°{apt.number}
                      {apt.floor_label && <span className="font-normal text-gray-400"> · {apt.floor_label}</span>}
                    </p>
                    <p className="text-xs text-gray-400">{apt.building_short_name} · {apt.rent_including_charges} €/mois CC</p>
                  </td>
                  <td className="px-4 py-3">
                    {apt.status === 'available' ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">Disponible</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">Prochainement</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {apt.status === 'available' ? 'Maintenant' : fmtDate(apt.available_from)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${Number(apt.visit_count) > 0 ? 'text-blue-primary' : 'text-gray-300'}`}>
                      {apt.visit_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-semibold ${Number(apt.candidate_count) > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                      {apt.candidate_count}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-gray-400 text-xs text-center">
                    {hasCandidates && (
                      <span className="select-none">{isOpen ? '▲' : '▼'}</span>
                    )}
                  </td>
                </tr>

                {/* Candidatures expandables */}
                {isOpen && aptCandidates.length > 0 && (
                  <tr key={`${apt.id}-candidates`}>
                    <td colSpan={6} className="px-0 py-0 bg-blue-50/20 border-t border-blue-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-blue-100">
                            <th className="text-left pl-10 pr-4 py-2">Candidat</th>
                            <th className="text-left px-4 py-2">Contact</th>
                            <th className="text-left px-4 py-2">Date souhaitée</th>
                            <th className="text-left px-4 py-2">Garant</th>
                            <th className="text-left px-4 py-2">Statut</th>
                            <th className="text-left px-4 py-2">Reçu le</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {aptCandidates.map(c => (
                            <tr key={c.application_id} className="border-t border-blue-50 hover:bg-blue-50/40">
                              <td className="pl-10 pr-4 py-2.5 font-medium text-gray-900">
                                {c.first_name} {c.last_name.toUpperCase()}
                              </td>
                              <td className="px-4 py-2.5">
                                {c.email && (
                                  <a href={`mailto:${c.email}`} className="text-blue-primary hover:underline text-xs block" onClick={e => e.stopPropagation()}>
                                    {c.email}
                                  </a>
                                )}
                                {c.phone && <span className="text-gray-400 text-xs">{c.phone}</span>}
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                                {fmtDate(c.desired_signing_date)}
                              </td>
                              <td className="px-4 py-2.5">
                                {c.has_guarantor
                                  ? <span className="text-xs text-green-700 font-medium">Oui</span>
                                  : <span className="text-xs text-gray-400">Non</span>
                                }
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {STATUS_LABELS[c.status] ?? c.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                                {fmtDate(c.created_at)}
                              </td>
                              <td className="px-4 py-2.5">
                                <a
                                  href={`/admin/mise-en-location/candidats/${c.application_id}`}
                                  className="text-xs text-blue-primary hover:underline whitespace-nowrap"
                                  onClick={e => e.stopPropagation()}
                                >
                                  Détail →
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
