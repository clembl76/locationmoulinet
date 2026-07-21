/**
 * Rollback : recrée les tables de l'ancien écran "État des lieux" (rapport unique)
 * — check_in_reports, check_in_elements, inventory_items — et réinjecte leur contenu,
 * tel qu'il existait juste avant leur suppression le 2026-07-21.
 *
 * Usage :
 *   node scripts/rollback_legacy_edl_restore.mjs
 *
 * Ce script :
 *   1. Exécute scripts/rollback_legacy_edl_schema.sql (recrée les 3 tables, contraintes, RLS)
 *   2. Réinjecte les lignes de scripts/rollback_legacy_edl_data.json
 *
 * Il ne restaure PAS le code applicatif (page, composants, server actions) : pour ça,
 * `git revert` sur le commit qui a supprimé la fonctionnalité.
 *
 * Prérequis : .env.local doit contenir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = {}
  for (const name of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(root, name), 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* fichier absent */ }
  }
  return { ...env, ...process.env }
}

const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function sql(query) {
  const { data, error } = await db.rpc('run_sql', { query })
  if (error) throw new Error(error.message)
  return data
}

function insertValue(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

async function insertRows(table, rows) {
  if (rows.length === 0) {
    console.log(`  → ${table} : aucune ligne à restaurer (table vide au moment de l'export)`)
    return
  }
  const cols = Object.keys(rows[0])
  const quoted = cols.map(c => `"${c}"`).join(', ')
  const values = rows.map(row =>
    '(' + cols.map(c => insertValue(row[c])).join(', ') + ')'
  ).join(',\n')

  await sql(`INSERT INTO "${table}" (${quoted}) VALUES\n${values}\nON CONFLICT DO NOTHING`)
  console.log(`  → ${table} : ${rows.length} ligne(s) restaurée(s)`)
}

async function main() {
  const schemaSql = readFileSync(resolve(root, 'scripts', 'rollback_legacy_edl_schema.sql'), 'utf8')
  const snapshot = JSON.parse(readFileSync(resolve(root, 'scripts', 'rollback_legacy_edl_data.json'), 'utf8'))

  console.log('Ce script va recréer les tables check_in_reports, check_in_elements, inventory_items')
  console.log(`et réinjecter le contenu exporté le ${snapshot.exported_at}.`)
  console.log(`  check_in_reports : ${snapshot.check_in_reports.length} ligne(s)`)
  console.log(`  check_in_elements: ${snapshot.check_in_elements.length} ligne(s)`)
  console.log(`  inventory_items  : ${snapshot.inventory_items.length} ligne(s)`)
  console.log()

  const ans = await ask('Confirmer ? (oui/non) : ')
  if (ans.trim().toLowerCase() !== 'oui') {
    console.log('Annulé.')
    process.exit(0)
  }

  console.log('\nRecréation du schéma…')
  const statements = schemaSql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    await sql(statement)
  }
  console.log('  → schéma recréé (tables, contraintes, index, RLS)')

  console.log('\nRéinjection des données…')
  await insertRows('check_in_reports', snapshot.check_in_reports)
  await insertRows('check_in_elements', snapshot.check_in_elements)
  await insertRows('inventory_items', snapshot.inventory_items)

  console.log('\nRollback terminé. Le code applicatif doit être restauré séparément (git revert).')
}

main().catch(e => { console.error('Erreur :', e.message); process.exit(1) })
