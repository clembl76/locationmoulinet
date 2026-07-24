import RecapGrid, { RecapApartment } from '@/components/RecapGrid'
import { getApartmentStatus } from '@/lib/apartmentStatus'
import { runSqlAdmin, EXCLUDE_BUREAU } from '@/lib/adminData'
import Link from 'next/link'

export default async function RecapPage() {
  const now = new Date()

  const data = await runSqlAdmin<RecapApartment>(`
    SELECT
      a.id,
      a.number,
      a.type::text,
      a.surface_area,
      a.mezzanine,
      a.rent_including_charges,
      COALESCE(
        (SELECT json_agg(json_build_object('move_out_inspection_date', l.move_out_inspection_date::text))
         FROM leases l WHERE l.apartment_id = a.id),
        '[]'::json
      ) AS leases
    FROM apartments a
    WHERE a.valid_from <= CURRENT_DATE
      AND (a.valid_to IS NULL OR a.valid_to >= CURRENT_DATE)
      AND ${EXCLUDE_BUREAU}
    ORDER BY a.number::integer
  `)

  // Only show available and soon — rented apartments are not relevant for visits
  const apartments = data.filter(apt => {
    const { status } = getApartmentStatus(apt.leases ?? [])
    return status !== 'rented'
  })

  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-blue-primary hover:text-blue-dark font-medium transition-colors">
            ← Location Moulinet
          </Link>
          <span className="text-xs text-gray-400">{dateStr}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-blue-dark mb-2">Récapitulatif des appartements</h1>
        <p className="text-sm text-gray-500 mb-8">
          Disponibles et prochainement disponibles · Vue pour les visites
        </p>
        <RecapGrid apartments={apartments} />
      </div>
    </div>
  )
}
