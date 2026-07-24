import { runSqlAdmin } from '@/lib/adminData'
import ApartmentDetail, { ApartmentDetailData } from '@/components/ApartmentDetail'
import { notFound } from 'next/navigation'

export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params

  const rows = await runSqlAdmin<ApartmentDetailData>(`
    SELECT
      a.id,
      a.number,
      a.type::text,
      a.surface_area,
      a.floor,
      a.floor_label,
      a.orientation,
      a.description,
      a.rent_excluding_charges,
      a.charges,
      a.rent_including_charges,
      a.mezzanine,
      json_build_object(
        'address', b.address,
        'short_name', b.short_name,
        'charges_model', b.charges_model
      ) AS buildings,
      COALESCE(
        (SELECT json_agg(json_build_object('move_out_inspection_date', l.move_out_inspection_date::text))
         FROM leases l WHERE l.apartment_id = a.id),
        '[]'::json
      ) AS leases
    FROM apartments a
    JOIN buildings b ON b.id = a.building_id
    WHERE a.number = '${number}'
    LIMIT 1
  `)

  const apartment = rows[0]
  if (!apartment) notFound()

  return <ApartmentDetail apartment={apartment} />
}
