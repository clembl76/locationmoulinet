import {
  getLettingKpis,
  getLettingApartments,
  getRecentCandidates,
  getRecentVisits,
} from '@/lib/adminData'
import LettingTable from './LettingTable'
import VisitsTable from './VisitsTable'

export const dynamic = 'force-dynamic'

function KpiCard({
  label, value, sub,
}: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function MiseEnLocationPage() {
  const [kpis, apartments, candidates, visits] = await Promise.all([
    getLettingKpis(),
    getLettingApartments(),
    getRecentCandidates(),
    getRecentVisits(),
  ])

  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mise en location</h1>
        <div className="flex gap-3 text-sm">
          <a href="/visiter" target="_blank" rel="noopener noreferrer"
            className="text-blue-primary hover:underline">
            Page visiter →
          </a>
          <span className="text-gray-300">|</span>
          <a href="/candidater" target="_blank" rel="noopener noreferrer"
            className="text-blue-primary hover:underline">
            Page candidater →
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Visites en attente"
          value={kpis.pending_visits}
          sub={`${kpis.total_visits} au total`}
        />
        <KpiCard
          label="Candidatures nouvelles"
          value={kpis.pending_applications}
          sub={`${kpis.total_applications} au total`}
        />
        <KpiCard
          label="Appt. disponibles"
          value={apartments.filter(a => a.status === 'available').length}
        />
        <KpiCard
          label="Appt. prochainement libres"
          value={apartments.filter(a => a.status === 'coming_soon').length}
        />
      </div>

      {/* Appartements + candidatures (accordion) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Appartements mis en location
          <span className="ml-2 text-sm font-normal text-gray-400">
            — cliquez sur une ligne pour voir les candidatures
          </span>
        </h2>
        <LettingTable apartments={apartments} candidates={candidates} />
      </section>

      {/* Visites */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Visites
          {visits.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">{visits.length}</span>
          )}
        </h2>
        <VisitsTable visits={visits} />
      </section>

    </div>
  )
}
