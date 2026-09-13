'use client'

import { useState, useMemo } from 'react'
import Navbar from './Navbar'
import ApartmentCard, { Apartment } from './ApartmentCard'
import { useLang } from '@/context/LanguageContext'
import { getApartmentStatus, statusSortOrder, type ApartmentStatus } from '@/lib/apartmentStatus'

// ─── Service section ─────────────────────────────────────────────────────────

function ServiceSection({ lang }: { lang: 'fr' | 'en' }) {
  const title = lang === 'fr'
    ? 'Visitez nos studios meublés en plein centre du quartier historique.'
    : 'Visit our furnished studios in the heart of the historic district.'

  const benefits = lang === 'fr' ? [
    {
      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      title: 'Meublé & tout équipé',
      text: "Logements meublés et équipés, prêts à vivre dès l'arrivée. Pas de déménagement à prévoir.",
    },
    {
      d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      title: 'Idéalement situé',
      text: 'Centre de Rouen, à 2 min de la gare à pied, bus et métro vers toutes les écoles et universités — dans une rue calme.',
    },
    {
      d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Tout inclus, sans surprise',
      text: "Eau, électricité, chauffage, Wifi inclus. Pas de frais d'agence, pas d'abonnement. Éligible APL.",
    },
  ] : [
    {
      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      title: 'Furnished & fully equipped',
      text: 'Move-in ready apartments, fully furnished and equipped. No moving costs.',
    },
    {
      d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
      title: 'Prime location',
      text: 'Rouen city centre, 2 min walk from the station, bus & metro to all schools and universities — on a quiet street.',
    },
    {
      d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'All-inclusive, no surprises',
      text: 'Water, electricity, heating, Wifi included. No agency fees, no subscriptions. Eligible for APL.',
    },
  ]

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12 max-w-2xl mx-auto leading-snug">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {benefits.map(b => (
            <div key={b.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-full bg-teal/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={b.d} />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{b.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type Filters = {
  statuses: Set<ApartmentStatus>
  maxSurface: number
  maxPrice: number
}

function FilterBar({
  filters, onChange, surfaceBounds, priceBounds, lang,
}: {
  filters: Filters
  onChange: (f: Filters) => void
  surfaceBounds: [number, number]
  priceBounds: [number, number]
  lang: 'fr' | 'en'
}) {
  const toggleStatus = (s: ApartmentStatus) => {
    const next = new Set(filters.statuses)
    next.has(s) ? next.delete(s) : next.add(s)
    onChange({ ...filters, statuses: next })
  }

  const statusDefs: { key: ApartmentStatus; labelFr: string; labelEn: string }[] = [
    { key: 'available', labelFr: 'Disponible', labelEn: 'Available' },
    { key: 'soon', labelFr: 'Prochainement', labelEn: 'Coming soon' },
    { key: 'rented', labelFr: 'Loué', labelEn: 'Rented' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      {statusDefs.map(({ key, labelFr, labelEn }) => {
        const active = filters.statuses.has(key)
        return (
          <button key={key} onClick={() => toggleStatus(key)}
            className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
              active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}>
            {lang === 'fr' ? labelFr : labelEn}
          </button>
        )
      })}

      <div className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 py-2 ml-auto">
        <span className="text-xs text-gray-500 whitespace-nowrap">{lang === 'fr' ? 'Surface max.' : 'Max. area'}</span>
        <input type="range" min={surfaceBounds[0]} max={surfaceBounds[1]} step={1}
          value={filters.maxSurface}
          onChange={e => onChange({ ...filters, maxSurface: Number(e.target.value) })}
          className="w-16 accent-teal h-1" />
        <span className="text-xs font-semibold text-teal whitespace-nowrap">
          {filters.maxSurface === surfaceBounds[1]
            ? lang === 'fr' ? 'Tous' : 'All'
            : `≤ ${filters.maxSurface} m²`}
        </span>
      </div>

      <div className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 py-2">
        <span className="text-xs text-gray-500 whitespace-nowrap">{lang === 'fr' ? 'Prix CC max.' : 'Max. price'}</span>
        <input type="range" min={priceBounds[0]} max={priceBounds[1]} step={10}
          value={filters.maxPrice}
          onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-16 accent-teal h-1" />
        <span className="text-xs font-semibold text-teal whitespace-nowrap">
          {filters.maxPrice === priceBounds[1]
            ? lang === 'fr' ? 'Tous' : 'All'
            : `≤ ${filters.maxPrice} €`}
        </span>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function HomeClient({ apartments }: { apartments: Apartment[] }) {
  const { lang } = useLang()

  const surfaces = apartments.map(a => a.surface_area).filter(Boolean)
  const prices = apartments.map(a => a.rent_including_charges).filter(Boolean)
  const surfaceBounds: [number, number] = [Math.floor(Math.min(...surfaces)), Math.ceil(Math.max(...surfaces))]
  const priceBounds: [number, number] = [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]

  const [filters, setFilters] = useState<Filters>({
    statuses: new Set<ApartmentStatus>(['available', 'soon', 'rented']),
    maxSurface: surfaceBounds[1],
    maxPrice: priceBounds[1],
  })

  const sorted = useMemo(() => {
    return [...apartments].sort((a, b) => {
      const { status: sa } = getApartmentStatus(a.leases ?? [])
      const { status: sb } = getApartmentStatus(b.leases ?? [])
      if (statusSortOrder(sa) !== statusSortOrder(sb)) return statusSortOrder(sa) - statusSortOrder(sb)
      return parseInt(a.number) - parseInt(b.number)
    })
  }, [apartments])

  const displayed = useMemo(() => {
    return sorted.filter(apt => {
      const { status } = getApartmentStatus(apt.leases ?? [])
      if (!filters.statuses.has(status)) return false
      if (apt.surface_area > filters.maxSurface) return false
      if (apt.rent_including_charges > filters.maxPrice) return false
      return true
    })
  }, [sorted, filters])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-20 px-4 text-center">
        <div className="absolute -top-40 left-16 w-[420px] h-[420px] rounded-full pointer-events-none bg-[radial-gradient(circle,oklch(88%_0.07_195_/_0.5),transparent_70%)]" />
        <div className="absolute -top-36 -right-20 w-[360px] h-[360px] rounded-full pointer-events-none bg-[radial-gradient(circle,oklch(90%_0.08_40_/_0.45),transparent_70%)]" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.3em] text-teal uppercase mb-4">
            Rouen &nbsp;·&nbsp; Centre-ville
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
            {lang === 'fr' ? 'Studios meublés à louer' : 'Furnished studios for rent'}
          </h1>
        </div>
      </section>

      {/* Service description */}
      <ServiceSection lang={lang} />

      {/* Apartments grid */}
      <main id="apartments" className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {lang === 'fr' ? 'Nos appartements' : 'Our apartments'}
          </h2>
          <span className="text-sm text-gray-400">
            {displayed.length} / {apartments.length}
          </span>
        </div>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          surfaceBounds={surfaceBounds}
          priceBounds={priceBounds}
          lang={lang}
        />

        {displayed.length === 0 ? (
          <p className="text-gray-500 text-center py-16">
            {lang === 'fr' ? 'Aucun appartement ne correspond aux filtres.' : 'No apartments match the filters.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map(apt => <ApartmentCard key={apt.id} apartment={apt} />)}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer id="contact" className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="font-bold text-lg mb-2 text-gray-900">Location Moulinet</p>
            <p className="text-gray-400 text-sm">Rouen, Centre-ville</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
            <a href="mailto:location.moulinet@gmail.com"
              className="text-teal hover:text-gray-900 text-sm transition-colors">
              location.moulinet@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-300">
          © {new Date().getFullYear()} Location Moulinet
        </div>
      </footer>
    </div>
  )
}
