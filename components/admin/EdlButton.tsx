'use client'

import { useState, useTransition } from 'react'
import { createEdlReportAction } from '@/app/admin/apartments/[number]/actions'

export default function EdlButton({
  leaseId,
  aptNumber,
  moveInDate,
}: {
  leaseId: string
  aptNumber: string
  moveInDate: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const defaultDate = moveInDate ?? new Date().toISOString().slice(0, 10)
  const [entryDate, setEntryDate] = useState(defaultDate)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      try {
        await createEdlReportAction(leaseId, aptNumber, entryDate)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">Date d&apos;entrée</label>
        <input
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        />
      </div>
      <button
        onClick={handleClick}
        disabled={pending}
        className="w-full text-left text-sm font-semibold bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Création…' : "Créer le document d'EDL d'entrée"}
      </button>
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}
    </div>
  )
}
