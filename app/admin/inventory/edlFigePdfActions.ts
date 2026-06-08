'use server'

import { getApartmentsWithActiveLease } from '@/lib/adminData'
import { generateEdlFigePdf, type EdlType } from '@/lib/edlFigePdf'
import { getInstallationAction, getLeaseDatesAction, getEdlFigeHeaderAction } from './summaryActions'
import { getApartmentKeysAction } from './keysActions'
import { getInventoryForApartmentAction } from './actions'
import { getSurfacesForApartmentAction } from './surfacesActions'

export async function generateEdlFigePdfAction(
  apartmentId: string,
  edlType: EdlType
): Promise<{ pdfBase64: string; filename: string } | null> {
  const apartments = await getApartmentsWithActiveLease().catch(() => [])
  const apt = apartments.find(a => a.apartment_id === apartmentId)
  if (!apt) return null

  const [installation, leaseDates, keys, inventory, surfaces, header] = await Promise.all([
    getInstallationAction(apartmentId),
    getLeaseDatesAction(apt.lease_id),
    getApartmentKeysAction(apartmentId),
    getInventoryForApartmentAction(apartmentId),
    getSurfacesForApartmentAction(apartmentId),
    getEdlFigeHeaderAction(apt.lease_id),
  ])

  const { pdfBytes, filename } = await generateEdlFigePdf(
    { apt, leaseDates, installation, keys, inventory, surfaces, header },
    edlType
  )

  return { pdfBase64: Buffer.from(pdfBytes).toString('base64'), filename }
}
