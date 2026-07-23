import { describe, it, expect } from 'vitest'
import { CANDIDATE_STATUS_LABELS } from '@/lib/candidateStatus'

describe('CANDIDATE_STATUS_LABELS', () => {
  it('contient les 5 statuts avec des libellés uniques (accepted="Acceptée", rejected="Rejetée")', () => {
    expect(CANDIDATE_STATUS_LABELS).toEqual({
      pending:   'Nouvelle',
      accepted:  'Acceptée',
      rejected:  'Rejetée',
      withdrawn: 'Plus intéressé',
      signed:    'Bail signé',
    })
  })
})
