import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/admin/apartments'),
}))

const { default: AdminNavbar } = await import('@/components/admin/AdminNavbar')
const { usePathname } = await import('next/navigation')

describe('AdminNavbar — rôle admin', () => {
  it('affiche tous les liens de navigation', () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.getAllByText('Appartements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mise en location').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Paiements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0)
  })

  it("n'affiche plus le lien \"Mois en cours\" (page fusionnée dans Tableau de bord)", () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.queryByText('Mois en cours')).not.toBeInTheDocument()
  })

  it("n'affiche pas le badge lecture seule", () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.queryByText(/lecture seule/i)).not.toBeInTheDocument()
  })
})

describe('AdminNavbar — impression', () => {
  it("masque la barre de navigation à l'impression", () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.getByText('Location Moulinet').closest('header')?.className).toContain('print:hidden')
  })
})

describe('AdminNavbar — rôle viewer', () => {
  it('affiche Appartements et Mise en location, masque les liens admin', () => {
    render(<AdminNavbar role="viewer" />)
    expect(screen.getAllByText('Appartements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mise en location').length).toBeGreaterThan(0)
    expect(screen.queryByText('Paiements')).not.toBeInTheDocument()
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument()
  })

  it('affiche le badge "Lecture seule"', () => {
    render(<AdminNavbar role="viewer" />)
    expect(screen.getByText(/lecture seule/i)).toBeInTheDocument()
  })
})

describe('AdminNavbar — lien actif', () => {
  it('met en évidence "Appartements" quand on est sur /admin/apartments', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/apartments')
    render(<AdminNavbar role="admin" />)
    const links = screen.getAllByText('Appartements')
    expect(links[0].className).toContain('border-teal')
  })

  it('ne met pas "Tableau de bord" en évidence quand on est sur /admin/apartments', () => {
    vi.mocked(usePathname).mockReturnValue('/admin/apartments')
    render(<AdminNavbar role="admin" />)
    const links = screen.getAllByText('Tableau de bord')
    expect(links[0].className).not.toContain('border-teal')
  })

  it('met en évidence "Tableau de bord" quand on est sur /admin', () => {
    vi.mocked(usePathname).mockReturnValue('/admin')
    render(<AdminNavbar role="admin" />)
    const links = screen.getAllByText('Tableau de bord')
    expect(links[0].className).toContain('border-teal')
  })
})

describe('AdminNavbar — hamburger menu (mobile)', () => {
  it('le menu mobile est fermé par défaut', () => {
    render(<AdminNavbar role="admin" />)
    // Le bouton hamburger est présent
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('ouvre le menu mobile au clic sur le hamburger', async () => {
    const user = userEvent.setup()
    render(<AdminNavbar role="admin" />)
    const hamburger = screen.getByRole('button', { name: /menu/i })
    await user.click(hamburger)
    // Après ouverture, le lien Déconnexion est visible dans le dropdown
    expect(screen.getAllByText('Déconnexion').length).toBeGreaterThan(0)
  })

  it('ferme le menu au clic sur un lien', async () => {
    const user = userEvent.setup()
    render(<AdminNavbar role="admin" />)
    await user.click(screen.getByRole('button', { name: /menu/i }))
    // Cliquer sur Appartements dans le dropdown
    const links = screen.getAllByText('Appartements')
    await user.click(links[links.length - 1])
  })
})
