'use client'

import { useState, useTransition } from 'react'
import { updateDocusignUrlsAction } from '@/app/admin/apartments/[number]/actions'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary'

const DOCUSIGN_BASE = 'https://apps.docusign.com/send/documents/details/'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Si l'utilisateur colle juste un UUID DocuSign, on construit l'URL complète. */
function normalizeDocusignUrl(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (UUID_RE.test(v)) return DOCUSIGN_BASE + v
  if (!v.startsWith('http://') && !v.startsWith('https://')) return 'https://' + v
  return v
}

export default function DocusignUrls({
  leaseId,
  aptNumber,
  initialLeaseUrl,
  initialEdlUrl,
}: {
  leaseId: string
  aptNumber: string
  initialLeaseUrl: string | null
  initialEdlUrl: string | null
}) {
  const [leaseUrl, setLeaseUrl] = useState(initialLeaseUrl ?? '')
  const [edlUrl, setEdlUrl]     = useState(initialEdlUrl ?? '')
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [, startTransition]     = useTransition()

  function handleSave() {
    setError(null)
    const normalizedLease = normalizeDocusignUrl(leaseUrl)
    const normalizedEdl   = normalizeDocusignUrl(edlUrl)
    startTransition(async () => {
      const r = await updateDocusignUrlsAction(
        leaseId,
        aptNumber,
        normalizedLease || null,
        normalizedEdl || null,
      )
      if (r.ok) {
        if (normalizedLease) setLeaseUrl(normalizedLease)
        if (normalizedEdl)   setEdlUrl(normalizedEdl)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setError(r.error ?? 'Erreur')
      }
    })
  }

  const leaseHref = normalizeDocusignUrl(leaseUrl)
  const edlHref   = normalizeDocusignUrl(edlUrl)

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs text-gray-500">Lien Bail (Docusign)</label>
        <input
          value={leaseUrl}
          onChange={e => setLeaseUrl(e.target.value)}
          placeholder="https://apps.docusign.com/send/documents/details/… ou UUID"
          className={inputCls}
        />
        {leaseHref && (
          <a href={leaseHref} target="_blank" rel="noopener noreferrer"
            className="block text-xs text-blue-primary hover:text-blue-dark underline underline-offset-2 truncate">
            Bail signé sur Docusign →
          </a>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs text-gray-500">Lien EDL d'entrée (Docusign)</label>
        <input
          value={edlUrl}
          onChange={e => setEdlUrl(e.target.value)}
          placeholder="https://apps.docusign.com/send/documents/details/… ou UUID"
          className={inputCls}
        />
        {edlHref && (
          <a href={edlHref} target="_blank" rel="noopener noreferrer"
            className="block text-xs text-blue-primary hover:text-blue-dark underline underline-offset-2 truncate">
            EDL Entrée sur Docusign →
          </a>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="text-sm bg-blue-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-dark transition-colors"
        >
          Enregistrer
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Sauvegardé</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  )
}
