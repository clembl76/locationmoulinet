'use client'

import { useState, useMemo, useRef } from 'react'
import type { LinxoTransaction } from '@/lib/linxoImport'
import type { TenantOption } from '@/lib/adminData'

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

const TYPE_OPTIONS = [
  'LOYER', 'ACHAT', 'CAUTION', 'ENTRETIEN', 'GESTION', 'IMPOTS', 'INTERNE', 'PRET', 'SERVICES', 'TRAVAUX',
]

type SortKey = 'date' | 'montant' | 'libelle' | 'supplier' | 'type' | 'description' | 'apartment_num' | 'tenant_name' | 'notes' | 'categorie' | 'source' | 'validated'
type SortDir = 'asc' | 'desc'

// ─── Editable cell ────────────────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string | null
  onSave: (v: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(value ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit() {
    setEditing(false)
    if (draft !== (value ?? '')) onSave(draft)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setEditing(false); setDraft(value ?? '') }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-full border border-blue-primary/40 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-primary/40"
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className={`cursor-text block truncate min-h-[1.25rem] rounded px-1 hover:bg-gray-100 transition-colors text-xs ${!value ? 'text-gray-300' : 'text-gray-700'}`}
      title={value ?? undefined}
    >
      {value || <span className="italic">{placeholder ?? '—'}</span>}
    </span>
  )
}

// ─── Select cell ─────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string; id?: string }
type SelectGroup = { label: string; items: SelectOption[] }

