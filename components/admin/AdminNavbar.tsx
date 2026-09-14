'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import type { SessionRole } from '@/lib/session'

const ALL_NAV_LINKS = [
  { href: '/admin/mise-en-location', label: 'Mise en location', adminOnly: false },
  { href: '/admin/apartments', label: 'Appartements', adminOnly: false },
  { href: '/admin/inventory', label: 'Inventaire', adminOnly: true },
  { href: '/admin/payments', label: 'Paiements', adminOnly: true },
  { href: '/admin/actions', label: 'Actions', adminOnly: true },
  { href: '/admin', label: 'Tableau de bord', adminOnly: true },
]

export default function AdminNavbar({ role }: { role: SessionRole }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = ALL_NAV_LINKS.filter(l => !l.adminOnly || role === 'admin')
  const isActive = (href: string) => href === '/admin' ? pathname === href : pathname?.startsWith(href)

  return (
    <header className="bg-white text-gray-900 border-b border-gray-100 sticky top-0 z-50 print:hidden">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-sm tracking-wide whitespace-nowrap">
            Location Moulinet
          </a>
          {/* Desktop nav */}
          <nav className="hidden md:flex gap-5 text-sm">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`transition-colors whitespace-nowrap pb-1 ${
                  isActive(link.href)
                    ? 'text-gray-900 font-semibold border-b-2 border-teal'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {role === 'viewer' && (
            <span className="hidden md:block text-xs text-gray-400 italic">Lecture seule</span>
          )}
          <a href="/admin/logout" className="hidden md:block text-xs font-semibold text-gray-600 border border-gray-200 rounded-full px-4 py-2 hover:border-gray-300 transition-colors">
            Déconnexion
          </a>
          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-11 h-11 gap-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-1">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block py-3 text-sm transition-colors border-b border-gray-50 last:border-0 ${
                isActive(link.href) ? 'text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {link.label}
            </a>
          ))}
          {role === 'viewer' && (
            <p className="pt-2 text-xs text-gray-400 italic">Accès lecture seule</p>
          )}
          <a
            href="/admin/logout"
            onClick={() => setOpen(false)}
            className="block pt-3 text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            Déconnexion
          </a>
        </div>
      )}
    </header>
  )
}
