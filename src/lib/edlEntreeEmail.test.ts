import { describe, it, expect } from 'vitest'
import { buildEdlEntreeEmailBody, EDL_ENTREE_EMAIL_SUBJECT } from '@/lib/emailFormatting'

describe('EDL_ENTREE_EMAIL_SUBJECT', () => {
  it("correspond à l'objet défini dans SPEC.md", () => {
    expect(EDL_ENTREE_EMAIL_SUBJECT).toBe('informations pour votre arrivée dans le logement')
  })
})

describe('buildEdlEntreeEmailBody', () => {
  const body = buildEdlEntreeEmailBody()

  it('contient la formule de salutation et le contexte EDL entrée', () => {
    expect(body).toContain('Bonjour,')
    expect(body).toContain("état des lieux d'entrée")
  })

  it('contient les deux contacts avec leurs coordonnées', () => {
    expect(body).toContain('Mme ALAOUI')
    expect(body).toContain('location.moulinet@gmail.com')
    expect(body).toContain('+33628076729')
    expect(body).toContain('Hervé MICOUT')
    expect(body).toContain('07 82 95 02 78')
  })

  it("contient le code d'accès à l'immeuble", () => {
    expect(body).toContain("code d'accès à l'immeuble")
    expect(body).toContain('35 84 72 91')
  })

  it('contient les informations Wifi', () => {
    expect(body).toContain('SFR_EC4F')
    expect(body).toContain('q3nzn3z9cac1rklz4d8y')
  })

  it('contient le lien de collecte des déchets', () => {
    expect(body).toContain('https://metropole-rouen-normandie.montri.fr/services/map')
  })

  it('contient les adresses des laveries', () => {
    expect(body).toContain('75 Rue Beauvoisine')
    expect(body).toContain('56 Rue Cauchoise')
    expect(body).toContain('16 Rue du Champ des Oiseaux')
  })

  it('se termine par la signature de Mme Alaoui', () => {
    expect(body).toContain('Bon emménagement')
    expect(body).toContain('Mme Alaoui')
  })

  it("ne dépend d'aucun paramètre — toujours le même contenu", () => {
    expect(buildEdlEntreeEmailBody()).toBe(body)
  })
})
