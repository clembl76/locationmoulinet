import { getAdminVisitors } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
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

export default async function AdminVisitorsPage() {
  const visitors = await getAdminVisitors()

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visites</h1>
        <span className="text-sm text-gray-400">{visitors.length} demande{visitors.length !== 1 ? 's' : ''}</span>
      </div>

      {visitors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">Aucune demande de visite pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Visiteur</th>
                  <th className="text-left px-4 py-3">Contact</th>
                  <th className="text-left px-4 py-3">Date souhaitée</th>
                  <th className="text-left px-4 py-3">Appartements</th>
                  <th className="text-left px-4 py-3">Durée</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Reçu le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visitors.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-gray-900">
                        {v.first_name} {v.last_name.toUpperCase()}
                      </p>
                      {v.comments && (
                        <p className="text-xs text-gray-400 mt-0.5 max-w-xs line-clamp-2">{v.comments}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {v.email && (
                        <a href={`mailto:${v.email}`} className="text-blue-primary hover:underline block">
                          {v.email}
                        </a>
                      )}
                      {v.phone && <span className="text-gray-500 text-xs">{v.phone}</span>}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <p className="font-medium text-gray-800">{fmt(v.visit_date)}</p>
                      {v.visit_time && (
                        <p className="text-xs text-gray-400">{v.visit_time.slice(0, 5)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-600">
                      {v.apartment_numbers}
                    </td>
                    <td className="px-4 py-3 align-top text-gray-500 whitespace-nowrap">
                      {v.desired_duration_months ? `${v.desired_duration_months} mois` : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[v.status] ?? v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-gray-400 whitespace-nowrap">
                      {fmt(v.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
