// Fonctions pures pour le calcul des quittances — sans dépendances externes

/** Formate une date ISO "YYYY-MM-DD" en "DD/MM/YYYY" (pour les actes officiels). */
export function fmtShortDate(iso: string | null): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Détermine les bornes réelles (ISO "YYYY-MM-DD") de la période facturée sur une quittance.
 * - Si le bail a été signé ce mois-ci (prorata d'entrée) : la période commence à la date de signature.
 * - Si le bail se termine ce mois-ci (prorata de sortie) : la période finit à la date de fin du bail.
 * - Sinon (mois plein) : du 1er au dernier jour du mois.
 */
export function computeQuittancePeriod(
  year: number,
  month: number,
  leaseSigningDateIso: string | null,
  leaseMoveOutDateIso: string | null,
): { periodStartIso: string; periodEndIso: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const isSameMonth = (iso: string | null) => {
    if (!iso) return false
    const [y, m] = iso.split('-').map(Number)
    return y === year && m === month
  }

  const periodStartIso = isSameMonth(leaseSigningDateIso)
    ? leaseSigningDateIso!
    : `${year}-${pad(month)}-01`

  const periodEndIso = isSameMonth(leaseMoveOutDateIso)
    ? leaseMoveOutDateIso!
    : `${year}-${pad(month)}-${pad(daysInMonth)}`

  return { periodStartIso, periodEndIso }
}

/**
 * Calcule la répartition loyer HC / charges pour une quittance (pleine ou prorata).
 * Garantit que loyerHc + charges == amountReceived (arrondi centième).
 */
export function calcProrataBreakdown(
  amountReceived: number,
  rentExcludingCharges: number,
  rentIncludingCharges: number,
): { loyerHc: number; charges: number } {
  const ratio = rentIncludingCharges > 0 ? amountReceived / rentIncludingCharges : 1
  // Travail en centimes entiers pour éviter les erreurs de virgule flottante
  const totalCentimes = Math.round(amountReceived * 100)
  const loyerHcCentimes = Math.round(rentExcludingCharges * ratio * 100)
  const chargesCentimes = totalCentimes - loyerHcCentimes
  return { loyerHc: loyerHcCentimes / 100, charges: chargesCentimes / 100 }
}

// Mois de publication INSEE de l'IRL (mi-mois) pour chaque trimestre : T1→avril, T2→juillet,
// T3→octobre, T4→janvier de l'année suivante.
const IRL_PUBLISH_MONTH: Record<number, number> = { 1: 4, 2: 7, 3: 10, 4: 1 }

function irlPublishDate(year: number, quarter: number): Date {
  const month = IRL_PUBLISH_MONTH[quarter]
  const publishYear = quarter === 4 ? year + 1 : year
  return new Date(publishYear, month - 1, 15)
}

/**
 * Détermine le dernier trimestre IRL qui devrait déjà être publié par l'INSEE à la date donnée
 * (calendrier de publication : mi-avril, mi-juillet, mi-octobre, mi-janvier).
 */
export function getExpectedIrlQuarter(now: Date = new Date()): { year: number; quarter: number } {
  let year = now.getFullYear()
  let quarter = Math.ceil((now.getMonth() + 1) / 3)
  for (let i = 0; i < 5; i++) {
    if (irlPublishDate(year, quarter) <= now) return { year, quarter }
    quarter -= 1
    if (quarter === 0) {
      quarter = 4
      year -= 1
    }
  }
  return { year, quarter }
}

/**
 * Parse la réponse XML SDMX de l'API INSEE (série IRL, endpoint SERIES_BDM/001515333) et
 * extrait le dernier trimestre publié. Ex. d'attributs réels : `TIME_PERIOD="2026-Q2"
 * OBS_VALUE="148.37"`. Retourne null si le format ne correspond pas (réponse inattendue).
 */
export function parseInseeIrlXml(xml: string): { date: string; value: string } | null {
  const periodMatch = xml.match(/TIME_PERIOD="(\d{4})-Q(\d)"/)
  const valueMatch  = xml.match(/OBS_VALUE="([\d.]+)"/)
  if (!periodMatch || !valueMatch) return null

  const year    = periodMatch[1]
  const quarter = parseInt(periodMatch[2], 10)
  const labels  = ['', '1er', '2e', '3e', '4e']
  return {
    date:  `${labels[quarter]} trimestre ${year}`,
    value: valueMatch[1].replace('.', ','),
  }
}

/** Parse un libellé IRL du type "2e trimestre 2026" ou "1er trimestre 2025". */
export function parseIrlLabel(label: string): { year: number; quarter: number } | null {
  const match = label.match(/^(\d)(?:er|e)\s+trimestre\s+(\d{4})$/i)
  if (!match) return null
  const quarter = parseInt(match[1], 10)
  const year = parseInt(match[2], 10)
  if (quarter < 1 || quarter > 4) return null
  return { year, quarter }
}

/**
 * Vérifie que l'IRL utilisé pour générer le bail est bien le dernier publié par l'INSEE.
 * Retourne un message d'alerte s'il semble dépassé, sinon null (libellé non reconnu ou à jour).
 */
export function checkIrlFreshness(irlLabel: string, now: Date = new Date()): string | null {
  const used = parseIrlLabel(irlLabel)
  if (!used) return null
  const expected = getExpectedIrlQuarter(now)
  const usedIndex = used.year * 4 + used.quarter
  const expectedIndex = expected.year * 4 + expected.quarter
  if (usedIndex >= expectedIndex) return null

  const labels = ['', '1er', '2e', '3e', '4e']
  return `IRL potentiellement obsolète : le bail a été généré avec le ${labels[used.quarter]} trimestre `
    + `${used.year}, alors que le ${labels[expected.quarter]} trimestre ${expected.year} devrait déjà être `
    + `publié par l'INSEE. Vérifiez la valeur sur insee.fr et mettez à jour BAIL_IRL_DATE / BAIL_IRL_VALUE si besoin.`
}
