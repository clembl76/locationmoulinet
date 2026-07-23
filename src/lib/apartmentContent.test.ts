import { describe, it, expect } from 'vitest'
import { getQuartierContent, getChargesBullets } from '@/lib/apartmentContent'

describe('getQuartierContent', () => {
  it('Moulinet (FR) — quartier calme proche gare', () => {
    expect(getQuartierContent('Moulinet', 'fr')).toContain('Quartier calme')
  })

  it('Moulinet (EN) — quiet neighbourhood', () => {
    expect(getQuartierContent('Moulinet', 'en')).toContain('Quiet neighbourhood')
  })

  it('Vieux Palais (FR) — quartier hyper centre', () => {
    expect(getQuartierContent('Vieux Palais', 'fr')).toContain('hyper centre')
    expect(getQuartierContent('Vieux Palais', 'fr')).toContain('Métro Palais de Justice : 6 min à pied')
  })

  it('Bons Enfants (FR) — même contenu que Vieux Palais', () => {
    expect(getQuartierContent('Bons Enfants', 'fr')).toBe(getQuartierContent('Vieux Palais', 'fr'))
  })

  it('Vieux Palais / Bons Enfants (EN) — heart of the city centre', () => {
    expect(getQuartierContent('Vieux Palais', 'en')).toContain('Heart of the city centre')
  })

  it('Renard (FR) — quartier proche centre-ville et transports', () => {
    expect(getQuartierContent('Renard', 'fr')).toContain('proche centre-ville et transports')
    expect(getQuartierContent('Renard', 'fr')).toContain('Gare SNCF et Métro: 17 min à pied')
  })

  it('Renard (EN) — neighbourhood close to the city centre', () => {
    expect(getQuartierContent('Renard', 'en')).toContain('Neighbourhood close to the city centre')
  })

  it('immeuble inconnu ou null — retombe sur le contenu Moulinet', () => {
    expect(getQuartierContent('Autre Immeuble', 'fr')).toBe(getQuartierContent('Moulinet', 'fr'))
    expect(getQuartierContent(null, 'fr')).toBe(getQuartierContent('Moulinet', 'fr'))
    expect(getQuartierContent(undefined, 'en')).toBe(getQuartierContent('Moulinet', 'en'))
  })
})

describe('getChargesBullets', () => {
  it('forfait_total (FR) — charges incluent eau chaude/électricité/chauffage/wifi (Moulinet)', () => {
    const bullets = getChargesBullets('forfait_total', 'fr')
    expect(bullets).toContain('Eau froide, eau chaude, électricité, chauffage, wifi inclus.')
  })

  it('forfait_partiel (FR) — électricité et internet non inclus (Vieux Palais, Bons Enfants)', () => {
    const bullets = getChargesBullets('forfait_partiel', 'fr')
    expect(bullets).toContain('Forfait de charges : eau froide, TOM, syndic inclus. Électricité et internet non inclus.')
  })

  it('reel (FR) — charges au réel, pas de forfait (Renard)', () => {
    const bullets = getChargesBullets('reel', 'fr')
    expect(bullets).toContain('Charges au réel selon consommation (eau, électricité, chauffage) — pas de forfait.')
  })

  it('reel et forfait_partiel produisent des listes différentes', () => {
    expect(getChargesBullets('reel', 'fr')).not.toEqual(getChargesBullets('forfait_partiel', 'fr'))
  })

  it('forfait_partiel (EN) — electricity and internet not included', () => {
    const bullets = getChargesBullets('forfait_partiel', 'en')
    expect(bullets.some(b => b.includes('Electricity and internet not included'))).toBe(true)
  })

  it('reel (EN) — billed based on actual consumption', () => {
    const bullets = getChargesBullets('reel', 'en')
    expect(bullets.some(b => b.includes('actual consumption'))).toBe(true)
  })

  it('toutes les listes contiennent 4 puces', () => {
    expect(getChargesBullets('forfait_total', 'fr')).toHaveLength(4)
    expect(getChargesBullets('forfait_partiel', 'fr')).toHaveLength(4)
    expect(getChargesBullets('reel', 'fr')).toHaveLength(4)
  })

  it('valeur inconnue ou null — retombe sur la liste forfait_total', () => {
    expect(getChargesBullets('valeur_inconnue', 'fr')).toEqual(getChargesBullets('forfait_total', 'fr'))
    expect(getChargesBullets(null, 'en')).toEqual(getChargesBullets('forfait_total', 'en'))
    expect(getChargesBullets(undefined, 'fr')).toEqual(getChargesBullets('forfait_total', 'fr'))
  })
})
