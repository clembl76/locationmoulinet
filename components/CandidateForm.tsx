'use client'

import { useState, useTransition, useRef } from 'react'
import { createCandidateAction, type CandidateResult } from '@/app/candidater/actions'
import type { CandidateApartment } from '@/lib/adminData'

// ─── Constants ────────────────────────────────────────────────────────────────

const PHONE_RE = /^(\+33|0033|0)[1-9](\s?\d{2}){4}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_BIRTH_DATE = '2000-01-01'
const MAX_FILES = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function maxBirthDate() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtAvailable(apt: CandidateApartment) {
  if (apt.status === 'available') return 'Disponible maintenant'
  if (!apt.available_from) return 'Bientôt disponible'
  return `Disponible à partir du ${new Date(apt.available_from + 'T12:00:00').toLocaleDateString('fr-FR')}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1400
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.75,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// ─── Small UI components ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary'
const inputErrCls = 'w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300/30 focus:border-red-400'

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputCls}>{props.children}</select>
}

// ─── FileSection ──────────────────────────────────────────────────────────────
// Permet d'accumuler jusqu'à MAX_FILES fichiers en les ajoutant un par un.
// Expose les fichiers via un hidden <input> synthétique (DataTransfer).

function FileSection({
  name,
  title,
  info,
  required,
  files,
  onFilesChange,
}: {
  name: string
  title: string
  info?: string
  required?: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canAdd = files.length < MAX_FILES

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (!picked.length) return
    e.target.value = ''
    const compressed = await Promise.all(picked.map(compressIfImage))
    const merged = [...files, ...compressed].slice(0, MAX_FILES)
    onFilesChange(merged)
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-700">
          {title}{required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
        {info && <p className="text-xs text-gray-400 mt-0.5">{info}</p>}
      </div>

      {/* Liste des fichiers accumulés */}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between bg-blue-light rounded-lg px-3 py-1.5 text-xs">
              <span className="text-gray-700 truncate max-w-[70%]">{f.name}</span>
              <span className="text-gray-400 ml-2 flex-shrink-0">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-3 text-gray-400 hover:text-red-500 flex-shrink-0 font-bold"
                aria-label="Supprimer"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Bouton ajouter */}
      {canAdd && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleAdd}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm text-blue-primary hover:text-blue-dark font-medium underline underline-offset-2"
          >
            + Ajouter un fichier {files.length > 0 ? `(${files.length}/${MAX_FILES})` : ''}
          </button>
        </div>
      )}
      {!canAdd && (
        <p className="text-xs text-gray-400">Maximum {MAX_FILES} fichiers atteint.</p>
      )}
    </div>
  )
}

// ─── AptCard ──────────────────────────────────────────────────────────────────

function AptCard({
  apt,
  isSelected,
  desiredDate,
  onSelect,
}: {
  apt: CandidateApartment
  isSelected: boolean
  desiredDate: string
  onSelect: () => void
}) {
  const blocked = apt.status === 'coming_soon' && apt.available_from && desiredDate
    ? desiredDate < apt.available_from
    : false

  return (
    <button
      type="button"
      onClick={blocked ? undefined : onSelect}
      disabled={blocked}
      className={[
        'w-full text-left p-4 rounded-xl border transition-all',
        isSelected
          ? 'border-blue-primary bg-blue-light'
          : blocked
            ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-blue-primary/40',
      ].join(' ')}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Appartement {apt.number}</p>
          <p className="text-xs text-gray-500 mt-0.5">{apt.building_address} · {apt.surface_area} m²</p>
        </div>
        <p className="text-sm font-semibold text-blue-dark">{apt.rent_including_charges} €/mois CC</p>
      </div>
      <p className={`text-xs mt-2 ${apt.status === 'coming_soon' ? 'text-amber-600' : 'text-green-600'}`}>
        {blocked
          ? `Disponible à partir du ${new Date(apt.available_from! + 'T12:00:00').toLocaleDateString('fr-FR')} — date souhaitée trop tôt`
          : fmtAvailable(apt)}
      </p>
    </button>
  )
}

// ─── PersonBlock ──────────────────────────────────────────────────────────────

function PersonBlock({
  prefix,
  emailError,
  phoneError,
  onEmailBlur,
  onEmailChange,
  onPhoneBlur,
  onPhoneChange,
}: {
  prefix: string
  emailError: string
  phoneError: string
  onEmailBlur: (v: string) => void
  onEmailChange: (v: string) => void
  onPhoneBlur: (v: string) => void
  onPhoneChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Civilité" required>
          <SelectInput name={`${prefix}title`} required>
            <option value="">—</option>
            <option value="M.">M.</option>
            <option value="Mme">Mme</option>
          </SelectInput>
        </Field>
        <div />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom" required>
          <input name={`${prefix}first_name`} required className={inputCls} />
        </Field>
        <Field label="Nom" required>
          <input name={`${prefix}last_name`} required className={inputCls} />
        </Field>
      </div>
      <Field label="Email" required error={emailError}>
        <input
          name={`${prefix}email`}
          type="email"
          required
          className={emailError ? inputErrCls : inputCls}
          onChange={e => onEmailChange(e.target.value)}
          onBlur={e => onEmailBlur(e.target.value)}
        />
      </Field>
      <Field label="Téléphone" required error={phoneError}>
        <input
          name={`${prefix}phone`}
          type="tel"
          required
          placeholder="06 12 34 56 78"
          className={phoneError ? inputErrCls : inputCls}
          onChange={e => onPhoneChange(e.target.value)}
          onBlur={e => onPhoneBlur(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date de naissance" required>
          <input
            name={`${prefix}birth_date`}
            type="date"
            required
            defaultValue={DEFAULT_BIRTH_DATE}
            max={maxBirthDate()}
            className={inputCls}
          />
        </Field>
        <Field label="Lieu de naissance" required>
          <input name={`${prefix}birth_place`} required placeholder="Ville, Pays" className={inputCls} />
        </Field>
      </div>
      <Field label="Adresse actuelle" required>
        <input name={`${prefix}address`} required placeholder="N° rue, code postal, ville, pays" className={inputCls} />
      </Field>
    </div>
  )
}

// ─── State type for all file sections ────────────────────────────────────────

type FileSections = {
  candidate_identity: File[]
  candidate_income: File[]
  candidate_status: File[]
  guarantor_identity: File[]
  guarantor_income: File[]
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function CandidateForm({ apartments }: { apartments: CandidateApartment[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()

  const [hasGuarantor, setHasGuarantor] = useState<boolean | null>(null)
  const [selectedAptId, setSelectedAptId] = useState<string>('')
  const [desiredDate, setDesiredDate] = useState('')
  const [result, setResult] = useState<CandidateResult | null>(null)

  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [gEmailError, setGEmailError] = useState('')
  const [gPhoneError, setGPhoneError] = useState('')

  const [fileSections, setFileSections] = useState<FileSections>({
    candidate_identity: [],
    candidate_income: [],
    candidate_status: [],
    guarantor_identity: [],
    guarantor_income: [],
  })

  function setSection(key: keyof FileSections) {
    return (files: File[]) => setFileSections(prev => ({ ...prev, [key]: files }))
  }

  const selectedApt = apartments.find(a => a.id === selectedAptId) ?? null

  function validateEmail(value: string, setErr: (s: string) => void) {
    if (!value.trim()) { setErr(''); return }
    setErr(EMAIL_RE.test(value.trim()) ? '' : 'Adresse email invalide')
  }

  function validatePhone(value: string, setErr: (s: string) => void) {
    if (!value.trim()) { setErr(''); return }
    setErr(PHONE_RE.test(value.trim()) ? '' : 'Format invalide. Ex : 06 12 34 56 78 ou +33 6 12 34 56 78')
  }

  const hasErrors = !!(emailError || phoneError || (hasGuarantor && (gEmailError || gPhoneError)))
  const canSubmit = !pending && !!selectedAptId && hasGuarantor !== null && !!desiredDate && !hasErrors

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (hasErrors) return
    const form = e.currentTarget
    // Build FormData from the form fields (text inputs, selects, radios, hidden)
    // then inject files from state (avoids DataTransfer/hidden-input unreliability)
    const formData = new FormData(form)
    if (selectedApt) formData.set('apt_number', selectedApt.number)

    // Remove any stale file entries from the form, then inject from state
    for (const key of ['candidate_docs_identity','candidate_docs_income','candidate_docs_status','guarantor_docs_identity','guarantor_docs_income']) {
      formData.delete(key)
    }
    fileSections.candidate_identity.forEach(f => formData.append('candidate_docs_identity', f))
    fileSections.candidate_income.forEach(f => formData.append('candidate_docs_income', f))
    fileSections.candidate_status.forEach(f => formData.append('candidate_docs_status', f))
    fileSections.guarantor_identity.forEach(f => formData.append('guarantor_docs_identity', f))
    fileSections.guarantor_income.forEach(f => formData.append('guarantor_docs_income', f))

    startTransition(async () => {
      const r = await createCandidateAction(formData)
      setResult(r)
      if (r.ok) {
        form.reset()
        setFileSections({
          candidate_identity: [],
          candidate_income: [],
          candidate_status: [],
          guarantor_identity: [],
          guarantor_income: [],
        })
      }
    })
  }

  if (result?.ok) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-3">
        <div className="text-4xl">✓</div>
        <h2 className="text-xl font-bold text-gray-900">Candidature envoyée !</h2>
        <p className="text-sm text-gray-500">
          Votre dossier a bien été reçu. Nous vous contacterons prochainement.
        </p>
        {result.driveWarning && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-left">
            ⚠ {result.driveWarning}
          </p>
        )}
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">

      {/* ── Vos informations ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <SectionTitle>Vos informations</SectionTitle>
        <PersonBlock
          prefix=""
          emailError={emailError}
          phoneError={phoneError}
          onEmailBlur={v => validateEmail(v, setEmailError)}
          onEmailChange={v => { if (emailError) validateEmail(v, setEmailError) }}
          onPhoneBlur={v => validatePhone(v, setPhoneError)}
          onPhoneChange={v => { if (phoneError) validatePhone(v, setPhoneError) }}
        />
        <Field label="Situation familiale" required>
          <SelectInput name="family_status" required>
            <option value="">—</option>
            <option value="Célibataire">Célibataire</option>
            <option value="Marié(e)">Marié(e)</option>
            <option value="Pacsé(e)">Pacsé(e)</option>
            <option value="Divorcé(e)">Divorcé(e)</option>
            <option value="Veuf/Veuve">Veuf/Veuve</option>
          </SelectInput>
        </Field>
      </div>

      {/* ── Date souhaitée ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionTitle>Date de début de bail souhaitée</SectionTitle>
        <Field label="Date souhaitée" required>
          <input
            name="desired_signing_date"
            type="date"
            required
            min={todayStr()}
            value={desiredDate}
            onChange={e => setDesiredDate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* ── Appartement souhaité ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionTitle>Appartement souhaité</SectionTitle>
        <div className="space-y-3">
          {apartments.length === 0 && (
            <p className="text-sm text-gray-400">Aucun appartement disponible pour le moment.</p>
          )}
          {apartments.map(apt => (
            <AptCard
              key={apt.id}
              apt={apt}
              isSelected={selectedAptId === apt.id}
              desiredDate={desiredDate}
              onSelect={() => setSelectedAptId(apt.id)}
            />
          ))}
        </div>
        <input type="hidden" name="apartment_id" value={selectedAptId} />
      </div>

      {/* ── Garant ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <div>
          <SectionTitle>Garant</SectionTitle>
          <Field label="Avez-vous un garant ?" required>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="has_guarantor" value="yes" required
                  checked={hasGuarantor === true} onChange={() => setHasGuarantor(true)} />
                Oui
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="has_guarantor" value="no"
                  checked={hasGuarantor === false} onChange={() => setHasGuarantor(false)} />
                Non
              </label>
            </div>
          </Field>
        </div>

        {hasGuarantor && (
          <div>
            <SectionTitle>Informations du garant</SectionTitle>
            <PersonBlock
              prefix="g_"
              emailError={gEmailError}
              phoneError={gPhoneError}
              onEmailBlur={v => validateEmail(v, setGEmailError)}
              onEmailChange={v => { if (gEmailError) validateEmail(v, setGEmailError) }}
              onPhoneBlur={v => validatePhone(v, setGPhoneError)}
              onPhoneChange={v => { if (gPhoneError) validatePhone(v, setGPhoneError) }}
            />
          </div>
        )}
      </div>

      {/* ── Justificatifs garant (avant ceux du locataire) ─────────────────── */}
      {hasGuarantor && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <SectionTitle>Justificatifs garant(e)</SectionTitle>

          <FileSection
            name="guarantor_docs_identity"
            title="Identité"
            required
            info="Pièce d'identité : Passeport ou Carte d'identité, Titre de séjour si vous en avez un."
            files={fileSections.guarantor_identity}
            onFilesChange={setSection('guarantor_identity')}
          />

          <FileSection
            name="guarantor_docs_income"
            title="Revenus"
            required
            info="Justificatifs de revenus : 3 dernières fiches de paie ou dernier avis d'imposition ou attestation de retraite."
            files={fileSections.guarantor_income}
            onFilesChange={setSection('guarantor_income')}
          />
        </div>
      )}

      {/* ── Vos justificatifs ──────────────────────────────────────────────── */}
      {hasGuarantor !== null && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        <SectionTitle>Vos justificatifs</SectionTitle>

        <FileSection
          name="candidate_docs_identity"
          title="Identité"
          required
          info="Pièce d'identité : Passeport ou Carte d'identité, Titre de séjour si vous en avez un."
          files={fileSections.candidate_identity}
          onFilesChange={setSection('candidate_identity')}
        />

        <FileSection
          name="candidate_docs_income"
          title="Revenus"
          required={hasGuarantor === false}
          info={
            hasGuarantor === false
              ? "Justificatifs de revenus : 3 dernières fiches de paie ou dernier avis d'imposition ou attestation de retraite."
              : hasGuarantor === true
                ? "Compléments de revenus : tout document justifiant de revenus complémentaires tels que Justificatif de bourse, Justificatif de versement sur un compte bancaire par les parents…"
                : "Indiquez d'abord si vous avez un garant."
          }
          files={fileSections.candidate_income}
          onFilesChange={setSection('candidate_income')}
        />

        <FileSection
          name="candidate_docs_status"
          title="Statut"
          info="Justificatif de votre statut : Carte d'étudiant ou Justificatif de scolarité ou Convention de Stage/Apprentissage."
          files={fileSections.candidate_status}
          onFilesChange={setSection('candidate_status')}
        />
      </div>
      )}

      {/* ── Erreur serveur ────────────────────────────────────────────────── */}
      {result && !result.ok && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {result.error}
        </div>
      )}

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full py-3 rounded-xl bg-blue-primary text-white font-semibold text-sm hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Envoi en cours…' : 'Envoyer ma candidature'}
      </button>
    </form>
  )
}
