import { getTenantOptions, getApartmentsWithActiveLease } from '@/lib/adminData'
import { getLinxoTransactions } from '@/lib/linxoImport'
import GenerateRentsButton from '@/components/admin/GenerateRentsButton'
import LinxoTable from '@/components/admin/LinxoTable'
import QuittancesGenerator from '@/components/admin/QuittancesGenerator'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mois = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMois = new Date(nextYear, nextMonth - 1, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })

  const [linxoRows, tenantOptions, apartments] = await Promise.all([
    getLinxoTransactions().catch(() => []),
    getTenantOptions().catch(() => []),
    getApartmentsWithActiveLease().catch(() => []),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <QuittancesGenerator apartments={apartments} />
      <div className="flex flex-wrap gap-3">
        <GenerateRentsButton year={year} month={month} mois={mois} />
        <GenerateRentsButton year={nextYear} month={nextMonth} mois={nextMois} />
      </div>
      <LinxoTable
        initialRows={linxoRows}
        tenantOptions={tenantOptions}
      />
    </div>
  )
}
