/**
 * Logique pure de l'import de l'historique des loyers (avant 2026) dans la table `rents`.
 * Aucune I/O ici — voir scripts/import_loyers_historique.mjs pour la lecture du fichier et l'écriture en base.
 *
 * Format source (TSV) : ANNEE, APPT, MOIS, FOURNISSEUR (nom du locataire), Montant, Description, Loyer HC, Charges
 */

/** Fournisseurs qui ne sont pas des locataires (locations courte durée) — jamais importés. */
export const PLATFORM_NAMES = ['AIRBNB', 'LE BON COIN']

/** Noms du fichier orthographiés différemment de `tenants.last_name` (clé et valeur normalisées). */
export const DEFAULT_NAME_ALIASES = { 'LOTHU ONEHI': 'ONEHI LHOTU' }

/** Libellés d'appartement du fichier qui ne sont pas un numéro : Bons Enfants (rez-de-chaussée) = appt 80. */
export const APARTMENT_ALIASES = { 'BE RDC': '80', BE: '80' }

const MONTH_PATTERNS = [
  /^janv/, /^f[ée]v/, /^mar/, /^avr/, /^mai/, /^juin/, /^juil/, /^ao[uû]t/, /^sept/, /^oct/, /^nov/, /^d[ée]c/,
]

const MONTH_LABELS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** Note posée sur un loyer impayé qu'on ne recouvrera jamais. */
export const WRITTEN_OFF_NOTE = 'Impayé — créance irrécouvrable'

const MIN_DATE = '0000-01-01'
const MAX_DATE = '9999-12-31'

