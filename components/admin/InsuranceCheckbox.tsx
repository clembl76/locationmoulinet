'use client'

import { useState, useTransition } from 'react'
import { updateInsuranceAttestationAction } from '@/app/admin/apartments/[number]/actions'

export default function InsuranceCheckbox({
  leaseId,
  aptNumber,
  initialValue,
}: {
  leaseId: string
  aptNumber: string
  initialValue: boolean
}) {
  const [checked, setChecked] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleChange(v: boolean) {
    const prev = checked
    setChecked(v)
    setError(null)
    startTransition(async () => {
      const r = await updateInsuranceAttestationAction(leaseId, aptNumber, v)
      if (!r.ok) {
        setChecked(prev)
        setError(r.error ?? 'Erreur')
      }
    })
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <input
        type="checkbox"
        id="insurance-attestation"
        checked={checked}
        onChange={e => handleChange(e.target.checked)}
        className="accent-blue-primary w-4 h-4 cursor-pointer"
      />
      <label htmlFor="insurance-attestation" className="text-sm text-gray-700 cursor-pointer select-none">
        Attestation d&apos;assurance fournie
      </label>
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </div>
  )
}
