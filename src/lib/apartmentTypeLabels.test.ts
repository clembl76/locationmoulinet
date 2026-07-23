import { describe, it, expect } from 'vitest'
import { TYPE_LABELS } from '@/lib/apartmentTypeLabels'

describe('TYPE_LABELS', () => {
  it('contient les 5 types de logement avec libellés FR/EN', () => {
    expect(TYPE_LABELS).toEqual({
      STUDIO: { fr: 'Studio', en: 'Studio' },
      T1: { fr: 'T1', en: '1-room apt.' },
      T2: { fr: 'T2', en: '2-room apt.' },
      T3: { fr: 'T3', en: '3-room apt.' },
      T4: { fr: 'T4', en: '4-room apt.' },
    })
  })
})
