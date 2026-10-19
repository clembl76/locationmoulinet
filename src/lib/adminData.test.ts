// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { APARTMENT_TYPE_BUREAU, EXCLUDE_BUREAU, RENT_NOT_WRITTEN_OFF, SHORT_TERM_CA_SELECT, SHORT_TERM_OCCUPIED } from '@/lib/adminData'

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
