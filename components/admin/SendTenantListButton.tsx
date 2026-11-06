'use client'

import { useState, useTransition } from 'react'
import { sendTenantListEmailAction } from '@/app/admin/apartments/actions'
import { buttonClass } from '@/lib/buttonStyles'

export default function SendTenantListButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const r = await sendTenantListEmailAction()
      setResult(r)
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={pending}
        className={buttonClass()}
      >
        {pending ? 'Envoi en cours…' : 'Envoyer la liste des locataires'}
      </button>
      {result?.ok && (
        <span className="text-sm text-green-600">Email envoyé.</span>
      )}
      {result && !result.ok && (
        <span className="text-sm text-red-500">{result.error}</span>
      )}
    </div>
  )
}
