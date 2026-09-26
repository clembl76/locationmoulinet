'use client'

import { useState, useTransition, useRef } from 'react'
import { addCandidateDocumentAction, type DocumentOwner } from './actions'

export default function AddDocumentForm({
  applicationId,
  aptNumber,
  candidateLastName,
  hasGuarantor,
}: {
  applicationId: string
  aptNumber: string
  candidateLastName: string
  hasGuarantor: boolean
}) {
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState<DocumentOwner>('candidate')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function reset() {
    setOwner('candidate')
    setFileName('')
    setError(null)
    formRef.current?.reset()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    if (!(formData.get('file') as File)?.size) {
      setError('Merci de sélectionner un fichier.')
      return
    }
    formData.set('applicationId', applicationId)
    formData.set('aptNumber', aptNumber)
    formData.set('candidateLastName', candidateLastName)

    startTransition(async () => {
      const r = await addCandidateDocumentAction(formData)
      if (r.ok) {
        reset()
        setOpen(false)
      } else {
        setError(r.error ?? 'Erreur')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-teal hover:underline font-medium"
      >
        + Ajouter un document
      </button>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="owner"
            value="candidate"
            checked={owner === 'candidate'}
            onChange={() => setOwner('candidate')}
          />
          Candidat
        </label>
        {hasGuarantor && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="owner"
              value="guarantor"
              checked={owner === 'guarantor'}
              onChange={() => setOwner('guarantor')}
            />
            Garant
          </label>
        )}
      </div>

      <input
        type="file"
        name="file"
        onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
        className="text-sm w-full file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-white file:text-xs file:font-medium file:text-gray-700 file:cursor-pointer"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !fileName}
          className="text-sm font-semibold bg-teal text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Envoi en cours…' : 'Ajouter'}
        </button>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false) }}
          disabled={pending}
          className="text-sm text-gray-400 hover:text-gray-600 px-2"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
