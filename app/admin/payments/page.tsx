import { getAllTransactions, getTenantOptions, getApartmentsWithActiveLease } from '@/lib/adminData'
import { getLinxoTransactions } from '@/lib/linxoImport'
import PaymentsClient from '@/components/admin/PaymentsClient'
import LinxoTable from '@/components/admin/LinxoTable'
import QuittancesGenerator from '@/components/admin/QuittancesGenerator'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const [transactions, linxoRows, tenantOptions, apartments] = await Promise.all([
    getAllTransactions(),
    getLinxoTransactions().catch(() => []),
    getTenantOptions().catch(() => []),
    getApartmentsWithActiveLease().catch(() => []),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <QuittancesGenerator apartments={apartments} />
      <LinxoTable
        initialRows={linxoRows}
        tenantOptions={tenantOptions}
      />
      <PaymentsClient transactions={transactions} />
    </div>
  )
}
