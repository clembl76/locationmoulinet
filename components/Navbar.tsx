'use client'

import LanguageSwitch from './LanguageSwitch'
import { useLang } from '@/context/LanguageContext'

export default function Navbar() {
  const { lang } = useLang()

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="text-blue-primary font-bold text-xl tracking-tight">
          Location Moulinet
        </span>
        <div className="flex items-center gap-6">
          <a
            href="#apartments"
            className="text-gray-600 hover:text-blue-primary text-sm font-medium transition-colors"
          >
            {lang === 'fr' ? 'Appartements' : 'Apartments'}
          </a>
          <a
            href="#contact"
            className="text-gray-600 hover:text-blue-primary text-sm font-medium transition-colors"
          >
            Contact
          </a>
          <a
            href="/visiter"
            className="bg-blue-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors"
          >
            {lang === 'fr' ? 'Prendre RDV' : 'Book a visit'}
          </a>
          <LanguageSwitch />
        </div>
      </div>
    </nav>
  )
}
