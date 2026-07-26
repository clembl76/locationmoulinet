'use client'

import { useState, useTransition } from 'react'
import { updateMoveInDateConfirmedAction } from '@/app/admin/apartments/[number]/actions'

export default function MoveInDateConfirmedCheckbox({
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
      const r = await updateMoveInDateConfirmedAction(leaseId, aptNumber, v)
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
        id="move-in-date-confirmed"
        checked={checked}
        onChange={e => handleChange(e.target.checked)}
        className="accent-blue-primary w-4 h-4 cursor-pointer"
      />
      <label htmlFor="move-in-date-confirmed" className="text-sm text-gray-700 cursor-pointer select-none">
        Date d&apos;emménagement confirmée
      </label>
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </div>
  )
}
