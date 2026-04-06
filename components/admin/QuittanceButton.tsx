'use client'

import { useState, useTransition } from 'react'
import { markReceivedAndGenerateQuittance, type QuittanceActionResult } from '@/app/admin/apartments/[number]/actions'

export default function QuittanceButton({
  rentId,
  leaseId,
  aptNumber,
  year,
  month,
  mois,
}: {
  rentId: string
  leaseId: string
  aptNumber: string
  year: number
  month: number
  mois: string
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<QuittanceActionResult | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const r = await markReceivedAndGenerateQuittance(rentId, leaseId, aptNumber, year, month)
      setResult(r)
    })
  }

  if (result?.ok) {
    return (
      <div className="w-full text-sm px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700">
        ✓ Encaissé · Brouillon Gmail créé
        <p className="text-xs text-green-600 mt-0.5 font-mono truncate">{result.filename}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-blue-primary/40 text-blue-primary hover:bg-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Génération en cours…' : `Marquer encaissé et générer la quittance ${mois}`}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-red-500 px-1">{result.error}</p>
      )}
    </div>
  )
}
