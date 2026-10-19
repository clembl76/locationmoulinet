/**
 * Logique pure de l'import des revenus de location courte durée (Airbnb, Le Bon Coin)
 * dans la table `short_term_revenues`. Même fichier source que l'historique des loyers.
 * Aucune I/O ici — voir scripts/import_revenus_courte_duree.mjs.
 */

import { classifyRow, normalizeName, APARTMENT_ALIASES } from './rentHistory.mjs'

/** Répartit un montant à parts égales, au centime près : les centimes restants vont aux premières parts. */
export function splitEqually(amount, parts) {
  const sign = amount < 0 ? -1 : 1
  const cents = Math.round(Math.abs(amount) * 100)
  const base = Math.floor(cents / parts)
  const extra = cents - base * parts
  return Array.from({ length: parts }, (_, i) => (sign * (base + (i < extra ? 1 : 0))) / 100)
}

/**
 * Construit les lignes `short_term_revenues` à partir des lignes Airbnb / Le Bon Coin du fichier.
 * La colonne APPT peut lister plusieurs appartements ("24 25 28 29 BE") : le paiement est alors
 * réparti à parts égales, une ligne par appartement.
 *
 * `apartments` : [{ id, number }]
 */
export function buildShortTermImport(rows, apartments, aliases = APARTMENT_ALIASES) {
  const records = []
  const skipped = []   // { row, reason }
  const unmatched = [] // { row, unknown: [libellés d'appartement introuvables] }
  const byNumber = new Map(apartments.map(a => [String(a.number), a]))

  for (const row of rows) {
    if (classifyRow(row) !== 'platform') continue
    if (!Number.isInteger(row.year) || !Number.isInteger(row.month) || row.month < 1 || row.month > 12 || row.amount === null) {
      skipped.push({ row, reason: 'Ligne illisible (année, mois ou montant)' })
      continue
    }
    if (row.amount === 0) { skipped.push({ row, reason: 'Montant nul' }); continue }

    const numbers = [...new Set(row.apt.split(/\s+/).filter(Boolean).map(label => aliases[label] ?? label))]
    const unknown = numbers.filter(n => !byNumber.has(n))
    if (numbers.length === 0 || unknown.length > 0) { unmatched.push({ row, unknown }); continue }

    const shares = splitEqually(row.amount, numbers.length)
    numbers.forEach((number, i) => {
      records.push({
        apartment_id: byNumber.get(number).id,
        apartment_number: number,
        year: row.year,
        month: row.month,
        platform: normalizeName(row.name),
        amount: shares[i],
        description: row.description || null,
        import_key: `historique-l${row.line}-appt${number}`,
      })
    })
  }

  return { records, skipped, unmatched }
}
