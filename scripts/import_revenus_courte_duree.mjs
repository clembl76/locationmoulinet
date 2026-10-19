/**
 * Import des revenus de location courte durée (Airbnb, Le Bon Coin) dans `short_term_revenues`.
 * Même fichier source que l'historique des loyers (scripts/import_loyers_historique.mjs).
 *
 * Usage :
 *   node scripts/import_revenus_courte_duree.mjs <chemin/loyers.tsv>            → simulation (aucune écriture)
 *   node scripts/import_revenus_courte_duree.mjs <chemin/loyers.tsv> --apply    → insertion en base
 *
 * Prérequis : migration 20261009_short_term_revenues.sql exécutée dans Supabase.
 * Relançable : une ligne déjà importée (même import_key) n'est jamais réinsérée.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseTsv } from './lib/rentHistory.mjs'
import { buildShortTermImport } from './lib/shortTermRevenue.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const tsvPath = process.argv[2]
const apply = process.argv.includes('--apply')
if (!tsvPath || tsvPath.startsWith('--')) {
  console.error('Usage : node scripts/import_revenus_courte_duree.mjs <chemin/loyers.tsv> [--apply]')
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

const reader = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const { data: apartments, error: aptError } = await reader.rpc('run_sql', {
  query: `SELECT a.id, a.number, b.short_name AS building FROM apartments a JOIN buildings b ON b.id = a.building_id`,
})
if (aptError) {
  console.error('❌ Lecture des appartements impossible :', aptError.message)
  process.exit(1)
}

const { data: tableRows, error: tableError } = await reader.rpc('run_sql', {
  query: `SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'short_term_revenues'`,
})
if (tableError) {
  console.error('❌ Lecture du schéma impossible :', tableError.message)
  process.exit(1)
}
const hasTable = (tableRows ?? []).length > 0

const rows = parseTsv(readFileSync(tsvPath, 'utf-8'))
const { records, skipped, unmatched } = buildShortTermImport(rows, apartments)

const sum = list => Math.round(list.reduce((s, x) => s + x, 0) * 100) / 100
const describe = row => `l.${row.line} — ${row.year}-${String(row.month).padStart(2, '0')} appt « ${row.apt} » ${row.name} ${row.amount ?? '?'} €`
const buildingOf = new Map(apartments.map(a => [String(a.number), a.building]))

console.log(`\n${new Set(records.map(r => r.import_key.split('-appt')[0])).size} paiements → ${records.length} lignes à insérer (${sum(records.map(r => r.amount))} €)\n`)

console.log('Par année et plateforme :')
const groups = new Map()
for (const r of records) {
  const k = `${r.year} ${r.platform}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(r.amount)
}
for (const [k, list] of [...groups].sort()) console.log(`  ${k} : ${list.length} lignes, ${sum(list)} €`)

console.log('\nPar appartement :')
const byApt = new Map()
for (const r of records) {
  if (!byApt.has(r.apartment_number)) byApt.set(r.apartment_number, [])
  byApt.get(r.apartment_number).push(r)
}
for (const [number, list] of [...byApt].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  const months = new Set(list.map(r => `${r.year}-${r.month}`)).size
  console.log(`  appt ${number.padStart(3)} (${buildingOf.get(number)}) : ${list.length} lignes, ${months} mois occupés, ${sum(list.map(r => r.amount))} €`)
}

console.log(`\nSans appartement correspondant (${unmatched.length}) :`)
for (const u of unmatched) console.log(`  ${describe(u.row)} — introuvable : ${u.unknown.join(', ') || '(aucun appartement)'}`)

console.log(`\nIgnorées (${skipped.length}) :`)
for (const s of skipped) console.log(`  ${describe(s.row)} — ${s.reason}`)

if (!hasTable) {
  console.warn('\n⚠️  Table short_term_revenues absente : exécuter supabase/migrations/20261009_short_term_revenues.sql.')
}
if (!apply) {
  console.log('\nSimulation uniquement — relancer avec --apply pour insérer.')
  process.exit(0)
}
if (!hasTable) {
  console.error('❌ Insertion impossible tant que la table n\'existe pas.')
  process.exit(1)
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const payload = records.map(({ apartment_number, ...record }) => record)
let inserted = 0
const BATCH = 200
for (let i = 0; i < payload.length; i += BATCH) {
  const { data, error } = await admin
    .from('short_term_revenues')
    .upsert(payload.slice(i, i + BATCH), { onConflict: 'import_key', ignoreDuplicates: true })
    .select('id')
  if (error) {
    console.error(`❌ Insertion interrompue au lot ${i / BATCH + 1} (${inserted} lignes déjà insérées) :`, error.message)
    process.exit(1)
  }
  inserted += (data ?? []).length
}

console.log(`\n✅ ${inserted} lignes insérées, ${payload.length - inserted} déjà présentes (non modifiées).`)
