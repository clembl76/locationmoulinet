'use client'

import LanguageSwitch from './LanguageSwitch'
import { useLang } from '@/context/LanguageContext'

export default function Navbar() {
  const { lang } = useLang()

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <span className="text-blue-primary font-bold text-lg sm:text-xl tracking-tight whitespace-nowrap">
          Location Moulinet
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/visiter"
            className="bg-blue-primary text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors whitespace-nowrap"
          >
            {lang === 'fr' ? 'Visiter' : 'Book a visit'}
          </a>
          <a
            href="/candidater"
            className="bg-white text-blue-primary text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg border border-blue-primary hover:bg-blue-light transition-colors whitespace-nowrap"
          >
            {lang === 'fr' ? 'Déposer mon dossier' : 'Apply'}
          </a>
          <LanguageSwitch />
        </div>
      </div>
    </nav>
  )
}
