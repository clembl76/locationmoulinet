// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calcProrataBreakdown,
  checkIrlFreshness,
  computeQuittancePeriod,
  fmtShortDate,
  getExpectedIrlQuarter,
  parseInseeIrlXml,
  parseIrlLabel,
} from '@/lib/quittanceUtils'

describe('calcProrataBreakdown', () => {
  it('cas plein (pas de prorata) : répartit exactement loyer HC + charges', () => {
    const { loyerHc, charges } = calcProrataBreakdown(485, 385, 485)
    expect(loyerHc).toBe(385)
    expect(charges).toBe(100)
    expect(loyerHc + charges).toBe(485)
  })

  it('cas prorata : répartit proportionnellement et la somme égale amountReceived (en centimes)', () => {
    // Exemple du bug : loyer HC 385, charges 100, CC 485, prorata 452.67
    const { loyerHc, charges } = calcProrataBreakdown(452.67, 385, 485)
    expect(Math.round((loyerHc + charges) * 100)).toBe(Math.round(452.67 * 100))
    expect(loyerHc).toBeLessThan(385)
    expect(charges).toBeLessThan(100)
  })

  it('cas prorata : loyer et charges sont arrondis au centième', () => {
    const { loyerHc, charges } = calcProrataBreakdown(452.67, 385, 485)
    expect(Number.isInteger(Math.round(loyerHc * 100))).toBe(true)
    expect(Number.isInteger(Math.round(charges * 100))).toBe(true)
  })

  it('premier mois (prorata entrée mi-mois) : somme correcte', () => {
    // Entrée le 15 : 16 jours / 30 = 0.5333...
    const prorata = Math.round((16 / 30) * 485 * 100) / 100
    const { loyerHc, charges } = calcProrataBreakdown(prorata, 385, 485)
    expect(loyerHc + charges).toBe(prorata)
  })

  it('dernier mois (prorata sortie) : somme correcte en centimes', () => {
    // Sortie le 10 : 10 jours / 30
    const prorata = Math.round((10 / 30) * 485 * 100) / 100
    const { loyerHc, charges } = calcProrataBreakdown(prorata, 385, 485)
    expect(Math.round((loyerHc + charges) * 100)).toBe(Math.round(prorata * 100))
  })

  it('charges nulles (loyer HC = CC) : charges prorata = 0', () => {
    const { loyerHc, charges } = calcProrataBreakdown(300, 300, 300)
    expect(loyerHc).toBe(300)
    expect(charges).toBe(0)
  })

  it('rent_including_charges = 0 : ne divise pas par zéro, ratio = 1', () => {
    const { loyerHc, charges } = calcProrataBreakdown(0, 0, 0)
    expect(loyerHc).toBe(0)
    expect(charges).toBe(0)
  })

  it('montant reçu = 0 : répartition à zéro', () => {
    const { loyerHc, charges } = calcProrataBreakdown(0, 385, 485)
    expect(loyerHc).toBe(0)
    expect(charges).toBe(0)
  })
})

describe('computeQuittancePeriod', () => {
  it('mois plein (pas de signature ni de sortie ce mois-ci) : du 1er au dernier jour du mois', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, null, null)
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('mois plein : gère correctement un mois de 30 jours', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 4, null, null)
    expect(periodStartIso).toBe('2026-04-01')
    expect(periodEndIso).toBe('2026-04-30')
  })

  it('mois plein : gère correctement février en année bissextile', () => {
    const { periodEndIso } = computeQuittancePeriod(2024, 2, null, null)
    expect(periodEndIso).toBe('2024-02-29')
  })

  it('mois plein : signature/sortie dans un autre mois ne change rien', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-05-15', '2026-09-10')
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('prorata d\'entrée : la période commence à la date de signature, finit au dernier jour du mois', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-07-15', null)
    expect(periodStartIso).toBe('2026-07-15')
    expect(periodEndIso).toBe('2026-07-31')
  })

  it('prorata de sortie : la période commence au 1er du mois, finit à la date de fin du bail', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, null, '2026-07-10')
    expect(periodStartIso).toBe('2026-07-01')
    expect(periodEndIso).toBe('2026-07-10')
  })

  it('bail signé et terminé dans le même mois : les deux bornes sont ajustées', () => {
    const { periodStartIso, periodEndIso } = computeQuittancePeriod(2026, 7, '2026-07-05', '2026-07-20')
    expect(periodStartIso).toBe('2026-07-05')
    expect(periodEndIso).toBe('2026-07-20')
  })

  it('signature le 1er du mois : équivalent à un mois plein (pas de décalage)', () => {
    const { periodStartIso } = computeQuittancePeriod(2026, 7, '2026-07-01', null)
    expect(periodStartIso).toBe('2026-07-01')
  })

  it('sortie le dernier jour du mois : équivalent à un mois plein (pas de décalage)', () => {
    const { periodEndIso } = computeQuittancePeriod(2026, 7, null, '2026-07-31')
    expect(periodEndIso).toBe('2026-07-31')
  })
})

describe('fmtShortDate', () => {
  it('formate une date ISO YYYY-MM-DD en DD/MM/YYYY', () => {
    expect(fmtShortDate('1983-08-02')).toBe('02/08/1983')
    expect(fmtShortDate('1954-02-10')).toBe('10/02/1954')
    expect(fmtShortDate('2026-07-06')).toBe('06/07/2026')
  })

  it('retourne une chaîne vide pour null', () => {
    expect(fmtShortDate(null)).toBe('')
  })

  it('conserve les zéros de padding du mois et du jour', () => {
    expect(fmtShortDate('2024-01-05')).toBe('05/01/2024')
  })
})

