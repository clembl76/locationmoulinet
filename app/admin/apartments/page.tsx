import { getAdminApartments } from '@/lib/adminData'

export const dynamic = 'force-dynamic'
import ApartmentsClient from '@/components/admin/ApartmentsClient'

export default async function AdminApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const apartments = await getAdminApartments()

  const now = new Date()
  const mois = now.toLocaleString('fr-FR', { month: 'short' })

  return (
    <ApartmentsClient
      apartments={apartments}
      initialStatus={status ?? null}
      mois={mois}
    />
  )
}
