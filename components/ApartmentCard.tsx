'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import { getApartmentStatus, formatAvailableFrom } from '@/lib/apartmentStatus'
import { TYPE_LABELS } from '@/lib/apartmentTypeLabels'

type Lease = { move_out_inspection_date: string | null }

export type Apartment = {
  id: string
  number: string
  type: string
  surface_area: number
  floor: number
  floor_label: string | null
  rent_including_charges: number
  buildings: { address: string; short_name: string } | null
  leases: Lease[]
}

type Photo = { id: string; name: string; src: string; thumb: string }

function PhotoPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
      <svg className="w-14 h-14 text-teal opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
      </svg>
    </div>
  )
}

function ApartmentPhoto({ number }: { number: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)

  useEffect(() => {
    fetch(`/api/photos/${encodeURIComponent(number)}`)
      .then(r => r.json())
      .then((d: { photos: Photo[] }) => setPhotos(d.photos))
      .catch(() => setPhotos([]))
  }, [number])

  if (photos === null) return <div className="w-full h-full bg-gray-50 animate-pulse" />
  if (photos.length === 0) return <PhotoPlaceholder />

  const cover = photos[0]
  return (
    <Image src={cover.src} alt={cover.name} fill className="object-cover"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized />
  )
}

function StatusBadge({ status, availableFrom, lang }: {
  status: 'available' | 'soon' | 'rented'
  availableFrom: Date | null
  lang: 'fr' | 'en'
}) {
  if (status === 'rented') {
    return (
      <span className="absolute bottom-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-900/75 text-white whitespace-nowrap">
        {lang === 'fr' ? 'Loué' : 'Rented'}
      </span>
    )
  }
  const label = status === 'available'
    ? (lang === 'fr' ? 'Disponible' : 'Available')
    : (lang === 'fr'
        ? `Dispo. le ${availableFrom ? formatAvailableFrom(availableFrom, lang) : ''}`
        : `Avail. ${availableFrom ? formatAvailableFrom(availableFrom, lang) : ''}`)
  return (
    <span className="absolute bottom-3 left-3 text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-gray-900 whitespace-nowrap">
      {label}
    </span>
  )
}

export default function ApartmentCard({ apartment }: { apartment: Apartment }) {
  const { lang } = useLang()
  const { status, availableFrom } = getApartmentStatus(apartment.leases ?? [])

  const floorLabel = apartment.floor_label ?? (
    apartment.floor === 0
      ? lang === 'fr' ? 'RDC' : 'Ground floor'
      : lang === 'fr' ? `Étage ${apartment.floor}` : `Floor ${apartment.floor}`
  )

  const typeLabel = TYPE_LABELS[apartment.type]?.[lang] ?? apartment.type

  return (
    <Link href={`/apartments/${apartment.number}`} className="block group">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
        <ApartmentPhoto number={apartment.number} />
        <StatusBadge status={status} availableFrom={availableFrom} lang={lang} />
      </div>
      <div className="pt-4">
        <p className="font-bold text-gray-900 text-[15px]">
          {lang === 'fr' ? 'Appartement' : 'Apartment'} {apartment.number}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">
          {typeLabel} · {apartment.surface_area} m² · {floorLabel}
        </p>
        <p className="mt-2">
          <span className="text-[15px] font-bold text-gray-900">{apartment.rent_including_charges} €</span>{' '}
          <span className="font-medium text-gray-500 text-xs">CC / {lang === 'fr' ? 'mois' : 'month'}</span>
        </p>
      </div>
    </Link>
  )
}
