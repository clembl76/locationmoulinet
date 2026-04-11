'use client'

import { useState, useTransition } from 'react'
import type { VisitSettings, VisitAvailabilityRule, VisitAvailabilityException } from '@/lib/adminData'
import {
  setVisitActiveAction,
  setSlotDurationAction,
  addRuleAction,
  deleteRuleAction,
  addExceptionAction,
  deleteExceptionAction,
  updateContactAction,
} from './actions'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const SLOT_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
]

// ─── Small UI ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-primary' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary'

// ─── DayRow ───────────────────────────────────────────────────────────────────

function DayRow({ dayOfWeek, rules }: { dayOfWeek: number; rules: VisitAvailabilityRule[] }) {
  const [, startTransition] = useTransition()
  const [start, setStart] = useState('09:00')
  const [end, setEnd]     = useState('12:00')
  const [adding, setAdding] = useState(false)

  function handleAdd() {
    if (!start || !end || start >= end) return
    setAdding(true)
    startTransition(async () => {
      await addRuleAction(dayOfWeek, start, end)
      setAdding(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteRuleAction(id))
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0 pt-1">
          <span className={`text-sm font-semibold ${rules.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
            {DAY_LABELS[dayOfWeek]}
          </span>
          {rules.length === 0 && <p className="text-xs text-gray-400 mt-0.5">Indisponible</p>}
        </div>

        <div className="flex-1 space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-2 text-sm">
              <span className="bg-blue-light text-blue-dark px-3 py-1 rounded-lg font-medium">
                {rule.start_time.slice(0, 5)} — {rule.end_time.slice(0, 5)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(rule.id)}
                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none font-bold"
              >
                ×
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 flex-wrap">
            <input type="time" value={start} onChange={e => setStart(e.target.value)} className={inputCls} />
            <span className="text-xs text-gray-400">à</span>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={inputCls} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !start || !end || start >= end}
              className="text-sm text-blue-primary hover:text-blue-dark font-medium disabled:opacity-40 transition-colors"
            >
              + Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ExceptionsPanel ──────────────────────────────────────────────────────────

function ExceptionsPanel({ exceptions }: { exceptions: VisitAvailabilityException[] }) {
  const [, startTransition] = useTransition()
  const [date, setDate]       = useState('')
  const [label, setLabel]     = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [adding, setAdding] = useState(false)

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  function handleAdd() {
    if (!date) return
    // Si une seule des deux heures est remplie → invalide
    if ((startTime && !endTime) || (!startTime && endTime)) return
    if (startTime && endTime && startTime >= endTime) return
    setAdding(true)
    startTransition(async () => {
      await addExceptionAction(date, label.trim() || null, startTime || null, endTime || null)
      setDate(''); setLabel(''); setStartTime(''); setEndTime('')
      setAdding(false)
    })
  }

  function handleDelete(id: string) {
    startTransition(() => deleteExceptionAction(id))
  }

  return (
    <div className="space-y-3">
      {exceptions.length === 0 && (
        <p className="text-sm text-gray-400 italic">Aucune exception configurée.</p>
      )}
      {exceptions.map(ex => (
        <div key={ex.id} className="flex items-center gap-3 text-sm flex-wrap">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg font-medium">
            {new Date(ex.date + 'T12:00:00').toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
            {ex.start_time && ex.end_time && (
              <span className="ml-2 font-normal">
                {ex.start_time.slice(0, 5)} — {ex.end_time.slice(0, 5)}
              </span>
            )}
          </span>
          {ex.label && <span className="text-gray-500">{ex.label}</span>}
          <button
            type="button"
            onClick={() => handleDelete(ex.id)}
            className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none font-bold"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 flex-wrap pt-2">
        <input type="date" value={date} min={todayStr} onChange={e => setDate(e.target.value)} className={inputCls} />
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Motif (optionnel)"
          className={`${inputCls} w-40`}
        />
        <span className="text-xs text-gray-400">Plage (optionnel) :</span>
        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} />
        <span className="text-xs text-gray-400">à</span>
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputCls} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !date || (startTime && !endTime) || (!startTime && !!endTime) || (!!startTime && !!endTime && startTime >= endTime) ? true : false}
          className="text-sm text-blue-primary hover:text-blue-dark font-medium disabled:opacity-40 transition-colors"
        >
          + Ajouter
        </button>
      </div>
      <p className="text-xs text-gray-400">Sans plage horaire = journée entière bloquée.</p>
    </div>
  )
}

// ─── ContactPanel ─────────────────────────────────────────────────────────────

function ContactPanel({ settings }: { settings: VisitSettings }) {
  const [, startTransition] = useTransition()
  const [name,    setName]    = useState(settings.contact_name    ?? '')
  const [phone,   setPhone]   = useState(settings.contact_phone   ?? '')
  const [email,   setEmail]   = useState(settings.contact_email   ?? '')
  const [website, setWebsite] = useState(settings.contact_website ?? '')
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateContactAction({ contact_name: name, contact_phone: phone, contact_email: email, contact_website: website })
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setSaveError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nom / Prénom</label>
          <input value={name} onChange={e => setName(e.target.value)} className={`w-full ${inputCls}`} placeholder="Mme Clémentine ALAOUI" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={`w-full ${inputCls}`} placeholder="06 28 07 67 29" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={`w-full ${inputCls}`} placeholder="location.moulinet@gmail.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Site web</label>
          <input value={website} onChange={e => setWebsite(e.target.value)} className={`w-full ${inputCls}`} placeholder="https://…" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="text-sm bg-blue-primary text-white px-4 py-1.5 rounded-lg hover:bg-blue-dark transition-colors"
        >
          Enregistrer
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Sauvegardé</span>}
        {saveError && <span className="text-xs text-red-500">{saveError}</span>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AvailabilityManager({
  settings,
  rules,
  exceptions,
}: {
  settings: VisitSettings
  rules: VisitAvailabilityRule[]
  exceptions: VisitAvailabilityException[]
}) {
  const [, startTransition] = useTransition()
  const [active, setActive]     = useState(settings.active)
  const [duration, setDuration] = useState(settings.slot_duration_minutes)

  function handleToggleActive(v: boolean) {
    setActive(v)
    startTransition(async () => {
      const r = await setVisitActiveAction(v)
      if (!r.ok) setActive(!v) // revert on failure
    })
  }

  function handleDurationChange(v: number) {
    const prev = duration
    setDuration(v)
    startTransition(async () => {
      const r = await setSlotDurationAction(v)
      if (!r.ok) setDuration(prev) // revert on failure
    })
  }

  const rulesByDay: Record<number, VisitAvailabilityRule[]> = {}
  for (let i = 0; i < 7; i++) rulesByDay[i] = []
  for (const rule of rules) rulesByDay[rule.day_of_week]?.push(rule)

  return (
    <div className="space-y-6">

      {/* ── Paramètres globaux ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Paramètres généraux</h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Visites activées</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {active ? 'Les visiteurs peuvent prendre rendez-vous.' : "Aucun créneau n'est proposé aux visiteurs."}
            </p>
          </div>
          <Toggle checked={active} onChange={handleToggleActive} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Durée d'un créneau</p>
            <p className="text-xs text-gray-400 mt-0.5">Durée allouée par visite.</p>
          </div>
          <select
            value={duration}
            onChange={e => handleDurationChange(Number(e.target.value))}
            className={inputCls}
          >
            {SLOT_DURATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Contact gestion locative ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Contact gestion locative</h2>
        <p className="text-xs text-gray-400 mb-4">
          Ces informations apparaissent dans les invitations Google Agenda envoyées aux visiteurs.
        </p>
        <ContactPanel settings={settings} />
      </div>

      {/* ── Plages hebdomadaires ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Plages hebdomadaires</h2>
        <p className="text-xs text-gray-400 mb-4">
          Un jour sans plage est considéré indisponible.
        </p>
        {Array.from({ length: 7 }, (_, i) => (
          <DayRow key={i} dayOfWeek={i} rules={rulesByDay[i] ?? []} />
        ))}
      </div>

      {/* ── Exceptions ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Exceptions (journées ou plages bloquées)</h2>
        <p className="text-xs text-gray-400 mb-4">
          Sans plage horaire : toute la journée est bloquée. Avec plage : seuls les créneaux compris dans la plage sont bloqués.
        </p>
        <ExceptionsPanel exceptions={exceptions} />
      </div>

    </div>
  )
}
