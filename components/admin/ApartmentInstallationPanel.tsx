'use client'

import { useState, useEffect } from 'react'
import {
  getInstallationAction,
  updateInstallationAction,
} from '@/app/admin/inventory/summaryActions'
import type { EdlInstallation } from '@/lib/adminData'

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 w-full'

export default function ApartmentInstallationPanel({ apartmentId }: { apartmentId: string }) {
  const [open, setOpen] = useState(true)
  const [installation, setInstallation] = useState<EdlInstallation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draftHot, setDraftHot] = useState('')
  const [draftHeating, setDraftHeating] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getInstallationAction(apartmentId).then(inst => {
      setInstallation(inst)
      setLoading(false)
    })
  }, [apartmentId])

  function startEdit() {
    setDraftHot(installation?.hot_water ?? '')
    setDraftHeating(installation?.heating ?? '')
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    const hot = draftHot.trim() || null
    const heat = draftHeating.trim() || null
    await updateInstallationAction(apartmentId, hot, heat)
    setInstallation({ hot_water: hot, heating: heat })
    setSaving(false)
    setEditing(false)
  }

  const hasValues = installation && (installation.hot_water || installation.heating)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${open ? 'border-b border-gray-100' : ''}`}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-primary transition-colors"
        >
          <span className="text-xs text-gray-400">{open ? '▼' : '▶'}</span>
          Installations
        </button>
        {open && !loading && !editing && (
          <button
            onClick={startEdit}
            className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors"
          >
            {hasValues ? 'Modifier' : '+ Ajouter'}
          </button>
        )}
      </div>

      {open && (
        loading ? (
          <p className="text-sm text-gray-400 p-6">Chargement…</p>
        ) : editing ? (
          <div className="p-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Eau chaude</label>
                <input
                  type="text"
                  value={draftHot}
                  onChange={e => setDraftHot(e.target.value)}
                  placeholder="Ex. Électrique, Gaz…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Chauffage</label>
                <input
                  type="text"
                  value={draftHeating}
                  onChange={e => setDraftHeating(e.target.value)}
                  placeholder="Ex. Gaz, Électrique…"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {hasValues ? (
              <div className="space-y-1 text-sm text-gray-700">
                {installation.hot_water && (
                  <div>
                    <span className="text-gray-400">Eau chaude : </span>
                    {installation.hot_water}
                  </div>
                )}
                {installation.heating && (
                  <div>
                    <span className="text-gray-400">Chauffage : </span>
                    {installation.heating}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-300 italic">Non renseigné</p>
            )}
          </div>
        )
      )}
    </div>
  )
}
