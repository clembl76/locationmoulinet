'use client'

import { useState, useTransition } from 'react'
import { generateEdlEntreeEmailAction, type EdlEntreeEmailActionResult } from '@/app/admin/apartments/[number]/actions'

export default function EdlEntreeEmailButton({
  tenantEmail,
}: {
  tenantEmail: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<EdlEntreeEmailActionResult | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const r = await generateEdlEntreeEmailAction(tenantEmail)
      setResult(r)
    })
  }

  if (result?.ok) {
    return (
      <div className="w-full text-sm px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700">
        ✓ Brouillon Gmail créé
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={pending || !tenantEmail}
        title={!tenantEmail ? 'Email locataire introuvable' : undefined}
        className="w-full text-left text-sm font-semibold bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Génération en cours…' : 'Générer mail arrivée'}
      </button>
      {result && !result.ok && (
        <p className="text-xs text-red-500 px-1">{result.error}</p>
      )}
    </div>
  )
}
