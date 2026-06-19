'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEdlSignedAction, updateDepositReturnedAction, archiveLeaseAction } from '@/app/admin/apartments/[number]/actions'

export default function ClosingLeaseActions({
  leaseId,
  aptNumber,
  initialEdlSigned,
  initialDepositReturned,
}: {
  leaseId: string
  aptNumber: string
  initialEdlSigned: boolean
  initialDepositReturned: boolean
}) {
  const [edlSigned, setEdlSigned] = useState(initialEdlSigned)
  const [depositReturned, setDepositReturned] = useState(initialDepositReturned)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleEdlChange(v: boolean) {
    const prev = edlSigned
    setEdlSigned(v)
    startTransition(async () => {
      const r = await updateEdlSignedAction(leaseId, aptNumber, v)
      if (!r.ok) setEdlSigned(prev)
    })
  }

  function handleDepositChange(v: boolean) {
    const prev = depositReturned
    setDepositReturned(v)
    startTransition(async () => {
      const r = await updateDepositReturnedAction(leaseId, aptNumber, v)
      if (!r.ok) setDepositReturned(prev)
    })
  }

  function handleArchive() {
    if (!window.confirm('Archiver ce bail ? Cette action est irréversible.')) return
    setArchiveError(null)
    startTransition(async () => {
      const r = await archiveLeaseAction(leaseId, aptNumber)
      if (!r.ok) {
        setArchiveError(r.error ?? 'Erreur')
        return
      }
      router.push('/admin/apartments')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edl-signed"
          checked={edlSigned}
          onChange={e => handleEdlChange(e.target.checked)}
          className="accent-blue-primary w-4 h-4 cursor-pointer"
        />
        <label htmlFor="edl-signed" className="text-sm text-gray-700 cursor-pointer select-none">
          EDL signé
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="deposit-returned"
          checked={depositReturned}
          onChange={e => handleDepositChange(e.target.checked)}
          className="accent-blue-primary w-4 h-4 cursor-pointer"
        />
        <label htmlFor="deposit-returned" className="text-sm text-gray-700 cursor-pointer select-none">
          Caution restituée
        </label>
      </div>
      <button
        onClick={handleArchive}
        disabled={!edlSigned || !depositReturned}
        className="w-full text-sm bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Archiver
      </button>
      {archiveError && <p className="text-xs text-red-500">{archiveError}</p>}
    </div>
  )
}
