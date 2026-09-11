import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardAnnualClient from '@/components/admin/DashboardAnnualClient'
import type { CaMonthRow, OccupationMonthRow, LeaseDurationRow } from '@/lib/adminData'

const caByMonth: CaMonthRow[] = [
  { month: 1, building: 'Moulinet', ca_cc: 1000, ca_hc: 800 },
  { month: 1, building: 'Bons Enfants', ca_cc: 500, ca_hc: 400 },
]

const occupationByMonth: OccupationMonthRow[] = [
  { month: 1, building: 'Moulinet', occupied: 1, total: 2 },
  { month: 1, building: 'Bons Enfants', occupied: 2, total: 2 },
]

const leaseDurations: LeaseDurationRow[] = [
  { building: 'Moulinet', move_in_date: '2024-01-01', move_out_date: '2025-01-01' }, // 1 an
  { building: 'Bons Enfants', move_in_date: '2024-01-01', move_out_date: '2026-01-01' }, // 2 ans
]

const defaultProps = { year: 2026, caByMonth, occupationByMonth, leaseDurations }

// La valeur du CA encaissé YTD apparaît aussi dans l'en-tête du bar chart (même calcul,
// intentionnellement cohérent) — on cible donc précisément la StatCard "Indicateurs".
// Intl.NumberFormat('fr-FR', {style:'currency'}) utilise une espace insécable fine (U+202F)
// comme séparateur de milliers — normalisée en espace simple pour simplifier les assertions.
function ytdCardValue(): string | null {
  const label = screen.getByText('CA encaissé YTD')
  const raw = label.parentElement!.querySelector('p.text-3xl')!.textContent
  return raw ? raw.replace(/\s/g, ' ') : raw
}

describe('DashboardAnnualClient — ordre des blocs', () => {
  it('affiche le bloc "CA encaissé" avant le bloc "Indicateurs"', () => {
    render(<DashboardAnnualClient {...defaultProps} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
    const caIdx = headings.findIndex(h => h?.includes('CA encaissé'))
    const indicateursIdx = headings.findIndex(h => h?.includes('Indicateurs'))
    expect(caIdx).toBeGreaterThanOrEqual(0)
    expect(caIdx).toBeLessThan(indicateursIdx)
  })
})

describe('DashboardAnnualClient — filtres partagés entre le graphique et les indicateurs', () => {
  it('tous les bâtiments sont sélectionnés par défaut', () => {
    render(<DashboardAnnualClient {...defaultProps} />)
    // CA encaissé YTD = 1000 + 500 = 1 500 €
    expect(ytdCardValue()).toBe('1 500 €')
    // Taux d'occupation : agrégé (1+2)/(2+2) = 75%
    expect(screen.getByText('75 %')).toBeInTheDocument()
    // Durée moyenne : (1+2)/2 = 1.5 ans
    expect(screen.getByText('1.5 ans')).toBeInTheDocument()
  })

  it('désélectionner un bâtiment met à jour à la fois le CA et les indicateurs', async () => {
    const user = userEvent.setup()
    render(<DashboardAnnualClient {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Bons Enfants' }))

    // CA encaissé YTD ne garde que Moulinet : 1000 €
    expect(ytdCardValue()).toBe('1 000 €')
    // Taux d'occupation ne garde que Moulinet : 1/2 = 50%
    expect(screen.getByText('50 %')).toBeInTheDocument()
    // Durée moyenne ne garde que Moulinet : 1 an
    expect(screen.getByText('1 ans')).toBeInTheDocument()
  })

  it('le mode HC change le CA encaissé YTD mais pas les autres indicateurs', async () => {
    const user = userEvent.setup()
    render(<DashboardAnnualClient {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Loyers HC' }))

    // CA encaissé YTD en HC : 800 + 400 = 1 200 €
    expect(ytdCardValue()).toBe('1 200 €')
    // Taux d'occupation et durée inchangés (non liés au mode CC/HC)
    expect(screen.getByText('75 %')).toBeInTheDocument()
    expect(screen.getByText('1.5 ans')).toBeInTheDocument()
  })
})
