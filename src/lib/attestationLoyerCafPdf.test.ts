// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { PDFDocument, PDFPage } from 'pdf-lib'

vi.mock('@/lib/adminData', () => ({ runSqlAdmin: vi.fn() }))
vi.mock('googleapis', () => ({ google: {} }))

import { generateAttestationLoyerCafPdf, type AttestationLoyerCafData } from '@/lib/quittance'

const data: AttestationLoyerCafData = {
  owner_title: 'M.',
  owner_first_name: 'Jean',
  owner_last_name: 'Martin',
  owner_address: '1 rue du Test, Rouen',
  owner_phone: '0600000000',
  owner_email: 'owner@example.com',
  owner_siret: null,
  tenant_title: 'Mme',
  tenant_last_name: 'Dupont',
  tenant_first_name: 'Alice',
  tenant_email: 'alice@example.com',
  building_address: '2 rue du Test, Rouen',
  building_short_name: 'Moulinet',
  apartment_number: '7',
  surface_area: 25,
  move_in_date: '2024-09-01',
  rent_excluding_charges: 500,
  charges: 50,
  rent_including_charges: 550,
  tenant_is_up_to_date: true,
}

function drawnXPositions(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls
    .filter(([text]) => text === 'X')
    .map(([, opts]) => ({ x: (opts as { x: number }).x, y: (opts as { y: number }).y }))
}

describe('generateAttestationLoyerCafPdf', () => {
  afterEach(() => vi.restoreAllMocks())

  it("coche « non » pour le versement direct de l'aide dans les autres cas", async () => {
    const spy = vi.spyOn(PDFPage.prototype, 'drawText')
    await generateAttestationLoyerCafPdf(data)
    expect(drawnXPositions(spy)).toContainEqual({ x: 98.5, y: 314.5 })
  })

  it("ne coche pas « oui » pour le versement direct de l'aide", async () => {
    const spy = vi.spyOn(PDFPage.prototype, 'drawText')
    await generateAttestationLoyerCafPdf(data)
    expect(drawnXPositions(spy).filter(p => p.y === 314.5)).toHaveLength(1)
  })

  it('conserve les autres cases cochées (chambre, colocation, sous-location, hôtel, décence)', async () => {
    const spy = vi.spyOn(PDFPage.prototype, 'drawText')
    await generateAttestationLoyerCafPdf(data)
    const xs = drawnXPositions(spy)
    expect(xs).toEqual(expect.arrayContaining([
      { x: 286, y: 613.5 },
      { x: 273, y: 587.5 },
      { x: 357, y: 496.5 },
      { x: 203, y: 470.5 },
      { x: 276, y: 444.5 },
      { x: 363, y: 301.5 },
    ]))
  })

  it('coche « non » pour le règlement des loyers si le locataire n’est pas à jour', async () => {
    const spy = vi.spyOn(PDFPage.prototype, 'drawText')
    await generateAttestationLoyerCafPdf({ ...data, tenant_is_up_to_date: false })
    expect(drawnXPositions(spy)).toContainEqual({ x: 393, y: 496.5 })
  })

  it('produit un PDF valide et un nom de fichier conforme', async () => {
    const { pdfBytes, filename } = await generateAttestationLoyerCafPdf(data)
    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBeGreaterThan(0)
    expect(filename).toMatch(/^\d{4}-\d{2}_AttestationLoyerCAF_7-DUPONT\.pdf$/)
  })
})
