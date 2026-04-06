'use client'

import { useState, useTransition } from 'react'
import { generateRentsAction } from '@/app/admin/actions'

export default function GenerateRentsButton({
  year,
  month,
  mois,
}: {
  year: number
  month: number
  mois: string
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setResult(null)
    setError(null)
    startTransition(async () => {
      try {
        const r = await generateRentsAction(year, month)
        setResult(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Génération…' : `Générer les loyers — ${mois}`}
      </button>

      {result && !error && (
        <span className="text-sm text-gray-500">
          {result.inserted === 0 && result.skipped > 0
            ? `Déjà générés (${result.skipped} baux).`
            : `${result.inserted} loyer${result.inserted > 1 ? 's' : ''} créé${result.inserted > 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} existant${result.skipped > 1 ? 's' : ''}` : ''}.`
          }
        </span>
      )}

      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  )
}
