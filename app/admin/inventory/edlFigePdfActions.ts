'use server'

import { getApartmentsWithActiveLease } from '@/lib/adminData'
import { generateEdlFigePdf, type EdlType } from '@/lib/edlFigePdf'
import { uploadEdlFigePdfToDrive } from '@/lib/quittance'
import { getInstallationAction, getLeaseDatesAction, getEdlFigeHeaderAction } from './summaryActions'
import { getApartmentKeysAction } from './keysActions'
import { getInventoryForApartmentAction } from './actions'
import { getSurfacesForApartmentAction } from './surfacesActions'

export type GenerateEdlFigePdfResult =
  | { ok: true; filename: string; webViewLink?: string }
  | { ok: false; error: string }

export async function generateEdlFigePdfAction(
  apartmentId: string,
  edlType: EdlType
): Promise<GenerateEdlFigePdfResult> {
  const apartments = await getApartmentsWithActiveLease().catch(() => [])
  const apt = apartments.find(a => a.apartment_id === apartmentId)
  if (!apt) return { ok: false, error: 'Appartement introuvable' }

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

  const uploadResult = await uploadEdlFigePdfToDrive({
    aptNumber: apt.apartment_number,
    tenantLastName: apt.tenant_last_name,
    filename,
    pdfBytes,
  })
  if (!uploadResult.ok) return { ok: false, error: uploadResult.error ?? 'Échec de l\'enregistrement sur Google Drive' }

  return { ok: true, filename, webViewLink: uploadResult.webViewLink }
}
