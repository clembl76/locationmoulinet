'use client'

import { useState, useTransition, useRef } from 'react'
import { updateLeaseDateAction, type EditableLeaseDateField } from '@/app/admin/apartments/[number]/actions'

function fmtFr(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR')
}

export default function EditableLeaseDate({
  leaseId,
  aptNumber,
  field,
  initialValue,
}: {
  leaseId: string
  aptNumber: string
  field: EditableLeaseDateField
  initialValue: string | null
}) {
  const [value, setValue] = useState(initialValue)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialValue ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setError(null)
    setDraft(value ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit(newDate: string) {
    if (!newDate || newDate === value) {
      setEditing(false)
      return
    }
    const prev = value
    setValue(newDate)
    setEditing(false)
    startTransition(async () => {
      const r = await updateLeaseDateAction(leaseId, aptNumber, field, newDate)
      if (!r.ok) {
        setValue(prev)
        setError(r.error ?? 'Erreur')
      }
    })
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape') setEditing(false)
        }}
        disabled={pending}
        className="border border-gray-200 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-primary/40"
      />
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={startEdit}
        className="rounded px-1 -mx-1 hover:bg-gray-100 transition-colors cursor-text"
      >
        {value ? fmtFr(value) : '—'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
