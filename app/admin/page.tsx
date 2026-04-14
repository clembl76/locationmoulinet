import { getDashboardStats, getCalendarLeases, getCaByMonth } from '@/lib/adminData'
import type { CalendarLease } from '@/lib/adminData'
import ExportLeasesButton from '@/components/admin/ExportLeasesButton'
import CaBarChartClient from '@/components/admin/CaBarChartClient'

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

// ─── Calendrier occupation ────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const APT_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e',
  '#f59e0b', '#14b8a6', '#6366f1', '#ec4899',
  '#06b6d4', '#f97316', '#84cc16', '#a855f7',
]

type AptSegment = {
  tenantName: string | null
  startPct: number
  widthPct: number
  dashed: boolean
}

type AptGroup = {
  number: string
  segments: AptSegment[]
}

function startDayPct(date: Date, year: number): number {
  const jan1  = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const d = date < jan1 ? jan1 : date > dec31 ? dec31 : date
  const daysInMonth = new Date(year, d.getMonth() + 1, 0).getDate()
  return ((d.getMonth() + (d.getDate() - 1) / daysInMonth) / 12) * 100
}

function endDayPct(date: Date, year: number): number {
  const jan1  = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  const d = date < jan1 ? jan1 : date > dec31 ? dec31 : date
  const daysInMonth = new Date(year, d.getMonth() + 1, 0).getDate()
  return ((d.getMonth() + d.getDate() / daysInMonth) / 12) * 100
}

function buildCalendarRows(raw: CalendarLease[], year: number): AptGroup[] {
  const today   = new Date()
  const inYear  = today.getFullYear() === year
  const pastYear = today.getFullYear() > year

  const map: Record<string, AptSegment[]> = {}

  for (const cl of raw) {
    if (!map[cl.apartment_number]) map[cl.apartment_number] = []
    if (!cl.lease_start && !cl.move_out_date) continue

    const startDate   = cl.lease_start
      ? new Date(cl.lease_start + 'T12:00:00')
      : new Date(year, 0, 1)
    const moveOutDate = cl.move_out_date ? new Date(cl.move_out_date + 'T12:00:00') : null

    const hasLeft     = moveOutDate !== null && moveOutDate <= today
    const leavingSoon = moveOutDate !== null && moveOutDate > today

    // ── Segment solide ──────────────────────────────────────────────────────
    const solidEndDate = hasLeft ? moveOutDate! : (pastYear ? new Date(year, 11, 31) : today)
    const sp = startDayPct(startDate, year)
    const ep = endDayPct(solidEndDate, year)

    if (ep > sp) {
      map[cl.apartment_number].push({
        tenantName: cl.tenant_last_name,
        startPct: sp,
        widthPct: ep - sp,
        dashed: false,
      })
    }

    // ── Segment pointillé (prévisionnel) ────────────────────────────────────
    if (!hasLeft && !pastYear && (inYear ? today.getMonth() < 11 : true)) {
      const dashedEndDate = leavingSoon ? moveOutDate! : new Date(year, 11, 31)
      const dp = startDate > today ? startDayPct(startDate, year) : ep
      const dpe = endDayPct(dashedEndDate, year)

      if (dpe > dp) {
        map[cl.apartment_number].push({
          tenantName: cl.tenant_last_name,
          startPct: dp,
          widthPct: dpe - dp,
          dashed: true,
        })
      }
    }
  }

  const aptNumbers = [...new Set(raw.map(cl => cl.apartment_number))].sort((a, b) => parseInt(a) - parseInt(b))
  return aptNumbers.map(num => ({ number: num, segments: map[num] ?? [] }))
}

function OccupationCalendar({ rows, year }: { rows: AptGroup[]; year: number }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Occupation {year}
        </h2>
        <ExportLeasesButton currentYear={year} />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          <div className="flex items-center mb-1 pl-12">
            {MONTHS_SHORT.map(m => (
              <div key={m} className="flex-1 text-xs font-semibold text-gray-400 text-center">
                {m}
              </div>
            ))}
          </div>

          {rows.map((apt) => {
            const color = APT_COLORS[parseInt(apt.number) % APT_COLORS.length]
            return (
              <div key={apt.number} className="flex items-center h-8 border-b border-gray-50 last:border-0">
                <div className="w-12 shrink-0 text-xs font-bold text-gray-500 text-right pr-3">
                  {apt.number}
                </div>
                <div className="flex-1 relative h-5">
                  {MONTHS_SHORT.map((_, mi) => (
                    <div
                      key={mi}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${(mi / 12) * 100}%`,
                        width: `${100 / 12}%`,
                        background: mi % 2 === 0 ? '#f9fafb' : '#fff',
                      }}
                    />
                  ))}
                  {apt.segments.map((seg, i) => (
                    <a
                      key={i}
                      href={`/admin/apartments/${apt.number}`}
                      className="absolute top-0 bottom-0 flex items-center px-1.5 rounded overflow-hidden hover:brightness-90 transition-[filter]"
                      style={{
                        left: `${seg.startPct}%`,
                        width: `${seg.widthPct}%`,
                        background: seg.dashed ? 'transparent' : color,
                        border: seg.dashed ? `2px dashed ${color}` : 'none',
                      }}
                      title={`Appt ${apt.number} — ${seg.tenantName?.toUpperCase() ?? ''}${seg.dashed ? ' (prévisionnel)' : ''}`}
                    >
                      <span className="truncate text-xs font-medium" style={{ color: seg.dashed ? color : '#fff' }}>
                        {seg.tenantName?.toUpperCase() ?? ''}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const now = new Date()
  const year = now.getFullYear()

  const [stats, rawCalendar, caByMonth] = await Promise.all([
    getDashboardStats(),
    getCalendarLeases(year),
    getCaByMonth(year),
  ])
  const annee = year

  const caFormatted = stats.caYtd.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Tableau de bord annuel</h1>

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

      {/* Bar chart CA mensuel */}
      <CaBarChartClient data={caByMonth} year={year} />

      {/* Calendrier occupation */}
      <OccupationCalendar rows={buildCalendarRows(rawCalendar, year)} year={year} />
    </div>
  )
}
