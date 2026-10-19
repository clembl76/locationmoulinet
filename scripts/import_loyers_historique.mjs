/**
 * Import de l'historique des loyers (avant 2026) dans la table `rents`.
 *
 * Usage :
 *   node scripts/import_loyers_historique.mjs <chemin/loyers.tsv>            → simulation (aucune écriture)
 *   node scripts/import_loyers_historique.mjs <chemin/loyers.tsv> --apply    → insertion en base
 *
 * Les lignes déjà présentes (même bail, année, mois) ne sont jamais écrasées.
 * Les loyers irrécouvrables (lignes IMPAYE) nécessitent la colonne rents.written_off_at
 * (migration 20261008_rents_written_off.sql) : tant qu'elle n'existe pas, ils sont laissés de côté
 * et il suffit de relancer le script une fois la migration exécutée.
 * Règles de rapprochement : voir scripts/lib/rentHistory.mjs.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseTsv, buildRentImport } from './lib/rentHistory.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const tsvPath = process.argv[2]
const apply = process.argv.includes('--apply')
if (!tsvPath || tsvPath.startsWith('--')) {
  console.error('Usage : node scripts/import_loyers_historique.mjs <chemin/loyers.tsv> [--apply]')
  process.exit(1)
}

// Lire .env.local
const envPath = resolve(__dirname, '../.env.local')
const env = {}
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const stripped = line.trim()
  if (!stripped || stripped.startsWith('#')) continue
  const eq = stripped.indexOf('=')
  if (eq === -1) continue
  const key = stripped.slice(0, eq).trim()
  let val = stripped.slice(eq + 1).trim()
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1)
  }
  env[key] = val
}

// Lecture : clé anon + RPC run_sql ; écriture : clé service role (cf. BUSINESS_RULES.md §Accès base de données)
const reader = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const { data: leaseRows, error: leaseError } = await reader.rpc('run_sql', {
  query: `
    SELECT
      l.id,
      a.number AS apartment_number,
      t.last_name,
      l.signing_date::text AS signing_date,
      l.move_in_inspection_date::text AS move_in_date,
      l.move_out_inspection_date::text AS move_out_date,
      l.rent_including_charges,
      (SELECT count(*) FROM rents r WHERE r.lease_id = l.id)::int AS existing_rents
    FROM leases l
    JOIN apartments a ON a.id = l.apartment_id
    JOIN lease_tenants lt ON lt.lease_id = l.id
    JOIN tenants t ON t.id = lt.tenant_id
  `,
})
if (leaseError) {
  console.error('❌ Lecture des baux impossible :', leaseError.message)
  process.exit(1)
}

// Un bail peut avoir plusieurs locataires : une entrée par bail, avec tous les noms
const leasesById = new Map()
for (const r of leaseRows) {
  if (!leasesById.has(r.id)) leasesById.set(r.id, { ...r, last_names: [] })
  leasesById.get(r.id).last_names.push(r.last_name)
}
const leases = [...leasesById.values()]
const aptOf = id => leasesById.get(id).apartment_number
const namesOf = id => leasesById.get(id).last_names.join(' / ')

const rows = parseTsv(readFileSync(tsvPath, 'utf-8'))
const { records, skipped, unmatched, warnings } = buildRentImport(rows, leases)
const writtenOff = records.filter(r => r.written_off)

const { data: columnRows, error: columnError } = await reader.rpc('run_sql', {
  query: `SELECT 1 AS ok FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'rents' AND column_name = 'written_off_at'`,
})
if (columnError) {
  console.error('❌ Lecture du schéma de rents impossible :', columnError.message)
  process.exit(1)
}
const hasWrittenOffColumn = (columnRows ?? []).length > 0

const describe = row => `l.${row.line} — ${row.year}-${String(row.month).padStart(2, '0')} appt ${row.apt} ${row.name} ${row.amount ?? '?'} €${row.description ? ` « ${row.description} »` : ''}`
const sum = list => Math.round(list.reduce((s, x) => s + x, 0) * 100) / 100

console.log(`\n${rows.length} lignes lues, ${leases.length} baux en base`)
console.log(`→ ${records.length} loyers à insérer (${sum(records.map(r => r.amount_received ?? 0))} € encaissés), dont ${writtenOff.length} irrécouvrables (${sum(writtenOff.map(r => r.amount_expected))} € jamais encaissés)\n`)

console.log('Par année :')
for (const year of [...new Set(records.map(r => r.year))].sort()) {
  const ofYear = records.filter(r => r.year === year)
  console.log(`  ${year} : ${ofYear.length} loyers, ${new Set(ofYear.map(r => r.lease_id)).size} baux, ${sum(ofYear.map(r => r.amount_received ?? 0))} €`)
}

console.log('\nPar bail :')
const byLease = new Map()
for (const r of records) {
  if (!byLease.has(r.lease_id)) byLease.set(r.lease_id, [])
  byLease.get(r.lease_id).push(r)
}
const leaseLines = [...byLease.entries()].map(([id, list]) => {
  const periods = list.map(r => r.year * 100 + r.month).sort((a, b) => a - b)
  return `  appt ${String(aptOf(id)).padStart(4)} ${namesOf(id).padEnd(22)} ${String(list.length).padStart(3)} loyers  ${periods[0]} → ${periods[periods.length - 1]}  ${sum(list.map(r => r.amount_received ?? 0))} €  [${id.slice(0, 8)}]`
})
for (const l of leaseLines.sort()) console.log(l)

console.log(`\nAjustements (${warnings.length}) :`)
for (const w of warnings) console.log(`  ${describe(w.row)}\n      ↳ ${w.message}`)

console.log(`\nLoyers irrécouvrables (${writtenOff.length}) :`)
for (const r of writtenOff) console.log(`  ${r.year}-${String(r.month).padStart(2, '0')} appt ${aptOf(r.lease_id)} ${namesOf(r.lease_id)} — ${r.amount_expected} € dus`)
if (writtenOff.length > 0 && !hasWrittenOffColumn) {
  console.warn('  ⚠️  Colonne rents.written_off_at absente : ces loyers ne seront PAS insérés.')
  console.warn('      Exécuter supabase/migrations/20261008_rents_written_off.sql puis relancer ce script.')
}

console.log(`\nNon importées — sans bail correspondant (${unmatched.length}) :`)
for (const row of unmatched) console.log(`  ${describe(row)}`)

console.log(`\nIgnorées (${skipped.length}) :`)
const byReason = new Map()
for (const s of skipped) {
  if (!byReason.has(s.reason)) byReason.set(s.reason, [])
  byReason.get(s.reason).push(s.row)
}
for (const [reason, list] of byReason) {
  console.log(`  ${reason} : ${list.length} lignes, ${sum(list.map(r => r.amount ?? 0))} €`)
  if (list.length <= 15) for (const row of list) console.log(`      ${describe(row)}`)
}

if (!apply) {
  console.log('\nSimulation uniquement — relancer avec --apply pour insérer.')
  process.exit(0)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
// Date du jour (locale) : c'est aujourd'hui qu'on acte que la créance est irrécouvrable
const now = new Date()
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const payload = records
  .filter(r => hasWrittenOffColumn || !r.written_off)
  .map(({ source_lines, written_off, ...record }) =>
    hasWrittenOffColumn ? { ...record, written_off_at: written_off ? todayStr : null } : record)
let inserted = 0
const BATCH = 200
for (let i = 0; i < payload.length; i += BATCH) {
  const batch = payload.slice(i, i + BATCH)
  const { data, error } = await admin
    .from('rents')
    .upsert(batch, { onConflict: 'lease_id,year,month', ignoreDuplicates: true })
    .select('id')
  if (error) {
    console.error(`❌ Insertion interrompue au lot ${i / BATCH + 1} (${inserted} loyers déjà insérés) :`, error.message)
    process.exit(1)
  }
  inserted += (data ?? []).length
}

console.log(`\n✅ ${inserted} loyers insérés, ${payload.length - inserted} déjà présents (non modifiés).`)
if (payload.length < records.length) {
  console.warn(`⚠️  ${records.length - payload.length} loyers irrécouvrables en attente de la migration 20261008_rents_written_off.sql — relancer ensuite.`)
}
