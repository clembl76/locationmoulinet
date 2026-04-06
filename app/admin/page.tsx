import { getDashboardStats } from '@/lib/adminData'
import GenerateRentsButton from '@/components/admin/GenerateRentsButton'
import SeedTestRentsButton from '@/components/admin/SeedTestRentsButton'

export const dynamic = 'force-dynamic'

// ─── Stat cards ───────────────────────────────────────────────────────────────

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

// ─── Pie chart SVG ────────────────────────────────────────────────────────────

function PieChart({ paid, unpaid }: { paid: number; unpaid: number }) {
  const total = paid + unpaid
  if (total === 0) return <div className="w-28 h-28 rounded-full bg-gray-100" />

  const paidPct = paid / total
  // SVG arc path for a slice starting at top (−90°)
  function arc(pct: number, offset: number) {
    if (pct >= 1) return `M 50 50 m 0 -40 a 40 40 0 1 1 -0.001 0 Z`
    const startAngle = (offset - 0.25) * 2 * Math.PI
    const endAngle = (offset + pct - 0.25) * 2 * Math.PI
    const x1 = 50 + 40 * Math.cos(startAngle)
    const y1 = 50 + 40 * Math.sin(startAngle)
    const x2 = 50 + 40 * Math.cos(endAngle)
    const y2 = 50 + 40 * Math.sin(endAngle)
    const large = pct > 0.5 ? 1 : 0
    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-0">
      <path d={arc(paidPct, 0)} fill="#16a34a" />
      <path d={arc(1 - paidPct, paidPct)} fill="#dc2626" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mois = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const annee = year

  const caFormatted = stats.caYtd.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const paidTotal = stats.paymentPie.amountPaid
  const unpaidTotal = stats.paymentPie.amountUnpaid
  const grandTotal = paidTotal + unpaidTotal

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <GenerateRentsButton year={year} month={month} mois={mois} />
      </div>
      <SeedTestRentsButton />

      {/* Occupation */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Occupation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} href="/admin/apartments" />
          <StatCard label="Loués" value={stats.occupied} href="/admin/apartments?status=loue" />
          <StatCard label="Départ prévu" value={stats.soon} href="/admin/apartments?status=depart" />
          <StatCard label="Disponibles" value={stats.available} href="/admin/apartments?status=available" />
        </div>
      </section>

      {/* KPIs annuels */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Indicateurs {annee}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="CA encaissé YTD" value={caFormatted} />
          <StatCard
            label="Taux d'occupation moyen"
            value={`${stats.tauxOccupationMoyen} %`}
            sub="Moyenne mensuelle depuis janvier"
          />
          <StatCard
            label="Durée moy. d'occupation"
            value={`${stats.dureeMoyenneAns} ans`}
            sub="Tous baux confondus"
          />
        </div>
      </section>

      {/* Loyers du mois — camembert */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Loyers — {mois}
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-8 flex-wrap">
            <PieChart paid={paidTotal} unpaid={unpaidTotal} />
            <div className="space-y-3 flex-1 min-w-[180px]">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Encaissé — {paidTotal.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-gray-400">{stats.paymentPie.countPaid} locataire{stats.paymentPie.countPaid > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Non encaissé — {unpaidTotal.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-gray-400">{stats.paymentPie.countUnpaid} locataire{stats.paymentPie.countUnpaid > 1 ? 's' : ''}</p>
                </div>
              </div>
              {grandTotal > 0 && (
                <p className="text-xs text-gray-300 pt-1">
                  Total attendu : {grandTotal.toLocaleString('fr-FR')} €/mois
                </p>
              )}
            </div>
            <a
              href="/admin/apartments"
              className="ml-auto text-xs text-blue-primary hover:underline flex-shrink-0"
            >
              Voir les appartements →
            </a>
          </div>
        </div>
      </section>

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
