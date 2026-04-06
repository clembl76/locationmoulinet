'use client'

import { useState, useTransition } from 'react'
import { savePreavisAction } from '@/app/admin/apartments/[number]/actions'

export default function PreavisButton({
  leaseId,
  aptNumber,
  currentMoveOut,
}: {
  leaseId: string
  aptNumber: string
  currentMoveOut: string | null
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(currentMoveOut ?? '')
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    startTransition(async () => {
      const r = await savePreavisAction(leaseId, aptNumber, date)
      setResult(r)
      if (r.ok) setOpen(false)
    })
  }

  if (result?.ok) {
    return (
      <div className="w-full text-sm px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700">
        ✓ Préavis enregistré — départ le {new Date(date).toLocaleDateString('fr-FR')}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Saisir un préavis de départ
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">Date de sortie prévue</p>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary"
      />
      {result && !result.ok && (
        <p className="text-xs text-red-500">{result.error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !date}
          className="flex-1 text-sm font-semibold bg-blue-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50"
        >
          {pending ? 'Enregistrement…' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
