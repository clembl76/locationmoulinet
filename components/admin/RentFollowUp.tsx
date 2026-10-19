'use client'

import { useState, useTransition } from 'react'
import { setRentWrittenOffAction, updateRentNotesAction } from '@/app/admin/apartments/[number]/actions'

// Suivi d'un loyer sur la fiche appartement : commentaire libre et, pour un loyer impayé,
// passage en irrécouvrable (on ne recevra jamais l'argent — clôt l'action « loyer à payer »).
export default function RentFollowUp({
  rentId,
  aptNumber,
  initialNotes,
  initialWrittenOffAt,
  unpaid,
}: {
  rentId: string
  aptNumber: string
  initialNotes: string | null
  initialWrittenOffAt: string | null
  unpaid: boolean
}) {
  const [writtenOffAt, setWrittenOffAt] = useState(initialWrittenOffAt)
  const [confirming, setConfirming] = useState(false)
  const [writeOffError, setWriteOffError] = useState<string | null>(null)
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saved'>('idle')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function setWrittenOff(value: boolean) {
    setWriteOffError(null)
    setConfirming(false)
    startTransition(async () => {
      const r = await setRentWrittenOffAction(rentId, aptNumber, value)
      if (!r.ok) {
        setWriteOffError(r.error ?? 'Erreur')
        return
      }
      setWrittenOffAt(r.writtenOffAt ?? null)
    })
  }

  function saveNotes() {
    setNotesError(null)
    setNotesStatus('idle')
    startTransition(async () => {
      const r = await updateRentNotesAction(rentId, aptNumber, notes)
      if (!r.ok) {
        setNotesError(r.error ?? 'Erreur')
        return
      }
      setSavedNotes(notes.trim())
      setNotes(notes.trim())
      setNotesStatus('saved')
    })
  }

  const notesId = `rent-notes-${rentId}`
  const notesChanged = notes.trim() !== savedNotes

  return (
    <div className="space-y-3">
      {unpaid && writtenOffAt && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-sm px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
          <span>
            Irrécouvrable depuis le {new Date(writtenOffAt + 'T12:00:00').toLocaleDateString('fr-FR')}
          </span>
          <button
            type="button"
            onClick={() => setWrittenOff(false)}
            disabled={pending}
            className="text-xs underline text-gray-500 hover:text-gray-800 disabled:opacity-50 min-h-[44px] md:min-h-0"
          >
            Annuler
          </button>
        </div>
      )}

      {unpaid && !writtenOffAt && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
        >
          Passer en irrécouvrable
        </button>
      )}

      {unpaid && !writtenOffAt && confirming && (
        <div className="text-sm px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 space-y-2">
          <p>Ce loyer ne sera jamais encaissé et l’action « loyer à payer » sera clôturée.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWrittenOff(true)}
              disabled={pending}
              className="bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark disabled:opacity-50 min-h-[44px]"
            >
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 min-h-[44px]"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {writeOffError && <p className="text-xs text-red-500 px-1">{writeOffError}</p>}

      <div className="space-y-1">
        <label htmlFor={notesId} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Commentaire
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesStatus('idle') }}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-primary"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveNotes}
            disabled={pending || !notesChanged}
            className="bg-blue-primary text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-dark disabled:opacity-40 min-h-[44px]"
          >
            Enregistrer
          </button>
          {notesStatus === 'saved' && <span className="text-xs text-green-600">✓ Enregistré</span>}
          {notesError && <span className="text-xs text-red-500">{notesError}</span>}
        </div>
      </div>
    </div>
  )
}
