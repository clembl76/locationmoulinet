/**
 * Seed script — importe scripts/items.csv dans la table `items` Supabase.
 * Usage : node scripts/seed_items.mjs
 * Prérequis : migration 20260522_inventory_tables.sql exécutée dans Supabase.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lire .env.local
const envPath = resolve(__dirname, '../.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
const env = {}
for (const line of envLines) {
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Parser CSV simple (gère les champs entre guillemets)
function parseCsv(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += ch }
    }
    values.push(current.trim())
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i] ?? '']))
  })
}

function parsePrice(val) {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n
}

const ROOM_MAP = {
  'Autres': 'Autres',
  'Autres frais': 'Autres frais',
  'Bureau': 'Bureau',
  'Chambre': 'Chambre',
  'Cuisine': 'Cuisine',
  'Indifférent': 'Indifférent',
  'Salle de bains': 'Salle de bains',
  'Salon': 'Salon',
}

const csvContent = readFileSync(resolve(__dirname, 'items.csv'), 'utf-8')
const rows = parseCsv(csvContent)

const items = rows.map(r => ({
  category: r['Type'],
  default_room: ROOM_MAP[r['Pièce']] ?? 'Autres',
  name: r['Item'],
  reference_url: r['Référence prix'] || null,
  unit_price: parsePrice(r['Prix unitaire €']),
  labor_cost: parsePrice(r["Main d'oeuvre (forfait)"]),
})).filter(i => i.name)

console.log(`Insertion de ${items.length} items…`)

const { error } = await supabase.from('items').insert(items)
if (error) {
  console.error('❌ Erreur :', error.message)
  process.exit(1)
}

console.log(`✅ ${items.length} items insérés avec succès.`)
