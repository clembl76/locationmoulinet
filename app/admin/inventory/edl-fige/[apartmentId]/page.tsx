import { notFound } from 'next/navigation'
import { getApartmentsWithActiveLease } from '@/lib/adminData'
import { getInstallationAction, getLeaseDatesAction, getEdlFigeHeaderAction } from '@/app/admin/inventory/summaryActions'
import { getApartmentKeysAction } from '@/app/admin/inventory/keysActions'
import { getInventoryForApartmentAction } from '@/app/admin/inventory/actions'
import { getSurfacesForApartmentAction } from '@/app/admin/inventory/surfacesActions'
import EdlFigeView from '@/components/admin/EdlFigeView'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EdlFigePage({
  params,
}: {
  params: Promise<{ apartmentId: string }>
}) {
  const { apartmentId } = await params

  const apartments = await getApartmentsWithActiveLease().catch(() => [])
  const apt = apartments.find(a => a.apartment_id === apartmentId)
  if (!apt) notFound()

  const [installation, leaseDates, keys, inventory, surfaces, header] = await Promise.all([
    getInstallationAction(apartmentId),
    getLeaseDatesAction(apt.lease_id),
    getApartmentKeysAction(apartmentId),
    getInventoryForApartmentAction(apartmentId),
    getSurfacesForApartmentAction(apartmentId),
    getEdlFigeHeaderAction(apt.lease_id),
  ])

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link
          href="/admin/inventory"
          className="text-sm text-blue-primary hover:underline"
        >
          ← Retour à l'inventaire
        </Link>
      </div>
      <EdlFigeView
        apt={apt}
        leaseDates={leaseDates}
        installation={installation}
        keys={keys}
        inventory={inventory}
        surfaces={surfaces}
        header={header}
      />
    </div>
  )
}
