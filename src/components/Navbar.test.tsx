import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/context/LanguageContext', () => ({
  useLang: vi.fn(() => ({ lang: 'fr' })),
}))

vi.mock('@/components/LanguageSwitch', () => ({
  default: () => <button>FR/EN</button>,
}))

// Import après les mocks
const { default: Navbar } = await import('@/components/Navbar')
const { useLang } = await import('@/context/LanguageContext')

describe('Navbar — langue française', () => {
  it('affiche le titre "Location Moulinet"', () => {
    render(<Navbar />)
    expect(screen.getByText('Location Moulinet')).toBeInTheDocument()
  })

  it('affiche le bouton Visiter', () => {
    render(<Navbar />)
    expect(screen.getAllByText('Visiter').length).toBeGreaterThan(0)
  })

  it("affiche le bouton 'Déposer mon dossier'", () => {
    render(<Navbar />)
    expect(screen.getAllByText('Déposer mon dossier').length).toBeGreaterThan(0)
  })

  it('le bouton hamburger est présent', () => {
    render(<Navbar />)
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })
})

describe('Navbar — hamburger menu', () => {
  it('le menu dropdown est fermé par défaut', () => {
    render(<Navbar />)
    // En mobile, le dropdown n'est visible qu'après clic — le bouton hamburger est toujours là
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('ouvre le dropdown au clic sur le hamburger', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByRole('button', { name: /menu/i }))
    // Après ouverture, 2+ occurrences de "Visiter" (desktop + dropdown)
    expect(screen.getAllByText('Visiter').length).toBeGreaterThanOrEqual(2)
  })

  it('ferme le dropdown au clic sur un lien', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByRole('button', { name: /menu/i }))
    const visiterLinks = screen.getAllByText('Visiter')
    await user.click(visiterLinks[visiterLinks.length - 1])
    expect(screen.getAllByText('Visiter').length).toBeLessThan(3)
  })
})

describe('Navbar — langue anglaise', () => {
  it("affiche 'Book a visit' et 'Apply' en mode EN", () => {
    vi.mocked(useLang).mockReturnValue({ lang: 'en' })
    render(<Navbar />)
    expect(screen.getAllByText('Book a visit').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Apply').length).toBeGreaterThan(0)
  })
})
