/**
 * Sauvegarde complète de la base Supabase → JSON horodaté dans backups/
 *
 * Usage :
 *   node scripts/backup.mjs
 *
 * Prérequis : .env.local doit contenir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── Env ─────────────────────────────────────────────────────────────────────

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const env = {}
  // Essaie .env.local puis .env
  for (const name of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(root, name), 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
        if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* fichier absent */ }
  }
  return { ...env, ...process.env } // process.env prioritaire (CI, etc.)
}

const env = loadEnv()
const URL  = env.NEXT_PUBLIC_SUPABASE_URL
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !KEY) {
  console.error('Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

// ─── Liste des tables ─────────────────────────────────────────────────────────

async function listTables() {
  const { data, error } = await db.rpc('run_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
  })
  if (error) throw new Error('Impossible de lister les tables : ' + error.message)
  return data.map(r => r.table_name)
}

// ─── Export d'une table ───────────────────────────────────────────────────────

async function dumpTable(table) {
  const { data, error } = await db.rpc('run_sql', {
    query: `SELECT * FROM "${table}"`
  })
  if (error) throw new Error(`Erreur sur la table "${table}" : ` + error.message)
  return data ?? []
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connexion à', URL)

  const tables = await listTables()
  console.log(`Tables trouvées (${tables.length}) :`, tables.join(', '))

  const backup = {
    created_at: new Date().toISOString(),
    url: URL,
    tables: {}
  }

  for (const table of tables) {
    process.stdout.write(`  → ${table} … `)
    const rows = await dumpTable(table)
    backup.tables[table] = rows
    console.log(`${rows.length} lignes`)
  }

  mkdirSync(resolve(root, 'backups'), { recursive: true })

  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const path = resolve(root, 'backups', `backup_${ts}.json`)
  writeFileSync(path, JSON.stringify(backup, null, 2), 'utf8')

  console.log(`\nSauvegarde écrite dans : ${path}`)
  console.log(`Taille : ${(readFileSync(path).length / 1024).toFixed(1)} Ko`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
