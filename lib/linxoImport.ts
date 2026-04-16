import { google } from 'googleapis'
import { createHash } from 'crypto'
import { createAdminClient } from './supabaseAdmin'
import { runSqlAdmin } from './adminData'

const LINXO_FOLDER_ID = '1PRij2TBgU1I8e7jI5ubnS5Cd-T5-cJmQ'

function makeAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return auth
}

function detectSource(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('moulinet')) return 'moulinet'
  if (lower.includes('bonsenfants') || lower.includes('bons-enfants') || lower.includes('bons_enfants')) return 'bonsenfants'
  if (lower.includes('vieuxpalais') || lower.includes('vieux-palais') || lower.includes('vieux_palais') || lower.includes('vieux palais')) return 'vieuxpalais'
  if (lower.includes('perso')) return 'perso'
  return lower.replace(/\.csv$/i, '')
}

// Converts French decimal format "1 234,56" or "-1234.56" → number
function parseAmount(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  // Remove non-breaking spaces and regular spaces (thousands separator), replace comma with dot
  const cleaned = raw.trim().replace(/[\s\u00a0]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Converts DD/MM/YYYY → YYYY-MM-DD (PostgreSQL date)
function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const parts = raw.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return raw.trim()
}

// Detect CSV separator from first line (tab, semicolon, or comma)
function detectSeparator(firstLine: string): string {
  const counts = {
    '\t': (firstLine.match(/\t/g) ?? []).length,
    ';':  (firstLine.match(/;/g)  ?? []).length,
    ',':  (firstLine.match(/,/g)  ?? []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseCsvLine(line: string, sep: string): string[] {
  const fields: string[] = []
  let inQuote = false
  let field = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (c === sep && !inQuote) {
      fields.push(field.trim())
      field = ''
    } else {
      field += c
    }
  }
  fields.push(field.trim())
  return fields
}

function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  // Strip UTF-8 BOM
  const text = raw.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const sep = detectSeparator(lines[0])
  const headers = parseCsvLine(lines[0], sep).map(h => h.toLowerCase())
  const rows = lines.slice(1).map(l => parseCsvLine(l, sep))
  return { headers, rows }
}

// Normalize string for header matching (strip accents, lowercase)
function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function colIndex(headers: string[], patterns: string[]): number {
  return headers.findIndex(h => patterns.some(p => norm(h).includes(norm(p))))
}

function makeFingerprint(source: string, date: string, libelle: string, montant: string): string {
  return createHash('sha256')
    .update(`${source}|${date}|${libelle}|${montant}`)
    .digest('hex')
}

export type LinxoImportResult = {
  inserted: number
  skipped: number
  errors: string[]
  debug?: string[]
}

export async function importLinxoCsvs(): Promise<LinxoImportResult> {
  const auth = makeAuth()
  const token = await auth.getAccessToken()
  const accessToken = token.token

  const drive = google.drive({ version: 'v3', auth })
  const admin = createAdminClient()

  // List all files in folder (including any type)
  const listRes = await drive.files.list({
    q: `'${LINXO_FOLDER_ID}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
    pageSize: 50,
  })
  const allFiles = listRes.data.files ?? []

  // Keep only CSV-like files (text/csv, text/plain, or .csv extension)
  const csvFiles = allFiles.filter(f => {
    const name = f.name?.toLowerCase() ?? ''
    const mime = f.mimeType ?? ''
    return name.endsWith('.csv') || mime === 'text/csv' || mime === 'text/plain' || mime === 'application/octet-stream'
  })

  let inserted = 0
  let skipped = 0
  const errors: string[] = []
  const debug: string[] = []

  debug.push(`Fichiers trouvés dans le dossier : ${allFiles.map(f => `${f.name} (${f.mimeType})`).join(', ')}`)
  debug.push(`Fichiers CSV retenus : ${csvFiles.map(f => f.name).join(', ')}`)

  for (const file of csvFiles) {
    const source = detectSource(file.name ?? '')

    // Download file content as buffer to handle UTF-16 LE encoding (Linxo export format)
    let text: string
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = await res.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      // Detect UTF-16 LE BOM: FF FE
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        text = Buffer.from(buffer).toString('utf16le').replace(/^\uFEFF/, '')
      } else {
        // UTF-8 (with or without BOM)
        text = Buffer.from(buffer).toString('utf8').replace(/^\uFEFF/, '')
      }
    } catch (e) {
      errors.push(`Impossible de télécharger ${file.name}: ${String(e)}`)
      continue
    }

    debug.push(`${file.name}: ${text.length} chars, premiers chars: ${JSON.stringify(text.slice(0, 120))}`)

    const { headers, rows } = parseCsv(text)
    debug.push(`${file.name}: ${rows.length} lignes, headers: ${JSON.stringify(headers)}`)

    if (headers.length === 0 || rows.length === 0) {
      errors.push(`${file.name}: fichier vide ou non parseable`)
      continue
    }

    const iDate      = colIndex(headers, ['date'])
    const iLibelle   = colIndex(headers, ['libelle', 'libellé'])
    const iCateg     = colIndex(headers, ['categorie', 'catégorie'])
    const iMontant   = colIndex(headers, ['montant'])
    const iNotes     = colIndex(headers, ['notes'])
    const iCheque    = colIndex(headers, ['cheque', 'chèque', 'n° de ch'])
    const iLabels    = colIndex(headers, ['labels'])
    const iCompte    = colIndex(headers, ['nom du compte'])
    const iConnexion = colIndex(headers, ['connexion'])

    debug.push(`${file.name}: indices col — date:${iDate} libelle:${iLibelle} montant:${iMontant} categorie:${iCateg}`)

    const toInsert: Record<string, unknown>[] = []

    for (const row of rows) {
      if (row.every(c => c === '')) continue

      const dateRaw    = iDate >= 0 ? (row[iDate] ?? '') : ''
      const libelle    = iLibelle >= 0 ? (row[iLibelle] ?? '') : ''
      const montantRaw = iMontant >= 0 ? (row[iMontant] ?? '') : ''
      const fp = makeFingerprint(source, dateRaw, libelle, montantRaw)

      toInsert.push({
        date:                parseDate(dateRaw),
        libelle:             libelle || null,
        categorie:           iCateg >= 0 ? row[iCateg] || null : null,
        montant:             parseAmount(montantRaw),
        notes:               iNotes >= 0 ? row[iNotes] || null : null,
        numero_cheque:       iCheque >= 0 ? row[iCheque] || null : null,
        labels:              iLabels >= 0 ? row[iLabels] || null : null,
        nom_du_compte:       iCompte >= 0 ? row[iCompte] || null : null,
        nom_de_la_connexion: iConnexion >= 0 ? row[iConnexion] || null : null,
        source,
        fingerprint: fp,
      })
    }

    if (toInsert.length === 0) {
      debug.push(`${file.name}: aucune ligne valide`)
      continue
    }

    // Batch insert ignoring duplicates
    const { data, error } = await admin
      .from('transactions_linxo')
      .upsert(toInsert, { onConflict: 'fingerprint', ignoreDuplicates: true })
      .select('id')

    if (error) {
      errors.push(`Erreur insert ${file.name}: ${error.message}`)
    } else {
      const newRows = (data ?? []).length
      inserted += newRows
      skipped += toInsert.length - newRows
      debug.push(`${file.name}: ${toInsert.length} lignes traitées, ${newRows} insérées`)
    }
  }

  return { inserted, skipped, errors, debug }
}

export type LinxoTransaction = {
  id: string
  date: string | null
  libelle: string | null
  categorie: string | null
  montant: number | null
  notes: string | null
  numero_cheque: string | null
  labels: string | null
  nom_du_compte: string | null
  nom_de_la_connexion: string | null
  source: string
  imported_at: string
  // Catégorisation
  supplier: string | null
  type: string | null
  description: string | null
  apartment_num: string | null
  tenant_name: string | null
  validated: boolean
}

export async function getLinxoTransactions(): Promise<LinxoTransaction[]> {
  return runSqlAdmin<LinxoTransaction>(`
    SELECT * FROM transactions_linxo
    ORDER BY date DESC, imported_at DESC
  `)
}
