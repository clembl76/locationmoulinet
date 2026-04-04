import { supabase } from '@/lib/supabase'
import ApartmentDetail, { ApartmentDetailData } from '@/components/ApartmentDetail'
import { notFound } from 'next/navigation'

export default async function Page({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params

  const { data } = await supabase
    .from('apartments')
    .select(`
      id,
      number,
      type,
      surface_area,
      floor,
      floor_label,
      orientation,
      description,
      rent_excluding_charges,
      charges,
      rent_including_charges,
      mezzanine,
      buildings(address, short_name),
      leases(move_out_inspection_date)
    `)
    .eq('number', number)
    .single()

  if (!data) notFound()

  const apartment = data as unknown as ApartmentDetailData

  return <ApartmentDetail apartment={apartment} />
}
