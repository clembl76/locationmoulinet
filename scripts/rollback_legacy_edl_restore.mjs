/**
 * Rollback : recrée les tables de l'ancien écran "État des lieux" (rapport unique)
 * — check_in_reports, check_in_elements, inventory_items — et réinjecte leur contenu,
 * tel qu'il existait juste avant leur suppression le 2026-07-21.
 *
 * Usage :
 *   1. Ouvrir l'éditeur SQL du dashboard Supabase et exécuter le contenu de
 *      scripts/rollback_legacy_edl_schema.sql (CREATE TABLE + contraintes + RLS).
 *      Ce projet n'a pas de connexion Postgres directe ni de RPC générique
 *      capable d'exécuter du DDL (le seul RPC disponible, run_sql, est en
 *      lecture seule — voir la note plus bas) : cette étape ne peut donc PAS
 *      être automatisée depuis ce script.
 *   2. Une fois les 3 tables recréées, lancer :
 *        node scripts/rollback_legacy_edl_restore.mjs
 *      Ce script vérifie que les tables existent puis réinjecte le contenu de
 *      scripts/rollback_legacy_edl_data.json via l'API standard (PostgREST),
 *      comme le reste de l'application.
 *
 * Ce script ne restaure PAS le code applicatif (page, composants, server actions) :
 * pour ça, `git revert` sur les commits qui ont supprimé la fonctionnalité.
 *
 * Note technique : le RPC public.run_sql(query) de ce projet est défini comme
 *   EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t'
 * — il ne peut exécuter QUE des requêtes SELECT (utilisées ailleurs dans le
 * projet pour des lectures, ex. lib/adminData.ts). Il échoue sur toute
 * instruction DDL ou DML (CREATE TABLE, INSERT, TRUNCATE...). C'est pour ça
 * que ce script utilise l'API Supabase standard (.from(table).insert(...))
 * pour la réinjection de données, et ne tente pas d'exécuter le schéma SQL.
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

const TABLES = ['check_in_reports', 'check_in_elements', 'inventory_items']

async function main() {
  const snapshot = JSON.parse(
    readFileSync(resolve(root, 'scripts', 'rollback_legacy_edl_data.json'), 'utf8')
  )

  console.log('Vérification que les 3 tables existent déjà (schema.sql doit avoir été exécuté manuellement)…')
  for (const table of TABLES) {
    const { error } = await db.from(table).select('*', { count: 'exact', head: true })
    if (error) {
      console.error(`\n✗ La table "${table}" n'existe pas ou n'est pas accessible (${error.message}).`)
      console.error('  Exécute d\'abord scripts/rollback_legacy_edl_schema.sql dans l\'éditeur SQL Supabase, puis relance ce script.')
      process.exit(1)
    }
  }
  console.log('  → les 3 tables existent.\n')

  console.log(`Snapshot du ${snapshot.exported_at} :`)
  console.log(`  check_in_reports : ${snapshot.check_in_reports.length} ligne(s)`)
  console.log(`  check_in_elements: ${snapshot.check_in_elements.length} ligne(s)`)
  console.log(`  inventory_items  : ${snapshot.inventory_items.length} ligne(s)`)
  console.log()

  const ans = await ask('Réinjecter ces données ? (oui/non) : ')
  if (ans.trim().toLowerCase() !== 'oui') {
    console.log('Annulé.')
    process.exit(0)
  }

  for (const table of TABLES) {
    const rows = snapshot[table]
    if (rows.length === 0) {
      console.log(`  → ${table} : rien à réinjecter (vide au moment de l'export)`)
      continue
    }
    const { error } = await db.from(table).upsert(rows)
    if (error) {
      console.error(`  ✗ ${table} : échec — ${error.message}`)
      process.exit(1)
    }
    console.log(`  → ${table} : ${rows.length} ligne(s) réinjectée(s)`)
  }

  console.log('\nRestauration des données terminée. Le code applicatif doit être restauré séparément (git revert).')
}

main().catch(e => { console.error('Erreur :', e.message); process.exit(1) })
