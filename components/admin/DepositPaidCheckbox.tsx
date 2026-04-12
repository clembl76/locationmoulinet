'use client'

import { useState, useTransition } from 'react'
import { updateDepositPaidAction, generateQuittanceCautionAction, type QuittanceActionResult } from '@/app/admin/apartments/[number]/actions'

export default function DepositPaidCheckbox({
  leaseId,
  aptNumber,
  depositAmount,
  initialPaid,
}: {
  leaseId: string
  aptNumber: string
  depositAmount: number | null
  initialPaid: boolean
}) {
  const [paid, setPaid] = useState(initialPaid)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [quittanceResult, setQuittanceResult] = useState<QuittanceActionResult | null>(null)
  const [, startTransition] = useTransition()

  function handleChange(v: boolean) {
    const prev = paid
    setPaid(v)
    setCheckError(null)
    startTransition(async () => {
      const r = await updateDepositPaidAction(leaseId, aptNumber, v)
      if (!r.ok) {
        setPaid(prev)
        setCheckError(r.error ?? 'Erreur')
        return
      }
      if (v) {
        const ok = window.confirm(
          'Caution marquée comme payée.\n\nVoulez-vous générer la quittance de caution maintenant ?'
        )
        if (ok) {
          setQuittanceResult(null)
          startTransition(async () => {
            const qr = await generateQuittanceCautionAction(leaseId, aptNumber)
            setQuittanceResult(qr)
          })
        }
      }
    })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="deposit-paid"
            checked={paid}
            onChange={e => handleChange(e.target.checked)}
            className="accent-blue-primary w-4 h-4 cursor-pointer"
          />
          <label htmlFor="deposit-paid" className="text-sm text-gray-700 cursor-pointer select-none">
            Caution payée ?
          </label>
        </div>
        {depositAmount != null && depositAmount > 0 && (
          <span className="text-xs text-gray-400">{depositAmount} €</span>
        )}
      </div>

      {checkError && <p className="text-xs text-red-500 px-1">{checkError}</p>}

      {quittanceResult?.ok && (
        <div className="text-sm px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700">
          ✓ Brouillon Gmail créé
          <p className="text-xs text-green-600 mt-0.5 font-mono truncate">{quittanceResult.filename}</p>
        </div>
      )}
      {quittanceResult && !quittanceResult.ok && (
        <p className="text-xs text-red-500 px-1">{quittanceResult.error}</p>
      )}
    </div>
  )
}
