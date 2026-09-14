import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '@/components/admin/StatCard'

describe('StatCard — affichage', () => {
  it('affiche le label et la valeur', () => {
    render(<StatCard label="Total" value={20} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('affiche le sous-texte quand il est fourni', () => {
    render(<StatCard label="Taux d'occupation moyen" value="94 %" sub="Moyenne mensuelle depuis janvier" />)
    expect(screen.getByText('Moyenne mensuelle depuis janvier')).toBeInTheDocument()
  })

  it("n'affiche pas de sous-texte quand il n'est pas fourni", () => {
    render(<StatCard label="Total" value={20} />)
    expect(screen.queryByText(/moyenne/i)).not.toBeInTheDocument()
  })
})

describe('StatCard — couleur de la valeur', () => {
  it('applique text-gray-900 par défaut', () => {
    render(<StatCard label="Total" value={20} />)
    expect(screen.getByText('20')).toHaveClass('text-gray-900')
  })

  it('applique la classe valueColor fournie à la place de la couleur par défaut', () => {
    render(<StatCard label="Loués" value={18} valueColor="text-green-700" />)
    const value = screen.getByText('18')
    expect(value).toHaveClass('text-green-700')
    expect(value).not.toHaveClass('text-gray-900')
  })
})

describe('StatCard — lien optionnel', () => {
  it('rend un lien cliquable quand href est fourni', () => {
    render(<StatCard label="Loués" value={18} href="/admin/apartments?status=loue" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/apartments?status=loue')
  })

  it("ne rend pas de lien quand href n'est pas fourni", () => {
    render(<StatCard label="Total" value={20} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
