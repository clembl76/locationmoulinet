import { describe, it, expect } from 'vitest'
import { APARTMENT_TYPE_BUREAU, EXCLUDE_BUREAU } from '@/lib/adminData'

describe('APARTMENT_TYPE_BUREAU / EXCLUDE_BUREAU', () => {
  it('APARTMENT_TYPE_BUREAU vaut "BUREAU"', () => {
    expect(APARTMENT_TYPE_BUREAU).toBe('BUREAU')
  })

  it('EXCLUDE_BUREAU est dérivé de APARTMENT_TYPE_BUREAU (source unique)', () => {
    expect(EXCLUDE_BUREAU).toBe(`a.type::text != '${APARTMENT_TYPE_BUREAU}'`)
    expect(EXCLUDE_BUREAU).toContain(APARTMENT_TYPE_BUREAU)
  })
})
