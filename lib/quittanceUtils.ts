// Fonctions pures pour le calcul des quittances — sans dépendances externes

/** Formate une date ISO "YYYY-MM-DD" en "DD/MM/YYYY" (pour les actes officiels). */
export function fmtShortDate(iso: string | null): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
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
