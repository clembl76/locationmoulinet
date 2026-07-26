'use client'

import { useState, useTransition } from 'react'
import { updateListingPublishedAction } from '@/app/admin/apartments/[number]/actions'

export default function ListingPublishedCheckbox({
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
      const r = await updateListingPublishedAction(leaseId, aptNumber, v)
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
        id="listing-published"
        checked={checked}
        onChange={e => handleChange(e.target.checked)}
        className="accent-blue-primary w-4 h-4 cursor-pointer"
      />
      <label htmlFor="listing-published" className="text-sm text-gray-700 cursor-pointer select-none">
        Annonce de relocation publiée
      </label>
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </div>
  )
}
