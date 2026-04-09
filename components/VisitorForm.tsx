'use client'

import { useState, useTransition, useMemo } from 'react'
import { createVisitorAction, type BookingResult } from '@/app/visiter/actions'
import type { AvailableApartment } from '@/lib/adminData'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS: string[] = []
for (let h = 9; h <= 18; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 18 && m > 0) break
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

const DURATION_OPTIONS = [
  { value: 3,  label: '3 mois' },
  { value: 6,  label: '6 mois' },
  { value: 9,  label: '9 mois' },
  { value: 12, label: '1 an' },
  { value: 18, label: '18 mois' },
  { value: 24, label: '2 ans' },
  { value: 36, label: '3 ans et plus' },
]

const INCOME_MAX = 10000
const INCOME_STEP = 50

const PHONE_RE = /^(\+33|0033|0)[1-9](\s?\d{2}){4}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const DAYS_FR = ['LUN.', 'MAR.', 'MER.', 'JEU.', 'VEN.', 'SAM.', 'DIM.']

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function fmtShortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Small UI components ──────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary transition-colors ${props.className ?? ''}`}
    />
  )
}

function SelectEl(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary bg-white transition-colors ${props.className ?? ''}`}
    />
  )
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mt-3">
      <span className="shrink-0 mt-0.5">⚠</span>
      <span>{children}</span>
    </div>
  )
}

