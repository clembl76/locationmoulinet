import { getAllApartmentsForInventory } from '@/lib/adminData'
import InventoryManager from '@/components/admin/InventoryManager'

export const dynamic = 'force-dynamic'

export default async function AdminInventoryPage() {
  const apartments = await getAllApartmentsForInventory().catch(() => [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
      <InventoryManager apartments={apartments} />
    </div>
  )
}
