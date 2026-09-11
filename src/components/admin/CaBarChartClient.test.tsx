import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaBarChartClient from '@/components/admin/CaBarChartClient'
import type { CaMonthRow } from '@/lib/adminData'

const data: CaMonthRow[] = [
  { month: 1, building: 'Moulinet', ca_cc: 1000, ca_hc: 800 },
  { month: 1, building: 'Bons Enfants', ca_cc: 500, ca_hc: 400 },
  { month: 2, building: 'Moulinet', ca_cc: 2000, ca_hc: 1600 },
]

describe('CaBarChartClient — pilotage par props (mode/selectedBuildings)', () => {
  it('affiche le YTD en CC pour tous les bâtiments sélectionnés', () => {
    render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    // 1000 + 500 + 2000 = 3500
    expect(screen.getByText('3 500 €')).toBeInTheDocument()
  })

  it('affiche le YTD en HC quand mode=hc', () => {
    render(<CaBarChartClient data={data} mode="hc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    // 800 + 400 + 1600 = 2800
    expect(screen.getByText('2 800 €')).toBeInTheDocument()
  })

  it('exclut les bâtiments non sélectionnés du YTD', () => {
    render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet'])} />)
    // 1000 + 2000 = 3000 (Bons Enfants exclu)
    expect(screen.getByText('3 000 €')).toBeInTheDocument()
  })

  it('affiche la légende des bâtiments quand il y en a plusieurs', () => {
    render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    expect(screen.getByText('Moulinet')).toBeInTheDocument()
    expect(screen.getByText('Bons Enfants')).toBeInTheDocument()
  })

  it("n'affiche pas de légende bâtiment pour un seul bâtiment", () => {
    const singleBuildingData: CaMonthRow[] = [{ month: 1, building: 'Moulinet', ca_cc: 1000, ca_hc: 800 }]
    render(<CaBarChartClient data={singleBuildingData} mode="cc" selectedBuildings={new Set(['Moulinet'])} />)
    expect(screen.queryByText('Moulinet')).not.toBeInTheDocument()
  })
})

describe('CaBarChartClient — construction HTML/CSS (plus de SVG)', () => {
  // Deux tentatives SVG précédentes ont échoué : calc() en attribut de présentation SVG
  // (barres retombant à x invalide, collées à gauche de l'échelle), puis viewBox +
  // preserveAspectRatio="none" (étirement/déformation dès que la largeur réelle du
  // conteneur diffère du viewBox fixe). Le graphique est maintenant en HTML/CSS pur.

  it("n'utilise plus aucun SVG", () => {
    const { container } = render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('positionne les 12 mois avec des pourcentages CSS simples (pas de calc(), pas de viewBox)', () => {
    const { container } = render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    const monthLabels = screen.getAllByText(/^(Jan|Fév|Mar|Avr|Mai|Jun|Jul|Aoû|Sep|Oct|Nov|Déc)$/)
    expect(monthLabels).toHaveLength(12)

    // Les barres sont les éléments positionnés en absolute avec un style left en %.
    const barSlots = Array.from(container.querySelectorAll('[style*="left"]')).filter(
      el => el.getAttribute('style')?.includes('%')
    )
    expect(barSlots.length).toBeGreaterThanOrEqual(12)
    for (const el of barSlots) {
      const style = el.getAttribute('style') ?? ''
      expect(style).not.toMatch(/calc\(/)
    }
  })

  it('la colonne d\'échelle a une largeur fixe dédiée (jamais recouverte par les barres)', () => {
    const { container } = render(<CaBarChartClient data={data} mode="cc" selectedBuildings={new Set(['Moulinet', 'Bons Enfants'])} />)
    // Premier enfant du conteneur flex = colonne d'échelle, largeur fixe en px (40).
    const flexRow = container.querySelector('.flex[style*="min-width"]')!
    const axisColumn = flexRow.firstElementChild as HTMLElement
    expect(axisColumn.style.width).toBe('40px')
  })

  it('affiche toujours les 5 valeurs de l\'échelle même avec une barre de janvier très haute', () => {
    const januaryDominant: CaMonthRow[] = [
      { month: 1, building: 'Moulinet', ca_cc: 10000, ca_hc: 8000 },
    ]
    render(<CaBarChartClient data={januaryDominant} mode="cc" selectedBuildings={new Set(['Moulinet'])} />)
    // maxValue = 10000 → labels attendus : 0, 2.5k, 5k, 7.5k, 10k
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('2.5k')).toBeInTheDocument()
    expect(screen.getByText('5k')).toBeInTheDocument()
    expect(screen.getByText('7.5k')).toBeInTheDocument()
    // "10k" apparaît deux fois : le libellé d'échelle (haut de l'axe) ET l'étiquette de
    // valeur de la barre de janvier elle-même (maxValue = total de cette barre unique).
    expect(screen.getAllByText('10k').length).toBeGreaterThanOrEqual(1)
  })
})
