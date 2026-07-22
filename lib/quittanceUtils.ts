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
