'use client'

import { useState } from 'react'
import LanguageSwitch from './LanguageSwitch'
import { useLang } from '@/context/LanguageContext'

export default function Navbar() {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="text-blue-primary font-bold text-lg sm:text-xl tracking-tight whitespace-nowrap">
          Location Moulinet
        </span>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 sm:gap-4">
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

        {/* Hamburger button */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
          <a
            href="/visiter"
            onClick={() => setOpen(false)}
            className="block w-full text-center bg-blue-primary text-white text-sm font-semibold px-4 py-3 rounded-lg hover:bg-blue-dark transition-colors"
          >
            {lang === 'fr' ? 'Visiter' : 'Book a visit'}
          </a>
          <a
            href="/candidater"
            onClick={() => setOpen(false)}
            className="block w-full text-center bg-white text-blue-primary text-sm font-semibold px-4 py-3 rounded-lg border border-blue-primary hover:bg-blue-light transition-colors"
          >
            {lang === 'fr' ? 'Déposer mon dossier' : 'Apply'}
          </a>
          <div className="flex justify-center">
            <LanguageSwitch />
          </div>
        </div>
      )}
    </nav>
  )
}
