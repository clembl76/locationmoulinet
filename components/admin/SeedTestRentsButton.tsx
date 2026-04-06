'use client'

import { useState, useTransition } from 'react'
import { seedTestRentsAction } from '@/app/admin/actions'

export default function SeedTestRentsButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setResult(null)
    setError(null)
    startTransition(async () => {
      try {
        const r = await seedTestRentsAction()
        setResult(r)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap border border-dashed border-amber-300 rounded-lg px-4 py-3 bg-amber-50">
      <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">TEST</span>
      <button
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-semibold text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
      >
        {pending ? 'Génération…' : 'Seed — jan/fév/mars 2026 (tous payés)'}
      </button>
      {result && <span className="text-xs text-amber-600">{result.total} loyers insérés/mis à jour.</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
