'use client'

import { useState, useTransition } from 'react'
import { markReceivedAndGenerateQuittance, type QuittanceActionResult } from '@/app/admin/apartments/[number]/actions'

export default function QuittanceButton({
  rentId,
  leaseId,
  aptNumber,
  year,
  month,
}: {
  rentId: string
  leaseId: string
  aptNumber: string
  year: number
  month: number
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
        className="w-full text-left text-sm font-semibold bg-gray-900 text-white px-3 py-2 rounded-full hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Génération en cours…' : 'Encaisser et quittance'}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-red-500 px-1">{result.error}</p>
      )}
    </div>
  )
}
