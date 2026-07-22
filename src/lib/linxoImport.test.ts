import { describe, it, expect } from 'vitest'
import { detectSource, KNOWN_LINXO_SOURCES } from '@/lib/linxoImport'

describe('detectSource', () => {
  it('reconnaît Moulinet', () => {
    expect(detectSource('Moulinet.csv')).toBe('moulinet')
    expect(detectSource('export_Moulinet_juillet2026.csv')).toBe('moulinet')
  })

  it('reconnaît Bons Enfants (toutes variantes de séparateur)', () => {
    expect(detectSource('BonsEnfants.csv')).toBe('bonsenfants')
    expect(detectSource('Bons-Enfants-2026.csv')).toBe('bonsenfants')
    expect(detectSource('bons_enfants.csv')).toBe('bonsenfants')
  })

  it('reconnaît Vieux Palais (toutes variantes de séparateur)', () => {
    expect(detectSource('VieuxPalais.csv')).toBe('vieuxpalais')
    expect(detectSource('vieux-palais.csv')).toBe('vieuxpalais')
    expect(detectSource('vieux_palais.csv')).toBe('vieuxpalais')
    expect(detectSource('Export Vieux Palais.csv')).toBe('vieuxpalais')
  })

  it('reconnaît Renard', () => {
    expect(detectSource('Renard.csv')).toBe('renard')
    expect(detectSource('Linxo_Renard_juillet2026.csv')).toBe('renard')
    expect(detectSource('Export Renard.csv')).toBe('renard')
  })

  it('insensible à la casse', () => {
    expect(detectSource('RENARD.CSV')).toBe('renard')
    expect(detectSource('MOULINET.csv')).toBe('moulinet')
  })

  it('fichier non reconnu : liste fermée, retourne null (ne doit pas être traité)', () => {
    expect(detectSource('inconnu.csv')).toBeNull()
    expect(detectSource('Export-2026-07.csv')).toBeNull()
    expect(detectSource('locataires.csv')).toBeNull()
  })

  it('perso n\'est plus une source acceptée (exclue de la liste fermée)', () => {
    expect(detectSource('perso.csv')).toBeNull()
    expect(detectSource('Compte-Perso-2026.csv')).toBeNull()
  })
})

describe('KNOWN_LINXO_SOURCES', () => {
  it('contient exactement les 4 sources reconnues, sans doublon', () => {
    expect(KNOWN_LINXO_SOURCES).toEqual(['moulinet', 'bonsenfants', 'vieuxpalais', 'renard'])
    expect(new Set(KNOWN_LINXO_SOURCES).size).toBe(KNOWN_LINXO_SOURCES.length)
  })
})
