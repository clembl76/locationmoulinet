'use client'

import { useState } from 'react'
import type { SessionRole } from '@/lib/session'

const ALL_NAV_LINKS = [
  { href: '/admin/mise-en-location', label: 'Mise en location', adminOnly: true },
  { href: '/admin/apartments', label: 'Appartements', adminOnly: false },
  { href: '/admin/payments', label: 'Paiements', adminOnly: true },
  { href: '/admin/mois', label: 'Mois en cours', adminOnly: true },
  { href: '/admin', label: 'Tableau de bord', adminOnly: true },
]

export default function AdminNavbar({ role }: { role: SessionRole }) {
  const [open, setOpen] = useState(false)
  const navLinks = ALL_NAV_LINKS.filter(l => !l.adminOnly || role === 'admin')

  return (
    <header className="bg-blue-dark text-white sticky top-0 z-50">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-sm tracking-wide whitespace-nowrap">
            Location Moulinet
          </a>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-4 text-sm text-blue-light/80">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="hover:text-white transition-colors whitespace-nowrap">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {role === 'viewer' && (
            <span className="hidden md:block text-xs text-blue-light/40 italic">Lecture seule</span>
          )}
          <a href="/admin/logout" className="hidden md:block text-xs text-blue-light/60 hover:text-white transition-colors">
            Déconnexion
          </a>
          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-blue-dark px-4 py-4 flex flex-col gap-1">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm text-blue-light/80 hover:text-white transition-colors border-b border-white/5 last:border-0"
            >
              {link.label}
            </a>
          ))}
          {role === 'viewer' && (
            <p className="pt-2 text-xs text-blue-light/40 italic">Accès lecture seule</p>
          )}
          <a
            href="/admin/logout"
            onClick={() => setOpen(false)}
            className="block pt-3 text-xs text-blue-light/40 hover:text-white transition-colors"
          >
            Déconnexion
          </a>
        </div>
      )}
    </header>
  )
}
