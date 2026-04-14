'use client'

import { useState, useTransition } from 'react'
import { createBailAction } from './actions'

const TITLES = ['M.', 'Mme']
const FAMILY_STATUSES = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Pacsé(e)']
const RESIDENCY_TYPES = ['Principale', 'Secondaire']
const LEASE_TYPES = ['Meublé', 'Vide', 'Colocation']

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
      {children}
    </h2>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">
        {label}
        <span className="text-red-400 ml-0.5">*</span>
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary w-full'
const selectCls =
  'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary w-full bg-white'

export default function NouveauBailForm({ aptNumber }: { aptNumber: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hasGuarantor, setHasGuarantor] = useState(false)

  // Locataire
  const [tenantTitle, setTenantTitle] = useState('')
  const [tenantFirstName, setTenantFirstName] = useState('')
  const [tenantLastName, setTenantLastName] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [tenantPhone, setTenantPhone] = useState('')
  const [tenantBirthDate, setTenantBirthDate] = useState('')
  const [tenantBirthPlace, setTenantBirthPlace] = useState('')
  const [tenantFamilyStatus, setTenantFamilyStatus] = useState('')

  // Garant
  const [gTitle, setGTitle] = useState('')
  const [gFirstName, setGFirstName] = useState('')
  const [gLastName, setGLastName] = useState('')
  const [gEmail, setGEmail] = useState('')
  const [gPhone, setGPhone] = useState('')
  const [gBirthDate, setGBirthDate] = useState('')
  const [gBirthPlace, setGBirthPlace] = useState('')
  const [gAddress, setGAddress] = useState('')

  // Bail
  const [signingDate, setSigningDate] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [duration, setDuration] = useState('')
  const [rentHC, setRentHC] = useState('')
  const [charges, setCharges] = useState('')
  const [rentCC, setRentCC] = useState('')
  const [deposit, setDeposit] = useState('')
  const [residencyType, setResidencyType] = useState('')
  const [leaseType, setLeaseType] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createBailAction(
        aptNumber,
        {
          title: tenantTitle || null,
          first_name: tenantFirstName.trim(),
          last_name: tenantLastName.trim(),
          email: tenantEmail.trim() || null,
          phone: tenantPhone.trim() || null,
          birth_date: tenantBirthDate || null,
          birth_place: tenantBirthPlace.trim() || null,
          family_status: tenantFamilyStatus || null,
        },
        hasGuarantor
          ? {
              title: gTitle || null,
              first_name: gFirstName.trim(),
              last_name: gLastName.trim(),
              email: gEmail.trim() || null,
              phone: gPhone.trim() || null,
              birth_date: gBirthDate || null,
              birth_place: gBirthPlace.trim() || null,
              address: gAddress.trim() || null,
            }
          : null,
        {
          signing_date: signingDate || null,
          move_in_inspection_date: moveInDate || null,
          duration: duration.trim() || null,
          rent_excluding_charges: rentHC ? parseFloat(rentHC) : null,
          charges: charges ? parseFloat(charges) : null,
          rent_including_charges: rentCC ? parseFloat(rentCC) : null,
          deposit: deposit ? parseFloat(deposit) : null,
          residency_type: residencyType || null,
          lease_type: leaseType || null,
          notes: notes.trim() || null,
        },
      )
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Bail */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionTitle>Bail</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de signature">
            <input type="date" value={signingDate} onChange={e => setSigningDate(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Date d'entrée (EDL)">
            <input type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Durée">
            <input type="text" placeholder="ex: 1 an" value={duration} onChange={e => setDuration(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Type de résidence">
            <select value={residencyType} onChange={e => setResidencyType(e.target.value)} className={selectCls} required>
              <option value="">— Choisir —</option>
              {RESIDENCY_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Type de bail">
            <select value={leaseType} onChange={e => setLeaseType(e.target.value)} className={selectCls} required>
              <option value="">— Choisir —</option>
              {LEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Loyer hors charges (€)">
            <input type="number" step="0.01" min="0" placeholder="ex: 480" value={rentHC} onChange={e => setRentHC(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Charges (€)">
            <input type="number" step="0.01" min="0" placeholder="ex: 50" value={charges} onChange={e => setCharges(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Loyer charges comprises (€)">
            <input type="number" step="0.01" min="0" placeholder="ex: 530" value={rentCC} onChange={e => setRentCC(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Caution (€)">
            <input type="number" step="0.01" min="0" placeholder="ex: 480" value={deposit} onChange={e => setDeposit(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Notes">
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} required />
          </Field>
        </div>
      </div>

      {/* Locataire */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SectionTitle>Locataire</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Civilité">
            <select value={tenantTitle} onChange={e => setTenantTitle(e.target.value)} className={selectCls} required>
              <option value="">— Choisir —</option>
              {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Situation familiale">
            <select value={tenantFamilyStatus} onChange={e => setTenantFamilyStatus(e.target.value)} className={selectCls} required>
              <option value="">— Choisir —</option>
              {FAMILY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Prénom">
            <input type="text" value={tenantFirstName} onChange={e => setTenantFirstName(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Nom">
            <input type="text" value={tenantLastName} onChange={e => setTenantLastName(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Email">
            <input type="email" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Téléphone">
            <input type="tel" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Date de naissance">
            <input type="date" value={tenantBirthDate} onChange={e => setTenantBirthDate(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Lieu de naissance">
            <input type="text" value={tenantBirthPlace} onChange={e => setTenantBirthPlace(e.target.value)} className={inputCls} required />
          </Field>
        </div>
      </div>

      {/* Garant */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <SectionTitle>Garant</SectionTitle>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto -mt-4">
            <input
              type="checkbox"
              checked={hasGuarantor}
              onChange={e => setHasGuarantor(e.target.checked)}
              className="accent-blue-primary"
            />
            Ajouter un garant
          </label>
        </div>
        {hasGuarantor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Civilité">
              <select value={gTitle} onChange={e => setGTitle(e.target.value)} className={selectCls} required>
                <option value="">— Choisir —</option>
                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div />
            <Field label="Prénom">
              <input type="text" value={gFirstName} onChange={e => setGFirstName(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Nom">
              <input type="text" value={gLastName} onChange={e => setGLastName(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Email">
              <input type="email" value={gEmail} onChange={e => setGEmail(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Téléphone">
              <input type="tel" value={gPhone} onChange={e => setGPhone(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={gBirthDate} onChange={e => setGBirthDate(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Lieu de naissance">
              <input type="text" value={gBirthPlace} onChange={e => setGBirthPlace(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Adresse">
              <input type="text" value={gAddress} onChange={e => setGAddress(e.target.value)} className={`${inputCls} sm:col-span-2`} required />
            </Field>
          </div>
        )}
        {!hasGuarantor && (
          <p className="text-sm text-gray-400">Aucun garant pour ce bail.</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <a
          href={`/admin/apartments/${aptNumber}`}
          className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
        >
          Annuler
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-primary text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Enregistrement…' : 'Créer le bail'}
        </button>
      </div>
    </form>
  )
}
