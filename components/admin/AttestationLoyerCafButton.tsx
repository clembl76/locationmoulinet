'use client'

import { useState, useTransition } from 'react'
import { generateAttestationLoyerCafAction, type QuittanceActionResult } from '@/app/admin/apartments/[number]/actions'

export default function AttestationLoyerCafButton({
  leaseId,
  aptNumber,
  tenantIsUpToDate,
}: {
  leaseId: string
  aptNumber: string
  tenantIsUpToDate: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<QuittanceActionResult | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const r = await generateAttestationLoyerCafAction(leaseId, aptNumber, tenantIsUpToDate)
      setResult(r)
    })
  }

  if (result?.ok) {
    return (
      <div className="w-full text-sm px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700">
        ✓ Brouillon Gmail créé
        <p className="text-xs text-green-600 mt-0.5 font-mono truncate">{result.filename}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full text-left text-sm font-semibold bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Génération en cours…' : 'Attestation CAF'}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-red-500 px-1">{result.error}</p>
      )}
    </div>
  )
}
