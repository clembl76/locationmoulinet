'use client'

import { useState, useTransition } from 'react'
import { updateInventoryItemAction } from '@/app/admin/apartments/[number]/edl/[reportId]/actions'
import type { EdlItem } from '@/lib/adminData'

const CONDITIONS = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état'] as const

const CONDITION_COLORS: Record<string, string> = {
  'Neuf':          'bg-blue-100 text-blue-700',
  'Bon état':      'bg-green-100 text-green-700',
  "État d'usage":  'bg-amber-100 text-amber-700',
  'Mauvais état':  'bg-red-100 text-red-700',
}

function ConditionSelect({ itemId, field, value, onChange }: {
  itemId: string
  field: 'condition_entry' | 'condition_exit'
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [, startTransition] = useTransition()
  return (
    <select
      value={value ?? ''}
      onChange={e => {
        const v = e.target.value || null
        onChange(v)
        startTransition(async () => { await updateInventoryItemAction(itemId, field, v) })
      }}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-primary/40 ${value ? CONDITION_COLORS[value] ?? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}
    >
      <option value="">—</option>
      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

function QuantityInput({ itemId, field, value, onChange }: {
  itemId: string
  field: 'quantity_entry' | 'quantity_exit'
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const [, startTransition] = useTransition()
  return (
    <input
      type="number"
      min={0}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim() !== '' ? Number(draft) : null
        onChange(v)
        startTransition(async () => { await updateInventoryItemAction(itemId, field, v) })
      }}
      className="w-14 text-center text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-primary focus:outline-none py-0.5"
    />
  )
}

function CommentInput({ itemId, field, value, onChange }: {
  itemId: string
  field: 'comment_entry' | 'comment_exit'
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [draft, setDraft] = useState(value ?? '')
  const [, startTransition] = useTransition()

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  return (
    <textarea
      rows={1}
      value={draft}
      onChange={e => { setDraft(e.target.value); autoResize(e.target) }}
      onFocus={e => autoResize(e.target)}
      onBlur={e => {
        const v = e.target.value.trim() || null
        onChange(v)
        startTransition(async () => { await updateInventoryItemAction(itemId, field, v) })
      }}
      placeholder="Commentaire…"
      className="w-full text-xs text-gray-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-primary focus:outline-none resize-none overflow-hidden py-0.5 placeholder:text-gray-300 leading-relaxed"
    />
  )
}

function groupByRoom(rows: EdlItem[]) {
  const groups: Array<{ room: string; items: EdlItem[] }> = []
  for (const row of rows) {
    if (!groups.length || groups[groups.length - 1].room !== row.room) {
      groups.push({ room: row.room, items: [row] })
    } else {
      groups[groups.length - 1].items.push(row)
    }
  }
  return groups
}

export default function EdlItemsTable({ initialItems }: { initialItems: EdlItem[] }) {
  const [items, setItems] = useState(initialItems)

  function update(id: string, patch: Partial<EdlItem>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  const groups = groupByRoom(items)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <th className="text-left px-4 py-2 w-32">Pièce</th>
            <th className="text-left px-4 py-2">Article</th>
            <th className="text-center px-3 py-2 w-20">Qté entrée</th>
            <th className="text-left px-4 py-2 w-36">État</th>
            <th className="text-left px-4 py-2 w-40">Commentaire</th>
            <th className="text-center px-3 py-2 w-20">Qté sortie</th>
            <th className="text-left px-4 py-2 w-36">État</th>
            <th className="text-left px-4 py-2 w-40">Commentaire</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {groups.map(({ room, items: rows }) =>
            rows.map((it, i) => (
              <tr key={it.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-1.5 font-medium text-gray-700 align-middle text-xs">
                  {i === 0 ? room : ''}
                </td>
                <td className="px-4 py-1.5 text-gray-600 align-middle">{it.item}</td>
                <td className="px-3 py-1.5 text-center align-middle">
                  <QuantityInput
                    itemId={it.id} field="quantity_entry" value={it.quantity_entry}
                    onChange={v => update(it.id, { quantity_entry: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <ConditionSelect
                    itemId={it.id} field="condition_entry" value={it.condition_entry}
                    onChange={v => update(it.id, { condition_entry: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <CommentInput
                    itemId={it.id} field="comment_entry" value={it.comment_entry}
                    onChange={v => update(it.id, { comment_entry: v })}
                  />
                </td>
                <td className="px-3 py-1.5 text-center align-middle">
                  <QuantityInput
                    itemId={it.id} field="quantity_exit" value={it.quantity_exit}
                    onChange={v => update(it.id, { quantity_exit: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <ConditionSelect
                    itemId={it.id} field="condition_exit" value={it.condition_exit}
                    onChange={v => update(it.id, { condition_exit: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <CommentInput
                    itemId={it.id} field="comment_exit" value={it.comment_exit}
                    onChange={v => update(it.id, { comment_exit: v })}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