function RadioGroup<T extends string>({
  name, value, options, onChange,
}: {
  name: string
  value: T | ''
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-3 mt-1">
      {options.map(opt => (
        <label
          key={opt.value}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors text-sm select-none ${
            value === opt.value
              ? 'border-blue-primary bg-blue-light font-medium text-blue-primary'
              : 'border-gray-200 hover:border-gray-300 text-gray-700'
          }`}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

// ─── Calendar picker ──────────────────────────────────────────────────────────

function CalendarPicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: {
  selectedDate: string
  selectedTime: string
  onDateChange: (d: string) => void
  onTimeChange: (t: string) => void
}) {
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Build day cells
  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
    const offset = firstWeekday === 0 ? 6 : firstWeekday - 1       // Mon-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()

    const result: { day: number; own: boolean; dateStr: string }[] = []
    for (let i = offset - 1; i >= 0; i--) {
      result.push({ day: prevMonthDays - i, own: false, dateStr: '' })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      result.push({ day: d, own: true, dateStr })
    }
    let next = 1
    while (result.length % 7 !== 0) {
      result.push({ day: next++, own: false, dateStr: '' })
    }
    return result
  }, [viewYear, viewMonth])

  const canGoPrev = viewYear > now.getFullYear() || viewMonth > now.getMonth()

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">

      {/* ── Month grid ── */}
      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 text-lg leading-none"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {MONTHS_FR[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 text-lg leading-none"
          >
            ›
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS_FR.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((cell, i) => {
            if (!cell.own) {
              return <div key={i} className="h-9 flex items-center justify-center text-sm text-gray-300">{cell.day}</div>
            }
            const isPast     = cell.dateStr < todayStr
            const isSelected = cell.dateStr === selectedDate
            const isToday    = cell.dateStr === todayStr

            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => { onDateChange(cell.dateStr); onTimeChange('') }}
                className={`h-9 flex items-center justify-center text-sm rounded-lg transition-colors mx-0.5
                  ${isPast     ? 'text-gray-300 cursor-not-allowed' :
                    isSelected ? 'bg-gray-700 text-white font-semibold' :
                    isToday    ? 'ring-1 ring-blue-primary text-blue-primary font-semibold hover:bg-blue-light' :
                                 'text-gray-700 hover:bg-white hover:shadow-sm cursor-pointer'
                  }`}
              >
                {cell.day}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Time slots ── */}
      <div className="w-full sm:w-44 flex flex-col">
        {selectedDate ? (
          <>
            <p className="text-xs font-semibold text-gray-500 mb-2 capitalize">{fmtDate(selectedDate)}</p>
            <div className="overflow-y-auto max-h-72 space-y-1 pr-1">
              {TIME_SLOTS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTimeChange(t)}
                  className={`w-full text-sm py-2 rounded-lg border transition-colors ${
                    selectedTime === t
                      ? 'bg-blue-primary text-white border-blue-primary font-medium'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Sélectionnez<br />une date
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Apartment card ──────────────────────────────────────────────────────────

function AptCard({
  apt,
  isSelected,
  onToggle,
}: {
  apt: AvailableApartment
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-col">
      <label
        className={`flex items-start gap-3 p-3 rounded-t-xl border cursor-pointer transition-colors ${
          isSelected
            ? 'border-blue-primary bg-blue-light'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-0.5 accent-blue-primary"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Appartement n°{apt.number}
            {apt.floor_label && <span className="font-normal text-gray-500"> · {apt.floor_label}</span>}
          </p>
          <p className="text-xs text-gray-500">
            {apt.surface_area} m² · {apt.rent_including_charges} €/mois CC
          </p>
          {apt.status === 'coming_soon' && apt.available_from && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">
              Disponible à partir du {fmtShortDate(apt.available_from)}
            </p>
          )}
        </div>
      </label>
      <a
        href={`/apartments/${apt.number}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-xs text-blue-primary hover:underline px-3 py-1.5 rounded-b-xl border-x border-b transition-colors ${
          isSelected ? 'border-blue-primary bg-blue-light/60' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        Voir la fiche →
      </a>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function VisitorForm({ apartments }: { apartments: AvailableApartment[] }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<BookingResult | null>(null)

  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState('')
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')

  const [date, setDate]             = useState('')
  const [time, setTime]             = useState('')
  const [selectedApts, setSelectedApts] = useState<string[]>([])

  const [duration, setDuration]     = useState<number | null>(null)
  const [comments, setComments]     = useState('')

  const [situation, setSituation]         = useState<'student' | 'other' | ''>('')
  const [guarantorType, setGuarantorType] = useState<'none' | 'physical' | 'visale' | ''>('')
  const [income, setIncome]               = useState(0)

  // ── Derived ───────────────────────────────────────────────────────────────

  const availableApts   = apartments.filter(a => a.status === 'available')
  const comingSoonApts  = apartments.filter(a => a.status === 'coming_soon')

  const maxRent = useMemo(() => {
    if (selectedApts.length === 0) return 0
    return Math.max(
      ...selectedApts.map(id => apartments.find(a => a.id === id)?.rent_including_charges ?? 0)
    )
  }, [selectedApts, apartments])

  const situationWarning = situation === 'other'
  const incomeWarning    = selectedApts.length > 0 && income < maxRent * 3
  const canSubmit        =
    !pending &&
    apartments.length > 0 &&
    selectedApts.length > 0 &&
    !!date && !!time &&
    situation !== '' &&
    guarantorType !== '' &&
    duration !== null &&
    income > 0 &&
    !situationWarning &&
    !incomeWarning

  // ── Validators ────────────────────────────────────────────────────────────

  function validateEmail(value: string) {
    if (!value.trim()) { setEmailError(''); return }
    setEmailError(EMAIL_RE.test(value.trim()) ? '' : 'Adresse email invalide')
  }

  function validatePhone(value: string) {
    if (!value.trim()) { setPhoneError(''); return }
    setPhoneError(
      PHONE_RE.test(value.trim())
        ? ''
        : 'Format invalide. Ex : 06 12 34 56 78 ou +33 6 12 34 56 78'
    )
  }

  function toggleApt(id: string) {
    setSelectedApts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (phoneError || emailError) return
    startTransition(async () => {
      const r = await createVisitorAction({
        last_name: lastName,
        first_name: firstName,
        email,
        phone,
        visit_date: date,
        visit_time: time,
        desired_duration_months: duration,
        comments,
        apartment_ids: selectedApts,
        guarantor_type: guarantorType || null,
        situation: situation || null,
        total_income: income > 0 ? income : null,
      })
      setResult(r)
      if (r.ok) window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (result?.ok) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-3">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-bold text-green-800">Demande envoyée !</h2>
        <p className="text-green-700 text-sm">
          Merci {firstName}, votre demande de visite a bien été reçue.<br />
          Nous vous contacterons rapidement pour confirmer le rendez-vous.
        </p>
        <button
          onClick={() => {
            setResult(null); setSelectedApts([]); setDate(''); setTime('')
            setIncome(0); setSituation(''); setGuarantorType('')
          }}
          className="mt-4 text-sm text-green-600 underline hover:text-green-800"
        >
          Faire une nouvelle demande
        </button>
      </div>
    )
  }

  const buildings = Array.from(new Set(availableApts.map(a => a.building_address)))
  const csBuildingsSet = Array.from(new Set(comingSoonApts.map(a => a.building_address)))

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Informations personnelles */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
          Vos informations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Prénom</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Paul" />
          </div>
          <div>
            <Label required>Nom</Label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="MARTIN" />
          </div>
          <div>
            <Label required>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value) }}
              onBlur={e => validateEmail(e.target.value)}
              required
              placeholder="paul@exemple.fr"
            />
            {emailError && <FieldError msg={emailError} />}
          </div>
          <div>
            <Label required>Téléphone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value) }}
              onBlur={e => validatePhone(e.target.value)}
              required
              placeholder="06 12 34 56 78"
            />
            {phoneError && <FieldError msg={phoneError} />}
          </div>
        </div>
      </section>

      {/* Appartements */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between pb-2 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Appartements à visiter <span className="text-red-400">*</span>
          </h2>
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-primary hover:underline">
            Voir tous les appartements →
          </a>
        </div>

        {apartments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun appartement disponible pour le moment.</p>
        ) : (
          <div className="space-y-5">
            {/* Disponibles maintenant */}
            {availableApts.length > 0 && (
              <div className="space-y-3">
                {buildings.map(building => (
                  <div key={building}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{building}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableApts.filter(a => a.building_address === building).map(apt => (
                        <AptCard key={apt.id} apt={apt} isSelected={selectedApts.includes(apt.id)} onToggle={() => toggleApt(apt.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prochainement disponibles */}
            {comingSoonApts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    Prochainement disponibles
                  </p>
                  <span className="text-xs text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    Visite possible en anticipation
                  </span>
                </div>
                {csBuildingsSet.map(building => (
                  <div key={building}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{building}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {comingSoonApts.filter(a => a.building_address === building).map(apt => (
                        <AptCard key={apt.id} apt={apt} isSelected={selectedApts.includes(apt.id)} onToggle={() => toggleApt(apt.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Date et heure — vue calendrier */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
          Date et heure souhaitées <span className="text-red-400">*</span>
        </h2>
        <CalendarPicker
          selectedDate={date}
          selectedTime={time}
          onDateChange={setDate}
          onTimeChange={setTime}
        />
        {date && !time && (
          <p className="text-xs text-amber-600">Veuillez sélectionner un créneau horaire.</p>
        )}
        {date && time && (
          <p className="text-xs text-blue-primary font-medium">
            Créneau sélectionné : {fmtDate(date)} à {time}
          </p>
        )}
      </section>

      {/* Votre profil */}
      <section className="space-y-5">
        <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
          Votre profil
        </h2>

        <div>
          <Label required>Situation</Label>
          <RadioGroup
            name="situation"
            value={situation}
            options={[
              { value: 'student', label: 'Étudiant(e)' },
              { value: 'other',   label: 'Autre' },
            ]}
            onChange={setSituation}
          />
          {situationWarning && (
            <WarningBox>
              Nos logements sont réservés aux étudiants. Nous ne sommes malheureusement
              pas en mesure d&apos;étudier votre dossier, mais nous vous remercions de
              l&apos;intérêt que vous portez à nos appartements.
            </WarningBox>
          )}
        </div>

        <div>
          <Label required>Garant</Label>
          <RadioGroup
            name="guarantor_type"
            value={guarantorType}
            options={[
              { value: 'none',     label: 'Pas de garant' },
              { value: 'physical', label: 'Garant physique' },
              { value: 'visale',   label: 'Garantie Visale' },
            ]}
            onChange={setGuarantorType}
          />
        </div>

        <div>
          <Label required>
            Revenus mensuels nets cumulés
            {guarantorType && guarantorType !== 'none' ? ' (vous + garant)' : ''}
          </Label>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={INCOME_MAX}
                step={INCOME_STEP}
                value={income}
                onChange={e => setIncome(Number(e.target.value))}
                className="flex-1 accent-blue-primary"
              />
              <span className="text-sm font-semibold text-gray-800 w-28 text-right shrink-0">
                {income === 0 ? 'Non renseigné' : `${income.toLocaleString('fr-FR')} €/mois`}
              </span>
            </div>
            {selectedApts.length > 0 && maxRent > 0 && (
              <p className="text-xs text-gray-400">
                Requis : gagner au moins 3 fois le loyer CC
              </p>
            )}
          </div>
          {incomeWarning && (
            <WarningBox>
              Nous exigeons des revenus mensuels nets d&apos;au moins 3 fois le loyer charges
              comprises ({(maxRent * 3).toLocaleString('fr-FR')} €/mois).
              Nous ne pouvons malheureusement pas étudier les dossiers ne remplissant pas
              cette condition.
            </WarningBox>
          )}
        </div>
      </section>

      {/* Votre projet */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
          Votre projet
        </h2>
        <div>
          <Label required>Durée de location souhaitée</Label>
          <SelectEl
            value={duration ?? ''}
            onChange={e => setDuration(e.target.value ? Number(e.target.value) : null)}
            required
          >
            <option value="">Choisir une durée</option>
            {DURATION_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </SelectEl>
        </div>
        <div>
          <Label>Commentaires</Label>
          <textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            rows={3}
            placeholder="Questions, situation actuelle, date d'emménagement souhaitée…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary resize-none"
          />
        </div>
      </section>

      {result && !result.ok && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {result.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || !!phoneError || !!emailError || apartments.length === 0}
        className="w-full font-semibold bg-blue-primary text-white px-6 py-3 rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {pending ? 'Envoi en cours…' : 'Envoyer ma demande de visite'}
      </button>
    </form>
  )
}
