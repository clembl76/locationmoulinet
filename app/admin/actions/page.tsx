import { getAdminActions } from '@/lib/adminData'
import AdminActionsTable from '@/components/admin/AdminActionsTable'

export const dynamic = 'force-dynamic'

export default async function AdminActionsPage() {
  const actions = await getAdminActions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Récapitulatif des actions à réaliser, triées par date limite.
        </p>
      </div>
      <AdminActionsTable actions={actions} />
    </div>
  )
}
