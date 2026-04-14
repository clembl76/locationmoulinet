import { getDashboardStats, getAdminApartments } from '@/lib/adminData'
import GenerateRentsButton from '@/components/admin/GenerateRentsButton'
import SeedTestRentsButton from '@/components/admin/SeedTestRentsButton'
import MoisLoyersClient from '@/components/admin/MoisLoyersClient'

export const dynamic = 'force-dynamic'

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, href,
}: {
  label: string; value: number | string; sub?: string; href?: string
}) {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full ${href ? 'hover:border-blue-primary/40 hover:shadow transition-all' : ''}`}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-blue-dark">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
  return href ? <a href={href} className="block">{inner}</a> : <div>{inner}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MoisEnCours() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mois = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const [stats, apartments] = await Promise.all([
    getDashboardStats(),
    getAdminApartments(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Mois en cours</h1>
        <GenerateRentsButton year={year} month={month} mois={mois} />
      </div>
      <SeedTestRentsButton />

      {/* Occupation */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Occupation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} href="/admin/apartments" />
          <StatCard label="Loués" value={stats.occupied} href="/admin/apartments?status=loue" />
          <StatCard label="Disponibles" value={stats.available} href="/admin/apartments?status=available" />
          <StatCard label="Départ prévu" value={stats.soon} href="/admin/apartments?status=depart" />
        </div>
      </section>

      {/* Loyers du mois */}
      <MoisLoyersClient apartments={apartments} mois={mois} />

      {/* Départs dans 30 jours */}
      {stats.departures.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Départs dans les 30 jours
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {stats.departures.map(d => (
              <div key={d.number} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="font-semibold text-sm text-gray-900">Appt {d.number}</span>
                  <span className="text-sm text-gray-500 ml-2">{d.tenant_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-amber-600">
                    {new Date(d.move_out_date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({d.days_until === 0 ? "aujourd'hui" : `J-${d.days_until}`})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
