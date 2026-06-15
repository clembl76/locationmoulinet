// ─── Contenu spécifique par immeuble — Page Détail appartement ───────────────

const QUARTIER_MOULINET_FR = `Quartier calme, très bien placé, proche centre-ville, gare et écoles/universités :

• Gare, Centre-ville : 2 min à pied
• Lycée Corneille, Lycée JB de La Salle : 10 min à pied
• Lycée Jeanne d'Arc : 15 min à pied
• Fac de médecine, Fac de droit (Préfecture) : 20 min à pied
• Mont-Saint-Aignan (Université, Neoma) : 20 min en bus
• Saint-Étienne-du-Rouvray (INSA, Université, Esigelec) : 35 min en métro`

const QUARTIER_MOULINET_EN = `Quiet neighbourhood, perfectly located close to the city centre, station and schools/universities:

• Train station, City centre: 2 min walk
• Lycée Corneille, Lycée JB de La Salle: 10 min walk
• Lycée Jeanne d'Arc: 15 min walk
• Faculty of Medicine, Faculty of Law (Préfecture): 20 min walk
• Mont-Saint-Aignan (University, Neoma): 20 min by bus
• Saint-Étienne-du-Rouvray (INSA, University, Esigelec): 35 min by metro`

const QUARTIER_CENTRE_FR = `Quartier hyper centre, 1 minute du Vieux marché. Proche transports et écoles/universités :

• Métro Palais de Justice : 6 min à pied
• Teors T1,T2, T3, T4 : 5 min à pied
• Gare SNCF: 13 min à pied`

const QUARTIER_CENTRE_EN = `Heart of the city centre, 1 minute from the Vieux Marché. Close to transport and schools/universities:

• Palais de Justice metro: 6 min walk
• Teor T1, T2, T3, T4: 5 min walk
• Train station: 13 min walk`

const QUARTIER_RENARD_FR = `Quartier proche centre-ville et transports:

• Teor T4 : 8 min à pied
• Teors T1,T2, T3 et Fac Pasteur : 13 min à pied
• Métro Palais de Justice : 16 min à pied
• Gare SNCF et Métro: 17 min à pied`

const QUARTIER_RENARD_EN = `Neighbourhood close to the city centre and public transport:

• Teor T4: 8 min walk
• Teor T1, T2, T3 and Fac Pasteur: 13 min walk
• Palais de Justice metro: 16 min walk
• Train station and metro: 17 min walk`

const CHARGES_BULLETS_MOULINET_FR = [
  "Direct propriétaire, pas de frais d'agence.",
  'Eau froide, eau chaude, électricité, chauffage, wifi inclus.',
  '1 mois de dépôt de garantie.',
  'Éligible aux aides au logement.',
]

const CHARGES_BULLETS_MOULINET_EN = [
  'Direct from owner, no agency fees.',
  'Cold water, hot water, electricity, heating, wifi included.',
  '1 month security deposit.',
  'Eligible for housing benefits (APL).',
]

const CHARGES_BULLETS_AUTRES_FR = [
  "Direct propriétaire, pas de frais d'agence.",
  'Les charges comprennent : Eau froide, TOM, syndic. Electricité non incluse.',
  '1 mois de dépôt de garantie.',
  'Éligible aux aides au logement.',
]

const CHARGES_BULLETS_AUTRES_EN = [
  'Direct from owner, no agency fees.',
  'Service charges include: cold water, refuse collection (TOM), building management. Electricity not included.',
  '1 month security deposit.',
  'Eligible for housing benefits (APL).',
]

const AUTRES_IMMEUBLES = ['Vieux Palais', 'Bons Enfants', 'Renard']

export function getQuartierContent(buildingShortName: string | null | undefined, lang: 'fr' | 'en'): string {
  if (buildingShortName === 'Vieux Palais' || buildingShortName === 'Bons Enfants') {
    return lang === 'fr' ? QUARTIER_CENTRE_FR : QUARTIER_CENTRE_EN
  }
  if (buildingShortName === 'Renard') {
    return lang === 'fr' ? QUARTIER_RENARD_FR : QUARTIER_RENARD_EN
  }
  return lang === 'fr' ? QUARTIER_MOULINET_FR : QUARTIER_MOULINET_EN
}

export function getChargesBullets(buildingShortName: string | null | undefined, lang: 'fr' | 'en'): string[] {
  if (buildingShortName && AUTRES_IMMEUBLES.includes(buildingShortName)) {
    return lang === 'fr' ? CHARGES_BULLETS_AUTRES_FR : CHARGES_BULLETS_AUTRES_EN
  }
  return lang === 'fr' ? CHARGES_BULLETS_MOULINET_FR : CHARGES_BULLETS_MOULINET_EN
}
