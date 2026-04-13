'use client'

import { useState, useTransition } from 'react'
import { updateApplicationStatusAction, signLeaseAction } from './actions'

export default function CandidateActions({
  applicationId,
  currentStatus,
  visitorId,
  aptNumber,
  desiredSigningDate,
  rentCC,
  candidate,
  guarantor,
}: {
  applicationId: string
  currentStatus: string
  visitorId: string | null
  aptNumber: string
  desiredSigningDate: string | null
  rentCC: number
  candidate: {
    title: string | null
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    birthDate: string | null
    birthPlace: string | null
    address: string | null
    familyStatus: string | null
  }
  guarantor: {
    title: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    birthDate: string | null
    birthPlace: string | null
    address: string | null
  } | null
}) {
  const [incomeChecked, setIncomeChecked] = useState(false)
  const [pending, startTransition] = useTransition()
  const [signError, setSignError] = useState<string | null>(null)
  const [signDone, setSignDone] = useState(false)

  const isTerminal = ['accepted', 'rejected', 'withdrawn', 'signed'].includes(currentStatus)

  function handleStatus(status: 'accepted' | 'rejected' | 'withdrawn') {
    startTransition(() =>
      updateApplicationStatusAction(applicationId, status, visitorId)
    )
  }

  function handleSign() {
    setSignError(null)
    startTransition(async () => {
      const result = await signLeaseAction({
        applicationId,
        candidateId: '',          // non utilisé côté action, on passe via applicationId
        aptNumber,
        visitorId,
        desiredSigningDate,
        candidateTitle: candidate.title,
        candidateFirstName: candidate.firstName,
        candidateLastName: candidate.lastName,
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone,
        candidateBirthDate: candidate.birthDate,
        candidateBirthPlace: candidate.birthPlace,
        candidateAddress: candidate.address,
        candidateFamilyStatus: candidate.familyStatus,
        guarantorTitle: guarantor?.title ?? null,
        guarantorFirstName: guarantor?.firstName ?? null,
        guarantorLastName: guarantor?.lastName ?? null,
        guarantorEmail: guarantor?.email ?? null,
        guarantorPhone: guarantor?.phone ?? null,
        guarantorBirthDate: guarantor?.birthDate ?? null,
        guarantorBirthPlace: guarantor?.birthPlace ?? null,
        guarantorAddress: guarantor?.address ?? null,
      })
      if (result.ok) {
        setSignDone(true)
      } else {
        setSignError(result.error)
      }
    })
  }

  // ── Statut "signed" (bail signé) ──────────────────────────────────────────
  if (currentStatus === 'signed' || signDone) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
          <span className="text-green-600 font-bold">✓</span>
          <span className="text-sm font-medium text-green-800">Bail signé — locataire créé</span>
        </div>
        <a
          href={`/admin/apartments/${aptNumber}`}
          className="block text-center text-xs text-blue-primary hover:underline"
        >
          Voir la fiche appartement →
        </a>
      </div>
    )
  }

  // ── Statut "accepted" — attente signature ────────────────────────────────
  if (currentStatus === 'accepted') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
          <span className="text-green-600 font-bold">✓</span>
          <span className="text-sm font-medium text-green-800">Candidat retenu</span>
        </div>
        <button
          onClick={handleSign}
          disabled={pending}
          className="w-full text-sm font-semibold py-2.5 rounded-xl border transition-colors
            bg-blue-primary text-white hover:bg-blue-dark
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Création en cours…' : 'Bail signé'}
        </button>
        {signError && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{signError}</p>
        )}
        <button
          onClick={() => handleStatus('withdrawn')}
          disabled={pending}
          className="w-full text-sm font-medium py-2 rounded-xl border border-gray-200 text-gray-500
            hover:border-gray-300 hover:bg-gray-50 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Plus intéressé
        </button>
      </div>
    )
  }

  // ── Statut "rejected" ─────────────────────────────────────────────────────
  if (currentStatus === 'rejected') {
    return (
      <div className="p-3 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm font-medium text-red-800">Candidat rejeté</p>
        <p className="text-xs text-red-500 mt-0.5">Les actions ne sont plus disponibles.</p>
      </div>
    )
  }

  // ── Statut "withdrawn" ────────────────────────────────────────────────────
  if (currentStatus === 'withdrawn') {
    return (
      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
        <p className="text-sm font-medium text-gray-700">Plus intéressé</p>
        <p className="text-xs text-gray-400 mt-0.5">Les actions ne sont plus disponibles.</p>
      </div>
    )
  }

  // ── Statut "pending" — formulaire principal ───────────────────────────────
  const minIncome = rentCC * 3
  return (
    <div className="space-y-4">
      {/* Revenus minimum attendus */}
      {rentCC > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          Revenus requis :{' '}
          <span className="font-semibold text-gray-700">
            {minIncome.toLocaleString('fr-FR')} €/mois
          </span>
        </div>
      )}

      {/* Revenus vérifiés */}
      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        incomeChecked ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <input
          type="checkbox"
          checked={incomeChecked}
          onChange={e => setIncomeChecked(e.target.checked)}
          className="w-4 h-4 accent-green-600"
        />
        <span className="text-sm font-medium text-gray-700">Revenus vérifiés</span>
      </label>

      {/* Rejeter + Choisir */}
      <div className="flex gap-2">
        <button
          onClick={() => handleStatus('rejected')}
          disabled={!incomeChecked || pending}
          className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors
            bg-red-600 text-white hover:bg-red-700
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? '…' : 'Rejeter'}
        </button>
        <button
          onClick={() => handleStatus('accepted')}
          disabled={!incomeChecked || pending}
          className="flex-1 text-sm font-semibold py-2.5 rounded-xl transition-colors
            bg-green-600 text-white hover:bg-green-700
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? '…' : 'Choisir'}
        </button>
      </div>

      {/* Plus intéressé */}
      <button
        onClick={() => handleStatus('withdrawn')}
        disabled={pending}
        className="w-full text-sm font-medium py-2 rounded-xl border border-gray-200 text-gray-500
          hover:border-gray-300 hover:bg-gray-50 transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Plus intéressé
      </button>
    </div>
  )
}
