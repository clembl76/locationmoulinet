import { describe, it, expect } from 'vitest'
import { buildEdlPdfFilename } from '@/lib/edlFigePdf'
import type { ApartmentWithLease } from '@/lib/adminData'
import type { LeaseDates } from '@/app/admin/inventory/summaryActions'

const apt = { apartment_number: '7', tenant_name: 'Alice DUPONT', tenant_last_name: 'DUPONT' } as ApartmentWithLease
const leaseDates: LeaseDates = { move_in_date: '2024-09-01', move_out_date: '2025-06-30', deposit: 750 }

describe('buildEdlPdfFilename', () => {
  it("utilise la date d'entrée et le nom de famille du locataire (sans le prénom) en mode Entrée", () => {
    expect(buildEdlPdfFilename('entree', leaseDates, apt)).toBe('2024-09-01_EDLInventaire_7-DUPONT')
  })

  it('utilise la date de sortie en mode Sortie', () => {
    expect(buildEdlPdfFilename('sortie', leaseDates, apt)).toBe('2025-06-30_EDLInventaire_7-DUPONT')
  })

  it("retombe sur une chaîne vide pour la date si elle n'est pas renseignée", () => {
    const noDates: LeaseDates = { move_in_date: null, move_out_date: null, deposit: 750 }
    expect(buildEdlPdfFilename('entree', noDates, apt)).toBe('_EDLInventaire_7-DUPONT')
    expect(buildEdlPdfFilename('sortie', noDates, apt)).toBe('_EDLInventaire_7-DUPONT')
  })
})