describe('parseInseeIrlXml', () => {
  // Extrait réel de la réponse de l'API INSEE SDMX (endpoint SERIES_BDM/001515333)
  const realInseeResponseExcerpt = `<message:DataSet ss:dataScope="DataStructure" xsi:type="ns1:DataSetType" ss:structureRef="FR1_SERIES_BDM_1_0"><Series IDBANK="001515333" FREQ="T" TITLE_FR="Indice de référence des loyers (IRL)" TITLE_EN="Rent reference index (RRI)" LAST_UPDATE="2026-07-10" UNIT_MEASURE="SO" UNIT_MULT="0" REF_AREA="FM" DECIMALS="2"><Obs TIME_PERIOD="2026-Q2" OBS_VALUE="148.37" OBS_STATUS="A" OBS_QUAL="DEF" OBS_TYPE="A" DATE_JO="2026-07-12"/></Series></message:DataSet>`

  it('parse le format réel renvoyé par l\'API INSEE (TIME_PERIOD / OBS_VALUE)', () => {
    expect(parseInseeIrlXml(realInseeResponseExcerpt)).toEqual({
      date: '2e trimestre 2026',
      value: '148,37',
    })
  })

  it('gère les 4 trimestres et convertit le point décimal en virgule', () => {
    expect(parseInseeIrlXml('<Obs TIME_PERIOD="2025-Q1" OBS_VALUE="143.12"/>'))
      .toEqual({ date: '1er trimestre 2025', value: '143,12' })
    expect(parseInseeIrlXml('<Obs TIME_PERIOD="2025-Q4" OBS_VALUE="145.5"/>'))
      .toEqual({ date: '4e trimestre 2025', value: '145,5' })
  })

  it('retourne null si le format ne correspond pas (réponse INSEE inattendue)', () => {
    expect(parseInseeIrlXml('<html>Erreur</html>')).toBeNull()
    expect(parseInseeIrlXml('')).toBeNull()
    // Ancien format attendu par le code précédent (ObsDimension/ObsValue) : ne doit plus matcher
    expect(parseInseeIrlXml('<ObsDimension value="2026-Q2"/><ObsValue value="148.37"/>')).toBeNull()
  })
})

describe('getExpectedIrlQuarter', () => {
  it('cas du bug rapporté : le 28/07/2026, le T2 2026 est déjà publié (mi-juillet)', () => {
    expect(getExpectedIrlQuarter(new Date(2026, 6, 28))).toEqual({ year: 2026, quarter: 2 })
  })

  it('juste avant la publication mi-juillet : le T1 est encore le dernier attendu', () => {
    expect(getExpectedIrlQuarter(new Date(2026, 6, 10))).toEqual({ year: 2026, quarter: 1 })
  })

  it('juste après la publication mi-juillet : le T2 devient le dernier attendu', () => {
    expect(getExpectedIrlQuarter(new Date(2026, 6, 15))).toEqual({ year: 2026, quarter: 2 })
  })

  it('début janvier : le T4 de l\'année précédente n\'est pas encore publié (mi-janvier)', () => {
    expect(getExpectedIrlQuarter(new Date(2026, 0, 5))).toEqual({ year: 2025, quarter: 3 })
  })

  it('mi-janvier : le T4 de l\'année précédente vient d\'être publié', () => {
    expect(getExpectedIrlQuarter(new Date(2026, 0, 15))).toEqual({ year: 2025, quarter: 4 })
  })
})

describe('parseIrlLabel', () => {
  it('parse "1er trimestre YYYY"', () => {
    expect(parseIrlLabel('1er trimestre 2026')).toEqual({ year: 2026, quarter: 1 })
  })

  it('parse "2e trimestre YYYY", "3e", "4e"', () => {
    expect(parseIrlLabel('2e trimestre 2026')).toEqual({ year: 2026, quarter: 2 })
    expect(parseIrlLabel('3e trimestre 2025')).toEqual({ year: 2025, quarter: 3 })
    expect(parseIrlLabel('4e trimestre 2025')).toEqual({ year: 2025, quarter: 4 })
  })

  it('retourne null pour un libellé non reconnu', () => {
    expect(parseIrlLabel('')).toBeNull()
    expect(parseIrlLabel('valeur fixe 143.12')).toBeNull()
    expect(parseIrlLabel('5e trimestre 2026')).toBeNull()
  })
})

describe('checkIrlFreshness', () => {
  it('reproduit le bug rapporté : bail généré avec le T4 2025 alors que le T2 2026 est attendu', () => {
    const warning = checkIrlFreshness('4e trimestre 2025', new Date(2026, 6, 28))
    expect(warning).not.toBeNull()
    expect(warning).toContain('4e trimestre 2025')
    expect(warning).toContain('2e trimestre 2026')
  })

  it('ne remonte aucune alerte quand l\'IRL utilisé est bien le dernier attendu', () => {
    expect(checkIrlFreshness('2e trimestre 2026', new Date(2026, 6, 28))).toBeNull()
  })

  it('ne remonte aucune alerte quand l\'IRL utilisé est plus récent que celui attendu', () => {
    expect(checkIrlFreshness('3e trimestre 2026', new Date(2026, 6, 28))).toBeNull()
  })

  it('libellé non reconnu (ex. valeur fixée manuellement) : pas d\'alerte, best-effort', () => {
    expect(checkIrlFreshness('', new Date(2026, 6, 28))).toBeNull()
    expect(checkIrlFreshness('valeur non standard', new Date(2026, 6, 28))).toBeNull()
  })
})
