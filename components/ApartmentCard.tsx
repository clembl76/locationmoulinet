'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import { getApartmentStatus, formatAvailableFrom } from '@/lib/apartmentStatus'

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

const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  STUDIO: { fr: 'Studio', en: 'Studio' },
  T1: { fr: 'T1', en: '1-room apt.' },
  T2: { fr: 'T2', en: '2-room apt.' },
  T3: { fr: 'T3', en: '3-room apt.' },
  T4: { fr: 'T4', en: '4-room apt.' },
}

function PhotoPlaceholder() {
  return (
    <div className="bg-blue-light h-48 flex items-center justify-center">
      <svg className="w-16 h-16 text-blue-primary opacity-25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
      </svg>
    </div>
  )
}

function ApartmentGallery({ number }: { number: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    fetch(`/api/photos/${encodeURIComponent(number)}`)
      .then(r => r.json())
      .then((d: { photos: Photo[] }) => setPhotos(d.photos))
      .catch(() => setPhotos([]))
  }, [number])

  if (photos === null) return <div className="bg-blue-light h-48 animate-pulse" />
  if (photos.length === 0) return <PhotoPlaceholder />

  const main = photos[active]
  return (
    <div>
      <div className="relative h-48 bg-blue-light overflow-hidden">
        <Image src={main.src} alt={main.name} fill className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1 p-2 bg-gray-50 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={p.id} onClick={e => { e.preventDefault(); setActive(i) }}
              className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${i === active ? 'border-blue-primary' : 'border-transparent'}`}>
              <Image src={p.thumb} alt={p.name} fill className="object-cover" sizes="48px" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, availableFrom, lang }: {
  status: 'available' | 'soon' | 'rented'
  availableFrom: Date | null
  lang: 'fr' | 'en'
}) {
  if (status === 'available') {
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
        {lang === 'fr' ? 'Disponible' : 'Available'}
      </span>
    )
  }
  if (status === 'soon') {
    const dateStr = availableFrom ? formatAvailableFrom(availableFrom, lang) : ''
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
        {lang === 'fr' ? `Dispo. le ${dateStr}` : `Avail. ${dateStr}`}
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600 whitespace-nowrap">
      {lang === 'fr' ? 'Loué' : 'Rented'}
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
    <Link href={`/apartments/${apartment.number}`}
      className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <ApartmentGallery number={apartment.number} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {lang === 'fr' ? 'Appartement' : 'Apartment'} {apartment.number}
            </p>
            <h3 className="font-semibold text-gray-900">{typeLabel}</h3>
          </div>
          <StatusBadge status={status} availableFrom={availableFrom} lang={lang} />
        </div>
        <div className="text-sm text-gray-500 mb-4">
          <p>{apartment.surface_area} m² &nbsp;·&nbsp; {floorLabel}</p>
        </div>
        <div className="flex items-baseline gap-1 pt-3 border-t border-gray-100">
          <span className="text-xl font-bold text-blue-dark">{apartment.rent_including_charges} €</span>
          <span className="text-sm text-gray-400">CC / {lang === 'fr' ? 'mois' : 'month'}</span>
        </div>
      </div>
    </Link>
  )
}
