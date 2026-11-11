'use client'

import { useState, useTransition } from 'react'
import { updateTemporarilyUnavailableAction } from '@/app/admin/apartments/[number]/actions'

// Interrupteur « Indisponible temporairement » de la fiche appartement admin.
// Activé : l'appartement reste visible sur le site vitrine avec le statut « Indisponible »,
// et n'est plus proposé aux formulaires de visite et de candidature.
export default function TemporarilyUnavailableToggle({
  apartmentId,
  aptNumber,
  initialValue,
}: {
  apartmentId: string
  aptNumber: string
  initialValue: boolean
}) {
  const [enabled, setEnabled] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const prev = enabled
    const next = !enabled
    setEnabled(next)
    setError(null)
    startTransition(async () => {
      const r = await updateTemporarilyUnavailableAction(apartmentId, aptNumber, next)
      if (!r.ok) {
        setEnabled(prev)
        setError(r.error ?? 'Erreur lors de la mise à jour')
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Indisponible temporairement"
        onClick={handleToggle}
        disabled={pending}
        className="w-full min-h-11 flex items-center justify-between gap-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-sm text-gray-700">Indisponible temporairement</span>
        <span
          aria-hidden="true"
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-gray-900' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
      <p className="text-xs text-gray-400 mt-1">
        {enabled
          ? 'Affiché « Indisponible » sur le site : visites et candidatures bloquées.'
          : 'Visible comme vacant sur le site : visites et candidatures ouvertes.'}
      </p>
      {error && <p role="alert" className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
