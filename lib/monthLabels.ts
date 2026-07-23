// Noms des mois en français, dans les 3 formats utilisés à travers le projet.

/** Noms complets, janvier en index 0 — générateur de quittances, calendrier de visite. */
export const MONTHS_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

/** Abréviations 3 lettres sans point, janvier en index 0 — axes de graphique (CA mensuel). */
export const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] as const

/** Abréviations avec point, indexées par numéro de mois (1-12) — libellés de transactions Linxo. */
export const MONTH_LABELS: Record<number, string> = {
  1: 'janv.', 2: 'févr.', 3: 'mars', 4: 'avr.',
  5: 'mai', 6: 'juin', 7: 'juil.', 8: 'août',
  9: 'sept.', 10: 'oct.', 11: 'nov.', 12: 'déc.',
}
