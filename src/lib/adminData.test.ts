// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc })),
}))

import {
  APARTMENT_TYPE_BUREAU, EXCLUDE_BUREAU, RENT_NOT_WRITTEN_OFF, SHORT_TERM_CA_SELECT, SHORT_TERM_OCCUPIED,
  getAvailableApartments, getApartmentsForCandidature,
  getTemporarilyUnavailableApartmentNumbers, temporarilyUnavailableMessage, APT_TEMPORARILY_UNAVAILABLE,
} from '@/lib/adminData'

describe('RENT_NOT_WRITTEN_OFF', () => {
  it('filtre sur written_off_at sans référencer la colonne directement (valide avant la migration)', () => {
    expect(RENT_NOT_WRITTEN_OFF).toBe(`(to_jsonb(r)->>'written_off_at') IS NULL`)
    expect(RENT_NOT_WRITTEN_OFF).not.toMatch(/r\.written_off_at/)
  })
})

describe('APARTMENT_TYPE_BUREAU / EXCLUDE_BUREAU', () => {
  it('APARTMENT_TYPE_BUREAU vaut "BUREAU"', () => {
    expect(APARTMENT_TYPE_BUREAU).toBe('BUREAU')
  })

  it('EXCLUDE_BUREAU est dérivé de APARTMENT_TYPE_BUREAU (source unique)', () => {
    expect(EXCLUDE_BUREAU).toBe(`a.type::text != '${APARTMENT_TYPE_BUREAU}'`)
    expect(EXCLUDE_BUREAU).toContain(APARTMENT_TYPE_BUREAU)
  })
})

describe('revenus de courte durée', () => {
  it('SHORT_TERM_CA_SELECT compte le montant tel quel en CC et en HC, par mois et bâtiment', () => {
    const sql = SHORT_TERM_CA_SELECT(2022)
    expect(sql).toContain('FROM short_term_revenues s')
    expect(sql).toContain('s.amount AS ca_cc')
    expect(sql).toContain('s.amount AS ca_hc')
    expect(sql).toContain('b.short_name AS building')
    expect(sql).toContain('WHERE s.year = 2022')
  })

  it("SHORT_TERM_OCCUPIED marque l'appartement occupé le mois où il a un revenu", () => {
    const sql = SHORT_TERM_OCCUPIED('ab.id', 2022, 'm.m')
    expect(sql.startsWith('EXISTS (')).toBe(true)
    expect(sql).toContain('s.apartment_id = ab.id AND s.year = 2022 AND s.month = m.m')
  })
})

describe('indisponibilité temporaire (apartments.temporarily_unavailable)', () => {
  it('APT_TEMPORARILY_UNAVAILABLE lit la colonne via to_jsonb (valide avant la migration)', () => {
    expect(APT_TEMPORARILY_UNAVAILABLE).toBe(`COALESCE((to_jsonb(a)->>'temporarily_unavailable')::boolean, FALSE)`)
    expect(APT_TEMPORARILY_UNAVAILABLE).not.toMatch(/a\.temporarily_unavailable/)
  })

  beforeEach(() => {
    rpc.mockReset()
  })

  const A = '11111111-1111-1111-1111-111111111111'
  const B = '22222222-2222-2222-2222-222222222222'

  it('getAvailableApartments exclut les appartements désactivés (disponibles ET prochainement)', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await getAvailableApartments()
    const sql: string = rpc.mock.calls[0][1].query
    expect(sql.split(`AND NOT ${APT_TEMPORARILY_UNAVAILABLE}`)).toHaveLength(3)
  })

  it("getApartmentsForCandidature s'appuie sur la même liste filtrée", async () => {
    rpc.mockResolvedValue({ data: [{ id: A, available_from: '2026-12-01' }], error: null })
    const apts = await getApartmentsForCandidature()
    expect(rpc.mock.calls[0][1].query).toContain('temporarily_unavailable')
    expect(apts[0].move_out_date).toBe('2026-12-01')
  })

  it('getTemporarilyUnavailableApartmentNumbers renvoie les numéros désactivés', async () => {
    rpc.mockResolvedValue({ data: [{ number: '7' }, { number: '12' }], error: null })
    const numbers = await getTemporarilyUnavailableApartmentNumbers([A, B])
    expect(numbers).toEqual(['7', '12'])
    const sql: string = rpc.mock.calls[0][1].query
    expect(sql).toContain(`a.id IN ('${A}','${B}')`)
    expect(sql).toContain(APT_TEMPORARILY_UNAVAILABLE)
  })

  it('getTemporarilyUnavailableApartmentNumbers ignore les ids invalides (anti-injection) et ne requête pas si aucun', async () => {
    const numbers = await getTemporarilyUnavailableApartmentNumbers(["x' OR 1=1 --", ''])
    expect(numbers).toEqual([])
    expect(rpc).not.toHaveBeenCalled()
  })

  it("getTemporarilyUnavailableApartmentNumbers remonte l'erreur SQL", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(getTemporarilyUnavailableApartmentNumbers([A])).rejects.toThrow('boom')
  })

  it('temporarilyUnavailableMessage : singulier', () => {
    expect(temporarilyUnavailableMessage(['7'])).toBe(
      "L'appartement 7 est temporairement indisponible : il ne peut pas recevoir de visite ni de candidature pour le moment."
    )
  })

  it('temporarilyUnavailableMessage : pluriel', () => {
    expect(temporarilyUnavailableMessage(['7', '12'])).toBe(
      'Les appartements 7, 12 sont temporairement indisponibles : ils ne peuvent pas recevoir de visite ni de candidature pour le moment.'
    )
  })
})
