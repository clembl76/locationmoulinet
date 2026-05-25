import { describe, it, expect } from 'vitest'
import { SURFACE_TYPES, SURFACE_MATERIALS, ROOM_TYPES } from '@/lib/surfacesConstants'

describe('surfacesConstants — SURFACE_TYPES', () => {
  it('contient les types de base', () => {
    expect(SURFACE_TYPES).toContain('Mur')
    expect(SURFACE_TYPES).toContain('Sol')
    expect(SURFACE_TYPES).toContain('Plafond')
    expect(SURFACE_TYPES).toContain('Porte (y compris cadre, poignée)')
  })

  it('contient les types électriques et ventilation', () => {
    expect(SURFACE_TYPES).toContain('Prises électriques')
    expect(SURFACE_TYPES).toContain('Interrupteurs')
    expect(SURFACE_TYPES).toContain('Point lumière')
    expect(SURFACE_TYPES).toContain('Ventilation')
  })

  it('contient les types Prise', () => {
    expect(SURFACE_TYPES).toContain('Prise câble')
    expect(SURFACE_TYPES).toContain('Prise Fibre')
    expect(SURFACE_TYPES).toContain('Prise RJ45')
    expect(SURFACE_TYPES).toContain('Prise téléphone')
    expect(SURFACE_TYPES).toContain('Prise télévision')
  })

  it('contient les types Spot et Plafonnier', () => {
    expect(SURFACE_TYPES).toContain('Plafonnier (Ampoule + Douille)')
    expect(SURFACE_TYPES).toContain('Spot 1 lumière')
    expect(SURFACE_TYPES).toContain('Spot 2 lumières')
    expect(SURFACE_TYPES).toContain('Spot 3 lumières')
  })

  it('est trié alphabétiquement', () => {
    const sorted = [...SURFACE_TYPES].sort((a, b) => a.localeCompare(b, 'fr'))
    expect([...SURFACE_TYPES]).toEqual(sorted)
  })

  it('ne contient pas de doublons', () => {
    expect(new Set(SURFACE_TYPES).size).toBe(SURFACE_TYPES.length)
  })
})

describe('surfacesConstants — SURFACE_MATERIALS', () => {
  it('contient les matières attendues', () => {
    expect(SURFACE_MATERIALS).toContain('Peinture')
    expect(SURFACE_MATERIALS).toContain('Parquet')
    expect(SURFACE_MATERIALS).toContain('Carrelage/faïence')
    expect(SURFACE_MATERIALS).toContain('PVC')
    expect(SURFACE_MATERIALS).toContain('Bois')
  })

  it('est trié alphabétiquement', () => {
    const sorted = [...SURFACE_MATERIALS].sort((a, b) => a.localeCompare(b, 'fr'))
    expect([...SURFACE_MATERIALS]).toEqual(sorted)
  })

  it('ne contient pas de doublons', () => {
    expect(new Set(SURFACE_MATERIALS).size).toBe(SURFACE_MATERIALS.length)
  })
})

describe('surfacesConstants — ROOM_TYPES', () => {
  it('contient les pièces standard', () => {
    expect(ROOM_TYPES).toContain('Chambre')
    expect(ROOM_TYPES).toContain('Cuisine')
    expect(ROOM_TYPES).toContain('Salle de bains')
    expect(ROOM_TYPES).toContain('Toilettes')
    expect(ROOM_TYPES).toContain('Entrée')
    expect(ROOM_TYPES).toContain('Cave')
  })

  it('ne contient pas de doublons', () => {
    expect(new Set(ROOM_TYPES).size).toBe(ROOM_TYPES.length)
  })

  it('est cohérent avec les room_type utilisés dans InventoryManager', () => {
    // Ces valeurs doivent correspondre à l'enum room_type Supabase
    expect(ROOM_TYPES).toContain('Indifférent')
    expect(ROOM_TYPES).toContain('Partout')
  })
})
