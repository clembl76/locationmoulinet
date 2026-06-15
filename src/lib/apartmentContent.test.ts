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
  it('Moulinet (FR) — charges incluent eau chaude/électricité/chauffage/wifi', () => {
    const bullets = getChargesBullets('Moulinet', 'fr')
    expect(bullets).toContain('Eau froide, eau chaude, électricité, chauffage, wifi inclus.')
  })

  it('Vieux Palais (FR) — électricité non incluse, TOM + syndic', () => {
    const bullets = getChargesBullets('Vieux Palais', 'fr')
    expect(bullets).toContain('Les charges comprennent : Eau froide, TOM, syndic. Electricité non incluse.')
  })

  it('Bons Enfants et Renard (FR) — même liste que Vieux Palais', () => {
    const reference = getChargesBullets('Vieux Palais', 'fr')
    expect(getChargesBullets('Bons Enfants', 'fr')).toEqual(reference)
    expect(getChargesBullets('Renard', 'fr')).toEqual(reference)
  })

  it('Vieux Palais (EN) — electricity not included', () => {
    const bullets = getChargesBullets('Vieux Palais', 'en')
    expect(bullets.some(b => b.includes('Electricity not included'))).toBe(true)
  })

  it('toutes les listes contiennent 4 puces', () => {
    expect(getChargesBullets('Moulinet', 'fr')).toHaveLength(4)
    expect(getChargesBullets('Renard', 'fr')).toHaveLength(4)
  })

  it('immeuble inconnu ou null — retombe sur la liste Moulinet', () => {
    expect(getChargesBullets('Autre Immeuble', 'fr')).toEqual(getChargesBullets('Moulinet', 'fr'))
    expect(getChargesBullets(null, 'en')).toEqual(getChargesBullets('Moulinet', 'en'))
  })
})
