import { getAllTransactions } from '@/lib/adminData'
import PaymentsClient from '@/components/admin/PaymentsClient'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const transactions = await getAllTransactions()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
      <PaymentsClient transactions={transactions} />
    </div>
  )
}
