'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { AllTransactionRow } from '@/lib/adminData'

type SortKey = 'date' | 'amount' | 'supplier' | 'type' | 'apartment_num'
type SortDir = 'asc' | 'desc'

export default function PaymentsClient({ transactions }: { transactions: AllTransactionRow[] }) {
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterApt, setFilterApt] = useState('')
  const [filterDir, setFilterDir] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 10

  const allSuppliers = useMemo(() => {
    const s = new Set<string>()
    for (const tx of transactions) if (tx.supplier) s.add(tx.supplier)
    return Array.from(s).sort()
  }, [transactions])

  const allTypes = useMemo(() => {
    const s = new Set<string>()
    for (const tx of transactions) if (tx.type) s.add(tx.type)
    return Array.from(s).sort()
  }, [transactions])

  const allApts = useMemo(() => {
    const s = new Set<string>()
    for (const tx of transactions) if (tx.apartment_num) s.add(tx.apartment_num)
    return Array.from(s).sort((a, b) => Number(a) - Number(b))
  }, [transactions])

  const filtered = useMemo(() => {
    let rows = transactions

    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(tx => (tx.description ?? '').toLowerCase().includes(q))
    }
    if (filterSupplier) rows = rows.filter(tx => tx.supplier === filterSupplier)
    if (filterType) rows = rows.filter(tx => tx.type === filterType)
    if (filterApt) rows = rows.filter(tx => tx.apartment_num === filterApt)
    if (filterDir) rows = rows.filter(tx => tx.direction === filterDir)

    rows = [...rows].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (sortKey === 'amount') { av = Number(av); bv = Number(bv) }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return rows
  }, [transactions, search, filterSupplier, filterType, filterApt, filterDir, sortKey, sortDir])

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        {label}
        {sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </button>
    )
  }

  const total = filtered.reduce((s, tx) => {
    return tx.direction === 'CREDIT' ? s + tx.amount : s - tx.amount
  }, 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher dans la description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary min-w-[220px]"
        />
        <select
          value={filterSupplier}
          onChange={e => setFilterSupplier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Fournisseur (tous)</option>
          {allSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterDir}
          onChange={e => setFilterDir(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Sens (tous)</option>
          <option value="CREDIT">Crédit</option>
          <option value="DEBIT">Débit</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Type (tous)</option>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterApt}
          onChange={e => setFilterApt(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">Appartement (tous)</option>
          {allApts.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || filterSupplier || filterType || filterApt || filterDir) && (
          <button
            onClick={() => { setSearch(''); setFilterSupplier(''); setFilterType(''); setFilterApt(''); setFilterDir(''); setPage(1) }}
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
              <th className="text-right px-4 py-3"><SortBtn col="amount" label="Montant" /></th>
              <th className="text-left px-4 py-3"><SortBtn col="supplier" label="Fournisseur" /></th>
              <th className="text-left px-4 py-3"><SortBtn col="type" label="Type" /></th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
              <th className="text-left px-4 py-3"><SortBtn col="apartment_num" label="Appt" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  Aucune transaction.
                </td>
              </tr>
            ) : (
              paginated.map((tx, i) => {
                const clickable = tx.apartment_num && tx.has_active_tenant
                return (
                  <tr
                    key={tx.id ?? i}
                    onClick={clickable ? () => router.push(`/admin/apartments/${tx.apartment_num}`) : undefined}
                    className={`${clickable ? 'cursor-pointer hover:bg-blue-light/50' : ''} transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${tx.direction === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.direction === 'CREDIT' ? '+' : '−'}{Number(tx.amount).toLocaleString('fr-FR')} €
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{tx.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{tx.type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell max-w-[200px] truncate">{tx.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{tx.apartment_num ?? '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t border-gray-100 bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-xs text-gray-400">{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {total >= 0 ? '+' : '−'}{Math.abs(total).toLocaleString('fr-FR')} €
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Page {safePage} / {totalPages} — {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
          </p>
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
                  <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
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
