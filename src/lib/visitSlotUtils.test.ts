import { describe, it, expect } from 'vitest'
import { generateSlots, jsDayToRule, filterSlotsForToday } from '@/lib/visitSlotUtils'

// ─── generateSlots ────────────────────────────────────────────────────────────

describe('generateSlots', () => {
  it('génère des créneaux de 30 min entre 9h et 11h', () => {
    expect(generateSlots('09:00', '11:00', 30)).toEqual([
      '09:00', '09:30', '10:00', '10:30',
    ])
  })

  it('génère des créneaux de 15 min', () => {
    expect(generateSlots('10:00', '11:00', 15)).toEqual([
      '10:00', '10:15', '10:30', '10:45',
    ])
  })

  it("n'inclut pas le créneau de fin (borne exclue)", () => {
    const slots = generateSlots('09:00', '10:00', 60)
    expect(slots).toEqual(['09:00'])
    expect(slots).not.toContain('10:00')
  })

  it('retourne un tableau vide si la durée ne rentre pas', () => {
    expect(generateSlots('09:00', '09:20', 30)).toEqual([])
  })

  it('formate les heures avec zéro initial', () => {
    expect(generateSlots('08:00', '09:00', 60)).toEqual(['08:00'])
    expect(generateSlots('08:00', '10:00', 60)).toContain('09:00')
  })

  it('gère les plages couvrant plusieurs heures', () => {
    const slots = generateSlots('09:00', '17:00', 60)
    expect(slots).toHaveLength(8)
    expect(slots[0]).toBe('09:00')
    expect(slots[slots.length - 1]).toBe('16:00')
  })
})

// ─── jsDayToRule ──────────────────────────────────────────────────────────────

describe('jsDayToRule', () => {
  it('convertit Lundi (1) en 0', () => expect(jsDayToRule(1)).toBe(0))
  it('convertit Mardi (2) en 1',  () => expect(jsDayToRule(2)).toBe(1))
  it('convertit Samedi (6) en 5', () => expect(jsDayToRule(6)).toBe(5))
  it('convertit Dimanche (0) en 6', () => expect(jsDayToRule(0)).toBe(6))
})

// ─── filterSlotsForToday ─────────────────────────────────────────────────────

describe('filterSlotsForToday', () => {
  const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00']

  it("il est 9h31 → aucun créneau avant 11h31 (buffer 2h) — 11:30 exclu car 690 < 691 min", () => {
    const nowMins = 9 * 60 + 31 // 571 → minMins = 691 (11h31)
    const result = filterSlotsForToday(slots, nowMins, 120)
    expect(result).not.toContain('09:00')
    expect(result).not.toContain('09:30')
    expect(result).not.toContain('10:00')
    expect(result).not.toContain('10:30')
    expect(result).not.toContain('11:00')
    expect(result).not.toContain('11:30') // 11:30 = 690 min < 691 → exclu
    expect(result).toContain('12:00')
    expect(result).toContain('14:00')
  })

  it("premier créneau >= heure + buffer (borne incluse)", () => {
    // 9h00 + 2h = 11h00 exactement → 11:00 doit être inclus
    const nowMins = 9 * 60
    const result = filterSlotsForToday(slots, nowMins, 120)
    expect(result).toContain('11:00')
    expect(result).not.toContain('10:30')
  })

  it('retourne tous les créneaux si heure = 0 + buffer 0', () => {
    expect(filterSlotsForToday(slots, 0, 0)).toEqual(slots)
  })

  it('retourne un tableau vide si toute la journée est passée', () => {
    const nowMins = 22 * 60 // 22h
    expect(filterSlotsForToday(slots, nowMins, 120)).toEqual([])
  })

  it('buffer 0 — exclut uniquement les créneaux strictement dans le passé', () => {
    const nowMins = 10 * 60 + 15 // 10h15
    const result = filterSlotsForToday(slots, nowMins, 0)
    expect(result).not.toContain('09:00')
    expect(result).not.toContain('09:30')
    expect(result).not.toContain('10:00')
    expect(result).toContain('10:30')
    expect(result).toContain('11:00')
  })
})
