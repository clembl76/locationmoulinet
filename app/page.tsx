import { supabase } from '@/lib/supabase'
import HomeClient from '@/components/HomeClient'
import { Apartment } from '@/components/ApartmentCard'

export default async function Page() {
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('apartments')
    .select(`
      id,
      number,
      type,
      surface_area,
      floor,
      floor_label,
      rent_including_charges,
      buildings(address, short_name),
      leases(move_out_inspection_date)
    `)
    .lte('valid_from', now)
    .or('valid_to.is.null,valid_to.gte.' + now)
    .neq('type', 'BUREAU')

  const apartments = (data ?? []) as unknown as Apartment[]

  return <HomeClient apartments={apartments} />
}
