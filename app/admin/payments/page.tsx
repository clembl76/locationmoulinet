import { getAllTransactions, getTenantOptions } from '@/lib/adminData'
import { getLinxoTransactions } from '@/lib/linxoImport'
import PaymentsClient from '@/components/admin/PaymentsClient'
import LinxoTable from '@/components/admin/LinxoTable'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const [transactions, linxoRows, tenantOptions] = await Promise.all([
    getAllTransactions(),
    getLinxoTransactions().catch(() => []),
    getTenantOptions().catch(() => []),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <LinxoTable
        initialRows={linxoRows}
        tenantOptions={tenantOptions}
      />
      <PaymentsClient transactions={transactions} />
    </div>
  )
}
