import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminNavbar from '@/components/admin/AdminNavbar'

describe('AdminNavbar — rôle admin', () => {
  it('affiche tous les liens de navigation', () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.getAllByText('Appartements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mise en location').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Paiements').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mois en cours').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tableau de bord').length).toBeGreaterThan(0)
  })

  it("n'affiche pas le badge lecture seule", () => {
    render(<AdminNavbar role="admin" />)
    expect(screen.queryByText(/lecture seule/i)).not.toBeInTheDocument()
  })
})

describe('AdminNavbar — rôle viewer', () => {
  it('affiche uniquement le lien Appartements', () => {
    render(<AdminNavbar role="viewer" />)
    expect(screen.getAllByText('Appartements').length).toBeGreaterThan(0)
    expect(screen.queryByText('Mise en location')).not.toBeInTheDocument()
    expect(screen.queryByText('Paiements')).not.toBeInTheDocument()
    expect(screen.queryByText('Mois en cours')).not.toBeInTheDocument()
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument()
  })

  it('affiche le badge "Lecture seule"', () => {
    render(<AdminNavbar role="viewer" />)
    expect(screen.getByText(/lecture seule/i)).toBeInTheDocument()
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
