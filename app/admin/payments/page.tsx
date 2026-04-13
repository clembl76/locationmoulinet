import { getAllTransactions } from '@/lib/adminData'
import { getLinxoTransactions } from '@/lib/linxoImport'
import PaymentsClient from '@/components/admin/PaymentsClient'
import LinxoTable from '@/components/admin/LinxoTable'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const [transactions, linxoRows] = await Promise.all([
    getAllTransactions(),
    getLinxoTransactions().catch(() => []),
  ])

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <PaymentsClient transactions={transactions} />
      <LinxoTable initialRows={linxoRows} />
    </div>
  )
}
