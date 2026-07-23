import { describe, it, expect } from 'vitest'
import { FAMILY_STATUSES } from '@/lib/familyStatus'

describe('FAMILY_STATUSES', () => {
  it('contient exactement les 5 statuts familiaux attendus, sans doublon', () => {
    expect(FAMILY_STATUSES).toEqual(['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/Veuve'])
    expect(new Set(FAMILY_STATUSES).size).toBe(FAMILY_STATUSES.length)
  })
})
