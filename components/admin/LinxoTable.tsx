'use client'

import { useState, useMemo } from 'react'
import type { LinxoTransaction } from '@/lib/linxoImport'

const SOURCE_LABELS: Record<string, string> = {
  moulinet:    'Moulinet',
  bonsenfants: 'Bons Enfants',
  vieuxpalais: 'Vieux Palais',
  perso:       'Perso',
}

const SOURCE_COLORS: Record<string, string> = {
  moulinet:    'bg-blue-100 text-blue-700',
  bonsenfants: 'bg-emerald-100 text-emerald-700',
  vieuxpalais: 'bg-amber-100 text-amber-700',
  perso:       'bg-violet-100 text-violet-700',
}

const PAGE_SIZE = 10

type SortKey = 'date' | 'montant' | 'libelle' | 'notes' | 'categorie' | 'source'
type SortDir = 'asc' | 'desc'

export default function LinxoTable({ initialRows }: { initialRows: LinxoTransaction[] }) {
  const [rows, setRows] = useState<LinxoTransaction[]>(initialRows)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  async function handleImport() {
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await fetch('/api/admin/import-linxo', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        setImportMsg(`Erreur : ${json.error}`)
      } else {
        if (json.debug) console.log('[Linxo import debug]', json.debug)
        if (json.errors?.length) console.error('[Linxo import errors]', json.errors)
        setImportMsg(`${json.inserted} importée${json.inserted > 1 ? 's' : ''}, ${json.skipped} ignorée${json.skipped > 1 ? 's' : ''} (déjà présentes)${json.errors?.length ? ` — ${json.errors.length} erreur(s)` : ''}`)
        const refreshRes = await fetch('/api/admin/linxo-transactions')
        if (refreshRes.ok) setRows(await refreshRes.json())
      }
    } catch (e) {
      setImportMsg(`Erreur : ${String(e)}`)
    } finally {
      setImporting(false)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'date' || key === 'montant' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const allCategories = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.categorie) s.add(r.categorie)
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.libelle ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCategorie) list = list.filter(r => r.categorie === filterCategorie)
    if (filterSource)    list = list.filter(r => r.source === filterSource)

    list = [...list].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'date') {
        av = a.date ?? ''
        bv = b.date ?? ''
      } else if (sortKey === 'montant') {
        av = a.montant ?? 0
        bv = b.montant ?? 0
      } else if (sortKey === 'libelle') {
        av = (a.libelle ?? '').toLowerCase()
        bv = (b.libelle ?? '').toLowerCase()
      } else if (sortKey === 'notes') {
        av = (a.notes ?? '').toLowerCase()
        bv = (b.notes ?? '').toLowerCase()
      } else if (sortKey === 'categorie') {
        av = (a.categorie ?? '').toLowerCase()
        bv = (b.categorie ?? '').toLowerCase()
      } else if (sortKey === 'source') {
        av = a.source.toLowerCase()
        bv = b.source.toLowerCase()
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [rows, search, filterCategorie, filterSource, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors whitespace-nowrap"
      >
        {label}
        <span className="text-gray-300">{sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + bouton import */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Transactions Linxo
        </h2>
        <div className="flex items-center gap-3">
          {importMsg && <span className="text-xs text-gray-500">{importMsg}</span>}
          <button
            onClick={handleImport}
            disabled={importing}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Import en cours…' : 'Importer depuis Drive'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher dans Libellé, Note…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary min-w-[220px]"
        />
        <select
          value={filterCategorie}
          onChange={e => { setFilterCategorie(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Catégorie (toutes)</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={e => { setFilterSource(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Source (toutes)</option>
          <option value="moulinet">Moulinet</option>
          <option value="bonsenfants">Bons Enfants</option>
          <option value="vieuxpalais">Vieux Palais</option>
          <option value="perso">Perso</option>
        </select>
        {(search || filterCategorie || filterSource) && (
          <button
            onClick={() => { setSearch(''); setFilterCategorie(''); setFilterSource(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-700 px-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-4 py-3"><SortBtn col="date" label="Date" /></th>
              <th className="text-right px-4 py-3"><SortBtn col="montant" label="Montant" /></th>
              <th className="text-left px-4 py-3"><SortBtn col="libelle" label="Libellé" /></th>
              <th className="text-left px-4 py-3 hidden md:table-cell"><SortBtn col="notes" label="Note" /></th>
              <th className="text-left px-4 py-3 hidden lg:table-cell"><SortBtn col="categorie" label="Catégorie" /></th>
              <th className="text-left px-4 py-3"><SortBtn col="source" label="Source" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  {rows.length === 0
                    ? 'Aucune transaction. Cliquez sur "Importer depuis Drive" pour commencer.'
                    : 'Aucune transaction pour ces critères.'}
                </td>
              </tr>
            ) : (
              paginated.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {tx.date ? new Date(tx.date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                    tx.montant !== null && tx.montant >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.montant !== null
                      ? `${tx.montant >= 0 ? '+' : ''}${Number(tx.montant).toLocaleString('fr-FR')} €`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate">
                    {tx.libelle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell max-w-[200px] whitespace-normal break-words">
                    {tx.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {tx.categorie ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[tx.source] ?? 'bg-gray-100 text-gray-600'}`}>
                      {SOURCE_LABELS[tx.source] ?? tx.source}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t border-gray-100 bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-xs text-gray-400" colSpan={6}>
                  {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Page {safePage} / {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      p === safePage
                        ? 'border-blue-primary bg-blue-primary text-white'
                        : 'border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