function SelectCell({
  value,
  options,
  groups,
  placeholder,
  onSave,
}: {
  value: string | null
  options?: SelectOption[]
  groups?: SelectGroup[]
  placeholder?: string
  onSave: (v: string | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onSave(e.target.value || null)}
      className={`w-full border border-transparent rounded px-1 py-0.5 text-xs bg-transparent hover:border-gray-200 focus:outline-none focus:border-blue-primary/40 focus:ring-1 focus:ring-blue-primary/40 cursor-pointer ${!value ? 'text-gray-300' : 'text-gray-700'}`}
    >
      <option value="">{placeholder ?? '—'}</option>
      {groups
        ? groups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map(o => <option key={o.id ?? o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))
        : options?.map(o => <option key={o.id ?? o.value} value={o.value}>{o.label}</option>)
      }
    </select>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LinxoTable({
  initialRows,
  tenantOptions = [],
}: {
  initialRows: LinxoTransaction[]
  tenantOptions?: TenantOption[]
}) {
  const [rows, setRows] = useState<LinxoTransaction[]>(initialRows)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [categorizing, setCategorizing] = useState(false)
  const [categorizeMsg, setCategorizeMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTenant, setFilterTenant] = useState('')
  const [filterValidated, setFilterValidated] = useState<'' | 'true' | 'false'>('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  async function refreshRows() {
    const res = await fetch('/api/admin/linxo-transactions')
    if (res.ok) setRows(await res.json())
  }

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
        setImportMsg(`${json.inserted} importée${json.inserted > 1 ? 's' : ''}, ${json.skipped} ignorée${json.skipped > 1 ? 's' : ''}${json.errors?.length ? ` — ${json.errors.length} erreur(s)` : ''}`)
        await refreshRows()
      }
    } catch (e) {
      setImportMsg(`Erreur : ${String(e)}`)
    } finally {
      setImporting(false)
    }
  }

  async function handleCategorize() {
    setCategorizing(true)
    setCategorizeMsg(null)
    try {
      const res = await fetch('/api/admin/categorize-linxo', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        setCategorizeMsg(`Erreur : ${json.error}`)
      } else {
        setCategorizeMsg(`${json.updated} catégorisée${json.updated > 1 ? 's' : ''}${json.errors?.length ? ` — ${json.errors.length} erreur(s)` : ''}`)
        await refreshRows()
      }
    } catch (e) {
      setCategorizeMsg(`Erreur : ${String(e)}`)
    } finally {
      setCategorizing(false)
    }
  }

  async function patchRow(id: string, fields: Partial<LinxoTransaction>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
    try {
      const res = await fetch(`/api/admin/linxo-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) await refreshRows()
    } catch {
      await refreshRows()
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

  const allSuppliers = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.supplier) s.add(r.supplier)
    return Array.from(s).sort()
  }, [rows])

  const tenantSelectGroups = useMemo((): SelectGroup[] => {
    const current = tenantOptions.filter(t => t.is_current)
    const past = tenantOptions.filter(t => !t.is_current)
    const toOption = (t: TenantOption) => ({
      id: t.id,
      value: t.name,
      label: `${t.name}${t.apartment_num ? ` (${t.apartment_num})` : ''}`,
    })
    const groups: SelectGroup[] = [{ label: 'Locataires actuels', items: current.map(toOption) }]
    if (past.length > 0) groups.push({ label: 'Anciens locataires', items: past.map(toOption) })
    return groups
  }, [tenantOptions])

  const filtered = useMemo(() => {
    let list = rows

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.libelle ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q) ||
        (r.supplier ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCategorie) list = list.filter(r => r.categorie === filterCategorie)
    if (filterSource)    list = list.filter(r => r.source === filterSource)
    if (filterSupplier)  list = list.filter(r => r.supplier === filterSupplier)
    if (filterType)      list = list.filter(r => r.type === filterType)
    if (filterTenant)    list = list.filter(r => r.tenant_name === filterTenant)
    if (filterValidated === 'true')  list = list.filter(r => r.validated)
    if (filterValidated === 'false') list = list.filter(r => !r.validated)

    list = [...list].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'date')            { av = a.date ?? '';                        bv = b.date ?? '' }
      else if (sortKey === 'montant')    { av = a.montant ?? 0;                      bv = b.montant ?? 0 }
      else if (sortKey === 'libelle')    { av = (a.libelle ?? '').toLowerCase();     bv = (b.libelle ?? '').toLowerCase() }
      else if (sortKey === 'supplier')   { av = (a.supplier ?? '').toLowerCase();    bv = (b.supplier ?? '').toLowerCase() }
      else if (sortKey === 'type')       { av = (a.type ?? '').toLowerCase();        bv = (b.type ?? '').toLowerCase() }
      else if (sortKey === 'description'){ av = (a.description ?? '').toLowerCase(); bv = (b.description ?? '').toLowerCase() }
      else if (sortKey === 'apartment_num') { av = (a.apartment_num ?? '').toLowerCase(); bv = (b.apartment_num ?? '').toLowerCase() }
      else if (sortKey === 'tenant_name'){ av = (a.tenant_name ?? '').toLowerCase(); bv = (b.tenant_name ?? '').toLowerCase() }
      else if (sortKey === 'notes')      { av = (a.notes ?? '').toLowerCase();       bv = (b.notes ?? '').toLowerCase() }
      else if (sortKey === 'categorie')  { av = (a.categorie ?? '').toLowerCase();   bv = (b.categorie ?? '').toLowerCase() }
      else if (sortKey === 'source')     { av = a.source.toLowerCase();              bv = b.source.toLowerCase() }
      else if (sortKey === 'validated')  { av = a.validated ? 1 : 0;                bv = b.validated ? 1 : 0 }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [rows, search, filterCategorie, filterSource, filterSupplier, filterType, filterTenant, filterValidated, sortKey, sortDir])

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
      {/* Header + boutons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Transactions Linxo
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          {categorizeMsg && <span className="text-xs text-gray-500">{categorizeMsg}</span>}
          {importMsg && <span className="text-xs text-gray-500">{importMsg}</span>}
          <button
            onClick={handleCategorize}
            disabled={categorizing}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-primary hover:text-blue-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {categorizing ? 'Catégorisation…' : 'Catégoriser'}
          </button>
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
          placeholder="Rechercher libellé, note, fournisseur…"
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
        <select
          value={filterSupplier}
          onChange={e => { setFilterSupplier(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Fournisseur (tous)</option>
          {allSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Type (tous)</option>
          {[...TYPE_OPTIONS].sort().map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterTenant}
          onChange={e => { setFilterTenant(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Locataire (tous)</option>
          {tenantSelectGroups.map(g => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map(o => <option key={o.id ?? o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
        <select
          value={filterValidated}
          onChange={e => { setFilterValidated(e.target.value as '' | 'true' | 'false'); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Validé (tous)</option>
          <option value="true">Validées</option>
          <option value="false">Non validées</option>
        </select>
        {(search || filterCategorie || filterSource || filterSupplier || filterType || filterTenant || filterValidated) && (
          <button
            onClick={() => { setSearch(''); setFilterCategorie(''); setFilterSource(''); setFilterSupplier(''); setFilterType(''); setFilterTenant(''); setFilterValidated(''); setPage(1) }}
            className="text-sm text-gray-400 hover:text-gray-700 px-2"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="text-sm" style={{ minWidth: 1000, width: '100%' }}>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-3 py-3 whitespace-nowrap"><SortBtn col="date" label="Date" /></th>
              <th className="text-right px-3 py-3 whitespace-nowrap"><SortBtn col="montant" label="Montant" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap"><SortBtn col="libelle" label="Libellé" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap"><SortBtn col="supplier" label="Fournisseur" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap"><SortBtn col="type" label="Type" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap hidden xl:table-cell"><SortBtn col="description" label="Description" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap hidden lg:table-cell"><SortBtn col="apartment_num" label="Appt" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap hidden lg:table-cell"><SortBtn col="tenant_name" label="Locataire" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap hidden md:table-cell"><SortBtn col="notes" label="Note" /></th>
              <th className="text-left px-3 py-3 whitespace-nowrap hidden xl:table-cell"><SortBtn col="source" label="Source" /></th>
              <th className="text-center px-3 py-3 whitespace-nowrap"><SortBtn col="validated" label="Validé" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-400">
                  {rows.length === 0
                    ? 'Aucune transaction. Cliquez sur "Importer depuis Drive" pour commencer.'
                    : 'Aucune transaction pour ces critères.'}
                </td>
              </tr>
            ) : (
              paginated.map(tx => (
                <tr
                  key={tx.id}
                  className={tx.validated ? 'bg-green-50/50' : 'hover:bg-gray-50 transition-colors'}
                >
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-xs">
                    {tx.date ? new Date(tx.date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap text-xs ${
                    tx.montant !== null && tx.montant >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {tx.montant !== null
                      ? `${tx.montant >= 0 ? '+' : ''}${Number(tx.montant).toLocaleString('fr-FR')} €`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <span className="block truncate text-xs text-gray-700" title={tx.libelle ?? undefined}>
                      {tx.libelle ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 min-w-[110px]">
                    <EditableCell
                      value={tx.supplier}
                      placeholder="fournisseur"
                      onSave={v => patchRow(tx.id, { supplier: v || null })}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-[100px]">
                    <SelectCell
                      value={tx.type}
                      options={TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
                      placeholder="type"
                      onSave={v => patchRow(tx.id, { type: v })}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-[150px] hidden xl:table-cell">
                    <EditableCell
                      value={tx.description}
                      placeholder="description"
                      onSave={v => patchRow(tx.id, { description: v || null })}
                    />
                  </td>
                  <td className="px-3 py-2 min-w-[55px] hidden lg:table-cell">
                    <span className={`block text-xs ${tx.apartment_num ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                      {tx.apartment_num ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 min-w-[140px] hidden lg:table-cell">
                    <SelectCell
                      value={tx.tenant_name}
                      groups={tenantSelectGroups}
                      placeholder="locataire"
                      onSave={v => {
                        const tenant = tenantOptions.find(t => t.name === v)
                        patchRow(tx.id, {
                          tenant_name: v,
                          apartment_num: tenant?.apartment_num ?? tx.apartment_num,
                        })
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-400 hidden md:table-cell max-w-[180px] whitespace-normal break-words text-xs">
                    {tx.notes ?? '—'}
                  </td>
                  <td className="px-3 py-2 hidden xl:table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SOURCE_COLORS[tx.source] ?? 'bg-gray-100 text-gray-600'}`}>
                      {SOURCE_LABELS[tx.source] ?? tx.source}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={tx.validated}
                      onChange={e => patchRow(tx.id, { validated: e.target.checked })}
                      className="accent-blue-primary w-4 h-4 cursor-pointer"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t border-gray-100 bg-gray-50">
              <tr>
                <td className="px-3 py-3 text-xs text-gray-400" colSpan={11}>
                  {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
                  {filtered.filter(r => r.validated).length > 0 && (
                    <span className="ml-2 text-green-600">
                      · {filtered.filter(r => r.validated).length} validée{filtered.filter(r => r.validated).length > 1 ? 's' : ''}
                    </span>
                  )}
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