/** "700 €", "810,72", "-240 €" → nombre ; vide ou illisible → null. */
export function parseAmount(raw) {
  const cleaned = String(raw ?? '').replace(/[€\s  ]/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Majuscules, sans accents, espaces compactés — pour comparer les noms de famille. */
export function normalizeName(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function monthFromToken(token) {
  const t = String(token ?? '').trim().toLowerCase()
  const i = MONTH_PATTERNS.findIndex(re => re.test(t))
  return i === -1 ? null : i + 1
}

/**
 * Mois de loyer mentionné dans la description ("LOYER - 11 - HAMMOUM - août 2025" → 8,
 * "LOYER NOV - 27 - NEMI MBOGBA" → 11). Renvoie null si aucun mois lisible, ou si la
 * description mentionne une autre année que `year` (ex. "janv. 2026" sur une ligne 2025).
 */
export function parseDescMonth(description, year) {
  const desc = String(description ?? '').trim()
  if (desc === '') return null
  const segments = desc.split(' - ').map(s => s.trim())
  // LOYER - appt - NOM - mois : à partir du 4e segment seulement (le 3e est un nom : MARIE, MARTIN…)
  if (segments.length >= 4) {
    const last = segments[segments.length - 1]
    const month = monthFromToken(last)
    if (month !== null) {
      const y = last.match(/\b(20\d{2})\b/)
      if (y && Number(y[1]) !== year) return null
      return month
    }
  }
  const head = segments[0].match(/^LOYER\s+([A-Za-zéû]+)$/i)
  return head ? monthFromToken(head[1]) : null
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Découpe le TSV en lignes typées. `line` = numéro de ligne dans le fichier (en-tête = 1). */
export function parseTsv(content) {
  const rows = []
  const lines = String(content).split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue
    const [year, apt, month, name, amount, description] = lines[i].split('\t')
    rows.push({
      line: i + 1,
      year: Number(year),
      apt: String(apt ?? '').trim(),
      month: Number(month),
      name: String(name ?? '').trim(),
      amount: parseAmount(amount),
      description: String(description ?? '').trim(),
    })
  }
  return rows
}

/**
 * Nature d'une ligne :
 * - `platform` : Airbnb / Le Bon Coin, pas de bail → ignorée
 * - `invalid`  : année, mois ou montant illisible → ignorée
 * - `zero`     : montant 0 (lignes de caution) → ignorée
 * - `unpaid`   : marquée IMPAYE → loyer dû, jamais encaissé, passé en irrécouvrable
 * - `deposit`  : solde « caution moins loyer » → le montant restant est le loyer du mois
 * - `rent`     : loyer (ou régularisation négative de loyer)
 */
export function classifyRow(row) {
  if (PLATFORM_NAMES.includes(normalizeName(row.name))) return 'platform'
  if (!Number.isInteger(row.year) || !Number.isInteger(row.month) || row.month < 1 || row.month > 12 || row.amount === null) {
    return 'invalid'
  }
  if (row.amount === 0) return 'zero'
  if (/^IMPAY/i.test(row.description)) return 'unpaid'
  if (/^CAUTION/i.test(row.description)) return 'deposit'
  return 'rent'
}

function leaseRange(lease) {
  const starts = [lease.signing_date, lease.move_in_date].filter(Boolean).sort()
  return { start: starts[0] ?? MIN_DATE, end: lease.move_out_date ?? MAX_DATE }
}

function monthBounds(year, month) {
  const mm = String(month).padStart(2, '0')
  return { first: `${year}-${mm}-01`, last: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, '0')}` }
}

function overlapsMonth(lease, year, month) {
  const { start, end } = leaseRange(lease)
  const { first, last } = monthBounds(year, month)
  return start <= last && end >= first
}

// Ordre de préférence entre plusieurs baux candidats (doublons, renouvellements qui se chevauchent)
function pickBest(candidates, year, month) {
  const { first } = monthBounds(year, month)
  const coversFirst = l => { const r = leaseRange(l); return r.start <= first && r.end >= first }
  return [...candidates].sort((a, b) =>
    Number(coversFirst(b)) - Number(coversFirst(a))
    || Number((b.existing_rents ?? 0) > 0) - Number((a.existing_rents ?? 0) > 0)
    || leaseRange(b).start.localeCompare(leaseRange(a).start)
    || leaseRange(b).end.localeCompare(leaseRange(a).end)
    || a.id.localeCompare(b.id)
  )[0]
}

/**
 * Retrouve le bail d'une ligne pour un mois donné.
 * quality : `exact` (même appartement, bail en cours ce mois-là), `other_apartment` (le locataire
 * avait un bail en cours ce mois-là dans un autre appartement que celui du fichier),
 * `out_of_range` (même appartement mais mois hors période du bail), ou lease = null si aucun bail.
 */
export function resolveLease(row, month, leases, aliases = DEFAULT_NAME_ALIASES) {
  const normalized = normalizeName(row.name)
  const name = aliases[normalized] ?? normalized
  const byName = leases.filter(l => l.last_names.some(n => normalizeName(n) === name))
  if (byName.length === 0) return { lease: null, quality: null, candidates: 0 }

  const apt = APARTMENT_ALIASES[row.apt] ?? row.apt
  const sameApt = byName.filter(l => String(l.apartment_number) === apt)
  const sameAptActive = sameApt.filter(l => overlapsMonth(l, row.year, month))
  if (sameAptActive.length > 0) {
    return { lease: pickBest(sameAptActive, row.year, month), quality: 'exact', candidates: sameAptActive.length }
  }
  const otherActive = byName.filter(l => overlapsMonth(l, row.year, month))
  if (otherActive.length > 0) {
    return { lease: pickBest(otherActive, row.year, month), quality: 'other_apartment', candidates: otherActive.length }
  }
  if (sameApt.length > 0) {
    // Bail le plus proche dans le temps du mois demandé
    const { first, last } = monthBounds(row.year, month)
    const gap = l => { const r = leaseRange(l); return r.end < first ? daysBetween(r.end, first) : daysBetween(last, r.start) }
    const nearest = [...sameApt].sort((a, b) => gap(a) - gap(b) || a.id.localeCompare(b.id))[0]
    return { lease: nearest, quality: 'out_of_range', candidates: sameApt.length }
  }
  return { lease: null, quality: null, candidates: 0 }
}

function daysBetween(a, b) {
  return Math.abs(Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000
}

const round2 = n => Math.round(n * 100) / 100
const fmt = n => String(round2(n)).replace('.', ',')

/**
 * Construit les lignes `rents` à insérer à partir des lignes du fichier et des baux en base.
 *
 * Règles :
 * - le mois retenu est la colonne MOIS ; le mois de la description ne sert qu'à corriger une ligne
 *   dont le MOIS tombe hors du bail, ou à départager deux lignes sur le même mois ;
 * - deux loyers restants sur le même bail et le même mois : le second est un loyer payé d'avance,
 *   reporté sur le mois suivant (en cascade si celui-ci est déjà pris) ; un loyer ainsi reporté
 *   au-delà de `beforeYear` sort du périmètre et n'est pas importé ;
 * - une régularisation négative est déduite du loyer du même mois ; un total ≤ 0 (remboursement
 *   intégral) n'est pas importé ;
 * - chaque loyer est supposé payé : amount_received = amount_expected, is_prorata = false ;
 * - exception : une ligne IMPAYE donne un loyer dû mais non encaissé (amount_received = null) et
 *   `written_off = true` (irrécouvrable, ne génère plus d'action « loyer à payer »).
 *
 * `leases` : [{ id, apartment_number, last_names, signing_date, move_in_date, move_out_date,
 *               rent_including_charges, existing_rents }]
 */
export function buildRentImport(rows, leases, { aliases = DEFAULT_NAME_ALIASES, beforeYear = 2026 } = {}) {
  const skipped = []   // { row, reason }
  const unmatched = [] // lignes sans bail correspondant
  const warnings = []  // { row, message }
  const entries = []   // { row, lease, month, amount, notes: [] }

  for (const row of rows) {
    const kind = classifyRow(row)
    if (kind === 'platform') { skipped.push({ row, reason: 'Location courte durée (pas de bail)' }); continue }
    if (kind === 'invalid') { skipped.push({ row, reason: 'Ligne illisible (année, mois ou montant)' }); continue }
    if (kind === 'zero') { skipped.push({ row, reason: 'Montant nul (ligne de caution)' }); continue }

    let month = row.month
    let match = resolveLease(row, month, leases, aliases)
    const descMonth = parseDescMonth(row.description, row.year)
    const notes = []

    if (match.quality !== 'exact' && descMonth !== null && descMonth !== month) {
      const alt = resolveLease(row, descMonth, leases, aliases)
      if (alt.quality === 'exact') {
        warnings.push({ row, message: `MOIS ${month} hors bail → mois ${descMonth} d'après la description` })
        month = descMonth
        match = alt
      }
    }
    if (!match.lease) { unmatched.push(row); continue }

    if (match.quality === 'other_apartment') {
      warnings.push({ row, message: `Aucun bail en cours à l'appt ${row.apt} ce mois-là → rattaché au bail de l'appt ${match.lease.apartment_number}` })
    }
    if (match.quality === 'out_of_range') {
      warnings.push({ row, message: `Mois hors période du bail (${match.lease.signing_date ?? '?'} → ${match.lease.move_out_date ?? 'en cours'})` })
    }
    if (match.candidates > 1) {
      warnings.push({ row, message: `${match.candidates} baux possibles (doublon ou chevauchement) → bail ${match.lease.id} retenu` })
    }

    let amount = row.amount
    const leaseRent = match.lease.rent_including_charges
    if (kind === 'unpaid') {
      notes.push(WRITTEN_OFF_NOTE)
    } else if (kind === 'deposit') {
      notes.push(`loyer ${MONTH_LABELS[month - 1]} ${row.year}`)
    } else if (/CAUTION/i.test(row.description) && leaseRent != null && amount > Number(leaseRent)) {
      notes.push(`Paiement de ${fmt(amount)} € caution incluse`)
      warnings.push({ row, message: `Loyer + caution (${fmt(amount)} €) → ramené au loyer du bail (${fmt(Number(leaseRent))} €)` })
      amount = Number(leaseRent)
    } else if (row.description !== '' && !/^LOYER/i.test(row.description)) {
      notes.push(row.description)
    }

    entries.push({ row, lease: match.lease, year: row.year, month, amount, descMonth, notes, unpaid: kind === 'unpaid' })
  }

  // Deux paiements positifs sur le même bail et le même mois : déplacer celui dont la description
  // désigne un autre mois, libre et couvert par le bail
  const keyOf = (e, month = e.month) => `${e.lease.id}|${e.year}|${month}`
  const positiveCount = new Map()
  for (const e of entries) if (e.amount > 0) positiveCount.set(keyOf(e), (positiveCount.get(keyOf(e)) ?? 0) + 1)
  for (const e of entries) {
    if (e.amount <= 0 || positiveCount.get(keyOf(e)) < 2) continue
    if (e.descMonth === null || e.descMonth === e.month) continue
    const target = keyOf(e, e.descMonth)
    if (positiveCount.has(target) || !overlapsMonth(e.lease, e.year, e.descMonth)) continue
    warnings.push({ row: e.row, message: `Deux paiements sur le mois ${e.month} → mois ${e.descMonth} d'après la description` })
    positiveCount.set(keyOf(e), positiveCount.get(keyOf(e)) - 1)
    positiveCount.set(target, 1)
    e.month = e.descMonth
  }

  // Doublons restants : loyer payé d'avance → mois suivant, en cascade (ordre du fichier conservé à mois égal)
  const period = e => e.year * 12 + e.month - 1
  const positivesByLease = new Map()
  for (const e of entries) {
    if (e.amount <= 0) continue
    if (!positivesByLease.has(e.lease.id)) positivesByLease.set(e.lease.id, [])
    positivesByLease.get(e.lease.id).push(e)
  }
  const outOfScope = new Set()
  for (const list of positivesByLease.values()) {
    const ordered = list.map((e, i) => ({ e, i })).sort((a, b) => period(a.e) - period(b.e) || a.i - b.i).map(x => x.e)
    let last = -Infinity
    for (const e of ordered) {
      const wanted = period(e)
      const assigned = Math.max(wanted, last + 1)
      last = assigned
      if (assigned === wanted) continue
      e.year = Math.floor(assigned / 12)
      e.month = (assigned % 12) + 1
      const label = `${e.year}-${String(e.month).padStart(2, '0')}`
      if (e.year >= beforeYear) {
        outOfScope.add(e)
        skipped.push({ row: e.row, reason: `Loyer payé d'avance reporté sur ${label} (hors périmètre)` })
      } else {
        warnings.push({ row: e.row, message: `Mois déjà pris par un autre loyer → loyer payé d'avance, reporté sur ${label}` })
      }
    }
  }

  const groups = new Map()
  for (const e of entries) {
    if (outOfScope.has(e)) continue
    const k = keyOf(e)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(e)
  }

  const records = []
  for (const group of groups.values()) {
    const { lease, year, month, row } = group[0]
    const total = round2(group.reduce((s, e) => s + e.amount, 0))
    if (total <= 0) {
      for (const e of group) skipped.push({ row: e.row, reason: 'Loyer intégralement remboursé (total nul)' })
      continue
    }
    const notes = group.flatMap(e => e.notes)
    if (group.length > 1) {
      notes.unshift(`${group.length} lignes cumulées : ${group.map(e => fmt(e.amount)).join(' + ').replace(/\+ -/g, '- ')} €`)
      warnings.push({ row, message: `${group.length} lignes sur le même mois ${month} → cumulées (${fmt(total)} €)` })
    }
    const unpaid = group.some(e => e.unpaid)
    records.push({
      lease_id: lease.id,
      year,
      month,
      amount_expected: total,
      is_prorata: false,
      prorata_days: null,
      days_in_month: daysInMonth(year, month),
      amount_received: unpaid ? null : total,
      written_off: unpaid,
      received_at: null,
      notes: notes.length > 0 ? notes.join(' — ') : null,
      source_lines: group.map(e => e.row.line),
    })
  }

  return { records, skipped, unmatched, warnings }
}
