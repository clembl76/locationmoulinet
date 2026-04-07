'use client'

import { useState, useTransition } from 'react'
import { updateCheckInElementAction } from '@/app/admin/apartments/[number]/edl/[reportId]/actions'
import type { EdlElement } from '@/lib/adminData'

const CONDITIONS = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état'] as const

const CONDITION_COLORS: Record<string, string> = {
  'Neuf':          'bg-blue-100 text-blue-700',
  'Bon état':      'bg-green-100 text-green-700',
  "État d'usage":  'bg-amber-100 text-amber-700',
  'Mauvais état':  'bg-red-100 text-red-700',
}

function ConditionSelect({
  elementId, field, value, onChange,
}: {
  elementId: string
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
        startTransition(async () => { await updateCheckInElementAction(elementId, field, v) })
      }}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-primary/40 ${value ? CONDITION_COLORS[value] ?? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}
    >
      <option value="">—</option>
      {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}

function CommentInput({
  elementId, field, value, onChange,
}: {
  elementId: string
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
        startTransition(async () => { await updateCheckInElementAction(elementId, field, v) })
      }}
      placeholder="Commentaire…"
      className="w-full text-xs text-gray-500 bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-primary focus:outline-none resize-none overflow-hidden py-0.5 placeholder:text-gray-300 leading-relaxed"
    />
  )
}

function groupByRoom(rows: EdlElement[]) {
  const groups: Array<{ room: string; items: EdlElement[] }> = []
  for (const row of rows) {
    if (!groups.length || groups[groups.length - 1].room !== row.room) {
      groups.push({ room: row.room, items: [row] })
    } else {
      groups[groups.length - 1].items.push(row)
    }
  }
  return groups
}

export default function EdlElementsTable({ initialElements }: { initialElements: EdlElement[] }) {
  const [elements, setElements] = useState(initialElements)

  function update(id: string, patch: Partial<EdlElement>) {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  const groups = groupByRoom(elements)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-y border-gray-100">
          <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <th className="text-left px-4 py-2 w-32">Pièce</th>
            <th className="text-left px-4 py-2">Élément</th>
            <th className="text-left px-4 py-2 w-36">État entrée</th>
            <th className="text-left px-4 py-2 w-48">Commentaire</th>
            <th className="text-left px-4 py-2 w-36">État sortie</th>
            <th className="text-left px-4 py-2 w-48">Commentaire</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {groups.map(({ room, items }) =>
            items.map((el, i) => (
              <tr key={el.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-1.5 font-medium text-gray-700 align-middle text-xs">
                  {i === 0 ? room : ''}
                </td>
                <td className="px-4 py-1.5 text-gray-600 align-middle">{el.element}</td>
                <td className="px-4 py-1.5 align-middle">
                  <ConditionSelect
                    elementId={el.id} field="condition_entry" value={el.condition_entry}
                    onChange={v => update(el.id, { condition_entry: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <CommentInput
                    elementId={el.id} field="comment_entry" value={el.comment_entry}
                    onChange={v => update(el.id, { comment_entry: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <ConditionSelect
                    elementId={el.id} field="condition_exit" value={el.condition_exit}
                    onChange={v => update(el.id, { condition_exit: v })}
                  />
                </td>
                <td className="px-4 py-1.5 align-middle">
                  <CommentInput
                    elementId={el.id} field="comment_exit" value={el.comment_exit}
                    onChange={v => update(el.id, { comment_exit: v })}
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
