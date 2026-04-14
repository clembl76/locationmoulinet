/**
 * Restauration depuis un fichier de sauvegarde JSON
 *
 * Usage :
 *   node scripts/restore.mjs backups/backup_2026-04-14T12-00-00.json
 *
 * ⚠️  ATTENTION : écrase les données existantes table par table (TRUNCATE + INSERT).
 *     Confirmer manuellement avant d'exécuter.
 *
 * Prérequis : .env.local doit contenir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

// ─── Env ─────────────────────────────────────────────────────────────────────

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
const URL  = env.NEXT_PUBLIC_SUPABASE_URL
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function sql(query) {
  const { data, error } = await db.rpc('run_sql', { query })
  if (error) throw new Error(error.message)
  return data
}

// ─── Restore d'une table ─────────────────────────────────────────────────────

async function restoreTable(table, rows) {
  if (rows.length === 0) {
    await sql(`TRUNCATE "${table}" CASCADE`)
    console.log(`  → ${table} : vidée (0 lignes à restaurer)`)
    return
  }

  const cols   = Object.keys(rows[0])
  const quoted = cols.map(c => `"${c}"`).join(', ')

  // Chunk par 200 lignes pour éviter des requêtes trop longues
  const CHUNK = 200

  await sql(`TRUNCATE "${table}" CASCADE`)

  let total = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const values = chunk.map(row =>
      '(' + cols.map(c => {
        const v = row[c]
        if (v === null || v === undefined) return 'NULL'
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
        if (typeof v === 'number') return String(v)
        // Escape single quotes
        return `'${String(v).replace(/'/g, "''")}'`
      }).join(', ') + ')'
    ).join(',\n')

    await sql(`INSERT INTO "${table}" (${quoted}) VALUES\n${values}\nON CONFLICT DO NOTHING`)
    total += chunk.length
  }

  console.log(`  → ${table} : ${total} lignes restaurées`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage : node scripts/restore.mjs <chemin-vers-backup.json>')
    process.exit(1)
  }

  const path = resolve(process.cwd(), file)
  console.log('Lecture de', path)

  const backup = JSON.parse(readFileSync(path, 'utf8'))
  const tables = Object.keys(backup.tables)
  const totalRows = tables.reduce((s, t) => s + backup.tables[t].length, 0)

  console.log(`\nSauvegarde du : ${backup.created_at}`)
  console.log(`Tables        : ${tables.join(', ')}`)
  console.log(`Lignes totales: ${totalRows}`)
  console.log()
  console.log('⚠️  Cette opération va TRUNCATE + réinsérer toutes les tables listées.')

  const ans = await ask('Confirmer ? (oui/non) : ')
  if (ans.trim().toLowerCase() !== 'oui') {
    console.log('Annulé.')
    process.exit(0)
  }

  console.log('\nRestauration en cours…\n')

  // Ordre de restauration : d'abord les tables sans FK, puis celles avec FK
  // On désactive les contraintes FK temporairement via SET session_replication_role
  await sql(`SET session_replication_role = 'replica'`)

  for (const table of tables) {
    await restoreTable(table, backup.tables[table])
  }

  await sql(`SET session_replication_role = 'origin'`)

  console.log('\nRestauration terminée.')
}

main().catch(e => { console.error('Erreur :', e.message); process.exit(1) })
