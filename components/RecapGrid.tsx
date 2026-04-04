'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getApartmentStatus, formatAvailableFrom, statusSortOrder } from '@/lib/apartmentStatus'

export type RecapApartment = {
  id: string
  number: string
  type: string
  surface_area: number
  mezzanine: boolean | null
  rent_including_charges: number
  leases: { move_out_inspection_date: string | null }[]
}

function Thumb({ number }: { number: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/photos/${encodeURIComponent(number)}`)
      .then(r => r.json())
      .then((d: { photos: { src: string }[] }) => {
        setSrc(d.photos[0]?.src ?? null)
      })
      .catch(() => setSrc(null))
      .finally(() => setLoading(false))
  }, [number])

  if (loading) {
    return <div className="w-16 h-16 rounded-lg bg-blue-light flex-shrink-0 animate-pulse" />
  }

  if (!src) {
    return (
      <div className="w-16 h-16 rounded-lg bg-blue-light flex-shrink-0 flex items-center justify-center">
        <svg className="w-6 h-6 text-blue-primary opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-blue-light">
      <Image src={src} alt={`Apt ${number}`} fill className="object-cover" sizes="64px" unoptimized />
    </div>
  )
}

function StatusPill({ status, availableFrom }: {
  status: 'available' | 'soon' | 'rented'
  availableFrom: Date | null
}) {
  if (status === 'available') return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Disponible</span>
  )
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      {availableFrom ? `Dispo. le ${formatAvailableFrom(availableFrom, 'fr')}` : 'Prochainement'}
    </span>
  )
}

export default function RecapGrid({ apartments }: { apartments: RecapApartment[] }) {
  const withStatus = apartments.map(a => ({
    ...a,
    ...getApartmentStatus(a.leases ?? []),
  }))

  const sorted = [...withStatus].sort((a, b) => {
    if (statusSortOrder(a.status) !== statusSortOrder(b.status)) {
      return statusSortOrder(a.status) - statusSortOrder(b.status)
    }
    return parseInt(a.number) - parseInt(b.number)
  })

  if (sorted.length === 0) {
    return <p className="text-gray-500 text-center py-16">Aucun appartement disponible.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {sorted.map(apt => (
        <Link key={apt.id} href={`/apartments/${apt.number}`}
          className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-primary hover:shadow-sm transition-all">
          <Thumb number={apt.number} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-bold text-blue-dark text-sm">#{apt.number}</span>
              <StatusPill status={apt.status} availableFrom={apt.availableFrom} />
            </div>
            <p className="text-sm text-gray-700 font-medium">{apt.rent_including_charges} € CC/mois</p>
            <p className="text-xs text-gray-500">
              {apt.surface_area} m²
              {apt.mezzanine ? ' · mezzanine' : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
