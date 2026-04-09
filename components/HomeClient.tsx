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
    <section className="py-16 px-4 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-dark text-center mb-12 max-w-2xl mx-auto leading-snug">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {benefits.map(b => (
            <div key={b.title} className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-light flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const statusDefs: { key: ApartmentStatus; labelFr: string; labelEn: string; cls: string }[] = [
    { key: 'available', labelFr: 'Disponible', labelEn: 'Available', cls: 'bg-green-100 text-green-700 border-green-200' },
    { key: 'soon', labelFr: 'Prochainement', labelEn: 'Coming soon', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    { key: 'rented', labelFr: 'Loué', labelEn: 'Rented', cls: 'bg-red-100 text-red-600 border-red-200' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-8 space-y-3">
      {/* Ligne 1 : statuts */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
          {lang === 'fr' ? 'Statut' : 'Status'}
        </span>
        {statusDefs.map(({ key, labelFr, labelEn, cls }) => {
          const active = filters.statuses.has(key)
          return (
            <button key={key} onClick={() => toggleStatus(key)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                active ? cls : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
              {lang === 'fr' ? labelFr : labelEn}
            </button>
          )
        })}
      </div>

      {/* Ligne 2 : réglettes côte à côte */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">{lang === 'fr' ? 'Surface max.' : 'Max. area'}</span>
            <span className="text-xs font-semibold text-blue-primary">
              {filters.maxSurface === surfaceBounds[1]
                ? lang === 'fr' ? 'Tous' : 'All'
                : `≤ ${filters.maxSurface} m²`}
            </span>
          </div>
          <input type="range" min={surfaceBounds[0]} max={surfaceBounds[1]} step={1}
            value={filters.maxSurface}
            onChange={e => onChange({ ...filters, maxSurface: Number(e.target.value) })}
            className="w-full accent-blue-primary h-1" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">{lang === 'fr' ? 'Prix CC max.' : 'Max. price'}</span>
            <span className="text-xs font-semibold text-blue-primary">
              {filters.maxPrice === priceBounds[1]
                ? lang === 'fr' ? 'Tous' : 'All'
                : `≤ ${filters.maxPrice} €`}
            </span>
          </div>
          <input type="range" min={priceBounds[0]} max={priceBounds[1]} step={10}
            value={filters.maxPrice}
            onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full accent-blue-primary h-1" />
        </div>
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
      <section className="bg-blue-light py-20 px-4 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-blue-primary uppercase mb-4">
          Rouen &nbsp;·&nbsp; Centre-ville
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-blue-dark leading-tight">
          {lang === 'fr' ? 'Studios meublés à louer' : 'Furnished studios for rent'}
        </h1>
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

        <div className="flex justify-center mb-8">
          <a
            href="/visiter"
            className="inline-block bg-blue-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-dark transition-colors text-sm"
          >
            {lang === 'fr' ? 'Prendre rendez-vous pour une visite' : 'Book a visit'}
          </a>
        </div>

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
      <footer id="contact" className="bg-blue-dark text-white py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="font-bold text-lg mb-2">Location Moulinet</p>
            <p className="text-blue-light/70 text-sm">Rouen, Centre-ville</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-light/80 uppercase tracking-wider mb-2">Contact</p>
            <a href="mailto:location.moulinet@gmail.com"
              className="text-blue-light hover:text-white text-sm transition-colors">
              location.moulinet@gmail.com
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/10 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Location Moulinet
        </div>
      </footer>
    </div>
  )
}
