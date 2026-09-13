'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import type { DrivePhoto, DriveVideo } from '@/lib/drivePhotos'
import { getApartmentStatus, formatAvailableFrom } from '@/lib/apartmentStatus'
import { getQuartierContent, getChargesBullets } from '@/lib/apartmentContent'
import { TYPE_LABELS } from '@/lib/apartmentTypeLabels'

export type ApartmentDetailData = {
  id: string
  number: string
  type: string
  surface_area: number
  floor: number
  floor_label: string | null
  orientation: string | null
  description: string | null
  rent_excluding_charges: number | null
  charges: number | null
  rent_including_charges: number
  buildings: { address: string; short_name: string; charges_model: string | null } | null
  leases: { move_out_inspection_date: string | null }[]
}

// ─── Gallery ────────────────────────────────────────────────────────────────

type MediaItem =
  | { kind: 'photo'; id: string; name: string; src: string; thumb: string }
  | { kind: 'video'; id: string; name: string; src: string; mimeType: string }

function Gallery({ number }: { number: string }) {
  const [media, setMedia] = useState<MediaItem[] | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch(`/api/photos/${encodeURIComponent(number)}`).then(r => r.json())
        .then((d: { photos: DrivePhoto[] }) =>
          d.photos.map(p => ({ kind: 'photo' as const, ...p }))
        ).catch(() => [] as MediaItem[]),
      fetch(`/api/videos/${encodeURIComponent(number)}`).then(r => r.json())
        .then((d: { videos: DriveVideo[] }) =>
          d.videos.map(v => ({ kind: 'video' as const, ...v }))
        ).catch(() => [] as MediaItem[]),
    ]).then(([photos, videos]) => setMedia([...photos, ...videos]))
  }, [number])

  if (media === null) {
    return <div className="w-full h-[480px] bg-gray-50 animate-pulse rounded-2xl" />
  }

  if (media.length === 0) {
    return (
      <div className="w-full h-[480px] bg-gray-50 rounded-2xl flex items-center justify-center">
        <svg className="w-20 h-20 text-teal opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9.75L12 3l9 6.75V21H3V9.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 21V12h6v9" />
        </svg>
      </div>
    )
  }

  const current = media[active]

  return (
    <div className="flex flex-col gap-2">
      {/* Main viewer */}
      <div className="relative w-full h-[480px] rounded-2xl overflow-hidden bg-black">
        {current.kind === 'photo' ? (
          <Image src={current.src} alt={current.name} fill
            className="object-contain" sizes="(max-width: 1024px) 100vw, 60vw" unoptimized priority />
        ) : (
          <video
            key={current.src}
            src={current.src}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          />
        )}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {active + 1} / {media.length}
        </div>
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((item, i) => (
            <button key={item.id} onClick={() => setActive(i)}
              className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all bg-gray-100 ${
                i === active ? 'border-teal' : 'border-transparent opacity-60 hover:opacity-100'
              }`}>
              {item.kind === 'photo' ? (
                <Image src={item.thumb} alt={item.name} fill className="object-cover" sizes="80px" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <svg className="w-7 h-7 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Accordion (Quartier & commodités) ───────────────────────────────────────

function Accordion({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="py-6 border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
      >
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-4">{content}</p>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ApartmentDetail({ apartment }: { apartment: ApartmentDetailData }) {
  const { lang } = useLang()
  const [showEmail, setShowEmail] = useState(false)

  const { status, availableFrom } = getApartmentStatus(apartment.leases)

  const floorLabel = apartment.floor_label ?? (
    apartment.floor === 0
      ? lang === 'fr' ? 'RDC' : 'Ground floor'
      : lang === 'fr' ? `Étage ${apartment.floor}` : `Floor ${apartment.floor}`
  )

  const typeLabel = TYPE_LABELS[apartment.type]?.[lang] ?? apartment.type

  const priceCC = apartment.rent_including_charges
  const priceHC = apartment.rent_excluding_charges
  const charges = apartment.charges

  const t = {
    back: lang === 'fr' ? '← Tous les appartements' : '← All apartments',
    apt: lang === 'fr' ? 'Appartement' : 'Apartment',
    description: lang === 'fr' ? 'Description' : 'Description',
    pricing: lang === 'fr' ? 'Loyer mensuel' : 'Monthly rent',
    priceCC: lang === 'fr' ? 'Charges comprises' : 'All-inclusive',
    priceHC: lang === 'fr' ? 'Hors charges' : 'Excl. charges',
    charges: lang === 'fr' ? 'Charges' : 'Service charges',
    contact: lang === 'fr' ? 'Nous contacter' : 'Contact us',
    visit: lang === 'fr' ? 'Visiter' : 'Book a visit',
    quartierTitle: lang === 'fr' ? 'Quartier & commodités' : 'Neighbourhood & amenities',
    conditionsTitle: lang === 'fr' ? 'Conditions de location' : 'Rental conditions',
  }

  // Status badge content
  const statusBadge = () => {
    if (status === 'available') return (
      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
        {lang === 'fr' ? 'Disponible' : 'Available'}
      </span>
    )
    if (status === 'soon' && availableFrom) return (
      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
        {lang === 'fr'
          ? `Disponible le ${formatAvailableFrom(availableFrom, lang)}`
          : `Available ${formatAvailableFrom(availableFrom, lang)}`}
      </span>
    )
    return (
      <span className="text-sm font-semibold px-3 py-1 rounded-full bg-red-100 text-red-600">
        {lang === 'fr' ? 'Loué' : 'Rented'}
      </span>
    )
  }

  // Charges & conditions bullet list for price card — varie selon l'immeuble
  const buildingShortName = apartment.buildings?.short_name
  const chargesBullets = getChargesBullets(apartment.buildings?.charges_model, lang)
  const quartierContent = getQuartierContent(buildingShortName, lang)

  const conditions = lang === 'fr' ? [
    'Être étudiant.',
    'Gagner 3 fois le loyer, ou avoir un garant qui gagne 3 fois le loyer.',
    'Fournir des justificatifs d\'identité et preuves de revenus.',
  ] : [
    'Be a student.',
    'Earn 3× the rent, or have a guarantor who earns 3× the rent.',
    'Provide proof of identity and proof of income.',
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/" className="text-sm text-gray-900 hover:text-teal font-medium transition-colors">
            {t.back}
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Gallery */}
        <div className="mb-8">
          <Gallery number={apartment.number} />
        </div>

        {/* Title + status badge */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
            {t.apt} {apartment.number}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{typeLabel}</h1>
            {statusBadge()}
          </div>
        </div>

        {/* Specs, à plat */}
        <div className="pb-6 border-b border-gray-100 text-sm text-gray-600">
          {apartment.surface_area} m²
          {' · '}{floorLabel}
          {apartment.orientation && <>{' · '}{apartment.orientation}</>}
          {apartment.buildings?.address && (
            <div className="flex items-center gap-1.5 mt-2 text-gray-500">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {apartment.buildings.address}
            </div>
          )}
        </div>

        {/* Description */}
        {apartment.description && (
          <div className="py-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">{t.description}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {apartment.description}
            </p>
          </div>
        )}

        {/* Loyer mensuel */}
        <div className="py-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">{t.pricing}</h2>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border border-gray-200 rounded-2xl">
            <div>
              <span className="text-2xl font-bold text-gray-900">{priceCC} €</span>
              <span className="text-sm text-gray-500">
                {' '}{t.priceCC} / {lang === 'fr' ? 'mois' : 'month'}
                {priceHC != null && charges != null && (
                  <> {'·'} {priceHC} € {t.priceHC.toLowerCase()} + {charges} € {t.charges.toLowerCase()}</>
                )}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {showEmail ? (
                <a href="mailto:location.moulinet@gmail.com"
                  className="text-sm font-semibold text-teal px-4 py-2.5">
                  location.moulinet@gmail.com
                </a>
              ) : (
                <button onClick={() => setShowEmail(true)}
                  className="text-sm font-semibold text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2.5 rounded-full transition-colors">
                  {t.contact}
                </button>
              )}
              <a
                href="/visiter"
                className="text-sm font-semibold bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-full transition-colors whitespace-nowrap"
              >
                {t.visit}
              </a>
            </div>
          </div>

          <ul className="space-y-1.5 mt-4">
            {chargesBullets.map(b => (
              <li key={b} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-teal mt-0.5 flex-shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Conditions de location */}
        <div className="py-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">{t.conditionsTitle}</h2>
          <ul className="space-y-2">
            {conditions.map(b => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-teal mt-0.5 flex-shrink-0">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quartier & commodités — dernière section, en accordéon */}
        <Accordion title={t.quartierTitle} content={quartierContent} />
      </div>
    </div>
  )
}
