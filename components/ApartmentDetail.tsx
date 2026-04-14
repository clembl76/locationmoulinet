'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLang } from '@/context/LanguageContext'
import type { DrivePhoto, DriveVideo } from '@/lib/drivePhotos'
import { getApartmentStatus, formatAvailableFrom } from '@/lib/apartmentStatus'

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
  buildings: { address: string; short_name: string } | null
  leases: { move_out_inspection_date: string | null }[]
}

const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  STUDIO: { fr: 'Studio', en: 'Studio' },
  T1: { fr: 'T1', en: '1-room apt.' },
  T2: { fr: 'T2', en: '2-room apt.' },
  T3: { fr: 'T3', en: '3-room apt.' },
  T4: { fr: 'T4', en: '4-room apt.' },
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
    return <div className="w-full h-[480px] bg-blue-light animate-pulse rounded-2xl" />
  }

  if (media.length === 0) {
    return (
      <div className="w-full h-[480px] bg-blue-light rounded-2xl flex items-center justify-center">
        <svg className="w-20 h-20 text-blue-primary opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                i === active ? 'border-blue-primary' : 'border-transparent opacity-60 hover:opacity-100'
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

// ─── InfoRow ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  )
}

// ─── Static blocks (left column) ────────────────────────────────────────────

const QUARTIER_FR = `Quartier calme, très bien placé, proche centre-ville, gare et écoles/universités :

• Gare, Centre-ville : 2 min à pied
• Lycée Corneille, Lycée JB de La Salle : 10 min à pied
• Lycée Jeanne d'Arc : 15 min à pied
• Fac de médecine, Fac de droit (Préfecture) : 20 min à pied
• Mont-Saint-Aignan (Université, Neoma) : 20 min en bus
• Saint-Étienne-du-Rouvray (INSA, Université, Esigelec) : 35 min en métro`

const QUARTIER_EN = `Quiet neighbourhood, perfectly located close to the city centre, station and schools/universities:

• Train station, City centre: 2 min walk
• Lycée Corneille, Lycée JB de La Salle: 10 min walk
• Lycée Jeanne d'Arc: 15 min walk
• Faculty of Medicine, Faculty of Law (Préfecture): 20 min walk
• Mont-Saint-Aignan (University, Neoma): 20 min by bus
• Saint-Étienne-du-Rouvray (INSA, University, Esigelec): 35 min by metro`

const CONDITIONS_FR = `Pour que votre dossier soit éligible, vous devrez remplir à minima les conditions suivantes :

• Être étudiant.
• Gagner 3 fois le loyer, ou avoir un garant qui gagne 3 fois le loyer.
• Fournir des justificatifs d'identité et preuves de revenus.`

const CONDITIONS_EN = `To be eligible, your application must meet at least the following requirements:

• Be a student.
• Earn 3× the rent, or have a guarantor who earns 3× the rent.
• Provide proof of identity and proof of income.`

function StaticBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-gray-900 mb-3">{title}</h2>
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{content}</p>
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
    type: lang === 'fr' ? 'Type' : 'Type',
    floor: lang === 'fr' ? 'Étage' : 'Floor',
    surface: lang === 'fr' ? 'Surface' : 'Area',
    orientation: 'Orientation',
    description: lang === 'fr' ? 'Description' : 'Description',
    pricing: lang === 'fr' ? 'Loyer mensuel' : 'Monthly rent',
    priceCC: lang === 'fr' ? 'Charges comprises' : 'All-inclusive',
    priceHC: lang === 'fr' ? 'Hors charges' : 'Excl. charges',
    charges: lang === 'fr' ? 'Charges' : 'Service charges',
    address: lang === 'fr' ? 'Adresse' : 'Address',
    contact: lang === 'fr' ? 'Nous contacter' : 'Contact us',
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

  // Charges & conditions bullet list for price card
  const chargesBullets = lang === 'fr' ? [
    "Direct propriétaire, pas de frais d'agence.",
    'Eau froide, eau chaude, électricité, chauffage, wifi inclus.',
    '1 mois de dépôt de garantie.',
    'Éligible aux aides au logement.',
  ] : [
    'Direct from owner, no agency fees.',
    'Cold water, hot water, electricity, heating, wifi included.',
    '1 month security deposit.',
    'Eligible for housing benefits (APL).',
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/" className="text-sm text-blue-primary hover:text-blue-dark font-medium transition-colors">
            {t.back}
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Title + status badge: stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
              {t.apt} {apartment.number}
            </p>
            <h1 className="text-3xl font-bold text-blue-dark">{typeLabel}</h1>
          </div>
          <div className="sm:pb-1 flex-shrink-0">{statusBadge()}</div>
        </div>

        {/* Gallery */}
        <div className="mb-8">
          <Gallery number={apartment.number} />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: key info + description + quartier + conditions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <InfoRow label={t.type} value={typeLabel} />
              <InfoRow label={t.surface} value={`${apartment.surface_area} m²`} />
              <InfoRow label={t.floor} value={floorLabel} />
              {apartment.orientation && <InfoRow label={t.orientation} value={apartment.orientation} />}
              {apartment.buildings?.address && <InfoRow label={t.address} value={apartment.buildings.address} />}
            </div>

            {apartment.description && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-3">{t.description}</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {apartment.description}
                </p>
              </div>
            )}

            <StaticBlock title={t.quartierTitle} content={lang === 'fr' ? QUARTIER_FR : QUARTIER_EN} />
          </div>

          {/* Right: price card + conditions de location */}
          <div className="lg:col-span-1 space-y-4 sticky top-20 self-start">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">{t.pricing}</p>

              <div className="text-4xl font-bold text-blue-dark mb-1">{priceCC} €</div>
              <p className="text-sm text-gray-400 mb-4">
                {t.priceCC} / {lang === 'fr' ? 'mois' : 'month'}
              </p>

              {/* Price breakdown */}
              {(priceHC != null || charges != null) && (
                <div className="space-y-1.5 mb-4 pb-4 border-b border-gray-100">
                  {priceHC != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t.priceHC}</span>
                      <span className="font-medium">{priceHC} €</span>
                    </div>
                  )}
                  {charges != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t.charges}</span>
                      <span className="font-medium">{charges} €</span>
                    </div>
                  )}
                </div>
              )}

              {/* Charges details integrated */}
              <ul className="space-y-1.5 mb-6">
                {chargesBullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="text-blue-primary mt-0.5 flex-shrink-0">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {showEmail ? (
                <div className="text-center py-3 bg-blue-light rounded-xl">
                  <a href="mailto:location.moulinet@gmail.com"
                    className="text-sm font-semibold text-blue-primary hover:text-blue-dark transition-colors">
                    location.moulinet@gmail.com
                  </a>
                </div>
              ) : (
                <button onClick={() => setShowEmail(true)}
                  className="w-full bg-blue-primary hover:bg-blue-dark text-white font-semibold py-3 rounded-xl transition-colors">
                  {t.contact}
                </button>
              )}
            </div>

            {/* Conditions de location — même esprit que le bloc loyer */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">{t.conditionsTitle}</p>
              <ul className="space-y-2">
                {(lang === 'fr' ? [
                  'Être étudiant.',
                  'Gagner 3 fois le loyer, ou avoir un garant qui gagne 3 fois le loyer.',
                  'Fournir des justificatifs d\'identité et preuves de revenus.',
                ] : [
                  'Be a student.',
                  'Earn 3× the rent, or have a guarantor who earns 3× the rent.',
                  'Provide proof of identity and proof of income.',
                ]).map(b => (
                  <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-primary mt-0.5 flex-shrink-0">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
