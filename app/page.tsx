import HomeClient from '@/components/HomeClient'
import { Apartment } from '@/components/ApartmentCard'
import { runSqlAdmin } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const rows = await runSqlAdmin<{
    id: string
    number: string
    type: string
    surface_area: number
    floor: number
    floor_label: string | null
    rent_including_charges: number
    building_address: string
    building_short_name: string
    lease_id: string | null
    move_out_inspection_date: string | null
  }>(`
    SELECT
      a.id,
      a.number,
      a.type::text,
      a.surface_area,
      a.floor,
      a.floor_label,
      a.rent_including_charges,
      b.address        AS building_address,
      b.short_name     AS building_short_name,
      l.id             AS lease_id,
      l.move_out_inspection_date::text AS move_out_inspection_date
    FROM apartments a
    JOIN buildings b ON b.id = a.building_id
    LEFT JOIN leases l
      ON l.apartment_id = a.id
      AND (l.move_out_inspection_date IS NULL OR l.move_out_inspection_date >= CURRENT_DATE)
    WHERE
      (a.valid_from IS NULL OR a.valid_from <= CURRENT_DATE)
      AND (a.valid_to   IS NULL OR a.valid_to   >= CURRENT_DATE)
      AND a.type::text != 'BUREAU'
    ORDER BY a.number::integer
  `)

  // Regrouper les lignes par appartement (un apt peut avoir plusieurs baux actifs/futurs)
  const byApt = new Map<string, typeof rows>()
  for (const row of rows) {
    if (!byApt.has(row.id)) byApt.set(row.id, [])
    byApt.get(row.id)!.push(row)
  }

  const apartments: Apartment[] = Array.from(byApt.values()).map(group => {
    const first = group[0]
    // lease_id null = LEFT JOIN sans bail correspondant → appartement libre
    const leases = group
      .filter(r => r.lease_id !== null)
      .map(r => ({ move_out_inspection_date: r.move_out_inspection_date }))

    return {
      id: first.id,
      number: first.number,
      type: first.type,
      surface_area: first.surface_area,
      floor: first.floor,
      floor_label: first.floor_label,
      rent_including_charges: first.rent_including_charges,
      buildings: {
        address: first.building_address,
        short_name: first.building_short_name,
      },
      leases,
    }
  })

  return <HomeClient apartments={apartments} />
}
