'use client'

import { useState, useTransition } from 'react'
import { generateQuittanceCautionAction, type QuittanceActionResult } from '@/app/admin/apartments/[number]/actions'

export default function QuittanceCautionButton({
  leaseId,
  aptNumber,
  hasCautionTransaction,
}: {
  leaseId: string
  aptNumber: string
  hasCautionTransaction: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<QuittanceActionResult | null>(null)

  function handleClick() {
    if (!hasCautionTransaction) {
      const ok = window.confirm(
        'Aucune transaction de type "caution" trouvée pour cet appartement.\n\n' +
        'Vérifiez la page Paiements avant de continuer.\n\n' +
        'Voulez-vous quand même générer la quittance de caution ?'
      )
      if (!ok) return
    }
    setResult(null)
    startTransition(async () => {
      const r = await generateQuittanceCautionAction(leaseId, aptNumber)
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
        {pending ? 'Génération en cours…' : 'Quittance de caution'}
      </button>
      {!hasCautionTransaction && !result && (
        <p className="text-xs text-amber-600 px-1">
          Aucune transaction caution trouvée —{' '}
          <a href="/admin/payments" className="underline hover:text-amber-800">
            vérifier les paiements
          </a>
        </p>
      )}
      {result && !result.ok && (
        <p className="text-xs text-red-500 px-1">{result.error}</p>
      )}
    </div>
  )
}
