'use client'

import { useState, useTransition, useRef } from 'react'
import {
  updateCandidateFieldAction,
  updateGuarantorFieldAction,
  updateApplicationFieldAction,
  updateVisitorFieldAction,
} from './actions'

export type EditableEntity = 'candidate' | 'guarantor' | 'application' | 'visitor'
export type EditableInputType = 'text' | 'email' | 'tel' | 'date' | 'time' | 'number' | 'textarea' | 'select'
// Une fonction (ex. formatDisplay={fmtDate}) ne peut pas traverser la frontière Server → Client
// Component ("Functions cannot be passed directly to Client Components") — seule une Server
// Action ('use server') peut. Le formatage d'affichage passe donc par une clé identifiant une
// fonction pure définie ici, côté client, plutôt que par la fonction elle-même en prop.
export type EditableFormat = 'date' | 'uppercase' | 'duration' | 'income'

const ACTIONS: Record<EditableEntity, (id: string, field: string, value: string, applicationId: string) => Promise<{ ok: boolean; error?: string }>> = {
  candidate: (id, field, value, applicationId) => updateCandidateFieldAction(id, field as never, value, applicationId),
  guarantor: (id, field, value, applicationId) => updateGuarantorFieldAction(id, field as never, value, applicationId),
  application: (id, field, value) => updateApplicationFieldAction(id, field as never, value),
  visitor: (id, field, value, applicationId) => updateVisitorFieldAction(id, field as never, value, applicationId),
}

function fmtDateDisplay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtDurationDisplay(raw: string): string {
  const months = Number(raw)
  if (!months) return '—'
  if (months < 12) return `${months} mois`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return years === 1 ? '1 an' : `${years} ans`
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`
}

function fmtIncomeDisplay(raw: string): string {
  return `${Number(raw).toLocaleString('fr-FR')} €/mois`
}

const FORMATTERS: Record<EditableFormat, (value: string) => string> = {
  date: fmtDateDisplay,
  uppercase: v => v.toUpperCase(),
  duration: fmtDurationDisplay,
  income: fmtIncomeDisplay,
}

const inputCls = 'border border-gray-200 rounded px-1.5 py-1 text-sm w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-teal/40'

export default function EditableRow({
  label,
  entity,
  id,
  applicationId,
  field,
  initialValue,
  type = 'text',
  options,
  format,
}: {
  label: string
  entity: EditableEntity
  id: string
  applicationId: string
  field: string
  initialValue: string | null
  type?: EditableInputType
  options?: { value: string; label: string }[]
  format?: EditableFormat
}) {
  const [value, setValue] = useState(initialValue)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialValue ?? '')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  function startEdit() {
    setError(null)
    setDraft(value ?? '')
    setEditing(true)
    setTimeout(() => (inputRef.current ?? textareaRef.current ?? selectRef.current)?.focus(), 0)
  }

  function commit(newValue: string) {
    const normalized = newValue.trim()
    if (normalized === (value ?? '')) {
      setEditing(false)
      return
    }
    const prev = value
    setValue(normalized || null)
    setEditing(false)
    startTransition(async () => {
      const r = await ACTIONS[entity](id, field, normalized, applicationId)
      if (!r.ok) {
        setValue(prev)
        setError(r.error ?? 'Erreur')
      }
    })
  }

  const display = type === 'select'
    ? options?.find(o => o.value === (value ?? ''))?.label
    : value
      ? (format ? FORMATTERS[format](value) : value)
      : null

  let editor: React.ReactNode
  if (type === 'select') {
    editor = (
      <select
        ref={selectRef}
        value={draft}
        onChange={e => { setDraft(e.target.value); commit(e.target.value) }}
        onBlur={() => setEditing(false)}
        className={inputCls}
      >
        {options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  } else if (type === 'textarea') {
    editor = (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        rows={3}
        className={inputCls + ' max-w-none'}
      />
    )
  } else {
    editor = (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape') setEditing(false)
        }}
        className={inputCls}
      />
    )
  }

  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-400 w-44 shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm flex-1 min-w-0">
        {editing ? editor : (
          <button
            type="button"
            onClick={startEdit}
            className="text-left w-full rounded px-1 -mx-1 hover:bg-gray-50 transition-colors text-gray-900"
          >
            {display ?? <span className="text-gray-300">—</span>}
          </button>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </dd>
    </div>
  )
}
