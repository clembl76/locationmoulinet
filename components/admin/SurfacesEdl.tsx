'use client'

import { useState, useEffect, useMemo } from 'react'
import type { SurfaceRow } from '@/app/admin/inventory/surfacesActions'
import {
  getAllDistinctSurfaceNamesAction,
  getSurfacesForApartmentAction,
  addSurfaceAction,
  updateSurfaceAction,
  deleteSurfaceAction,
} from '@/app/admin/inventory/surfacesActions'
import { SURFACE_TYPES, SURFACE_MATERIALS, ROOM_TYPES } from '@/lib/surfacesConstants'

const CONDITIONS = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état']

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30'

// ─── Ligne surface existante ──────────────────────────────────────────────────

function SurfaceRow({
  row,
  onSave,
  onDelete,
}: {
  row: SurfaceRow
  onSave: (id: string, room: string | null, material: string | null, condition: string | null, notes: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [room, setRoom] = useState(row.room ?? '')
  const [material, setMaterial] = useState(row.material ?? '')
  const [condition, setCondition] = useState(row.condition ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(row.id, room || null, material || null, condition || null, notes || null)
    setSaving(false)
    setDirty(false)
  }

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50">
      <td className="px-4 py-2.5 font-medium text-sm text-gray-900">{row.surface}</td>
      <td className="px-3 py-2.5">
        <select value={room} onChange={e => { setRoom(e.target.value); setDirty(true) }}
          className={inputCls + ' w-full'}>
          <option value="">—</option>
          {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <select value={material} onChange={e => { setMaterial(e.target.value); setDirty(true) }}
          className={inputCls + ' w-full'}>
          <option value="">—</option>
          {SURFACE_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <select value={condition} onChange={e => { setCondition(e.target.value); setDirty(true) }}
          className={inputCls + ' w-full'}>
          <option value="">—</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <input type="text" value={notes} placeholder="Commentaire…"
          onChange={e => { setNotes(e.target.value); setDirty(true) }}
          className={inputCls + ' w-full'} />
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="text-xs font-semibold bg-blue-primary text-white px-2.5 py-1 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 mr-2">
            {saving ? '…' : 'Enregistrer'}
          </button>
        )}
        <button onClick={() => onDelete(row.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors" title="Supprimer">
          ✕
        </button>
      </td>
    </tr>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SurfacesEdl({ apartmentId }: { apartmentId: string }) {
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // Catalogue dynamique chargé depuis la DB (noms distincts de la table surfaces)
  const [dbSurfaceNames, setDbSurfaceNames] = useState<string[]>([])

  // Formulaire ajout
  const [newSurface, setNewSurface] = useState<string>(SURFACE_TYPES[0])
  const [newRoom, setNewRoom] = useState('')
  const [newMaterial, setNewMaterial] = useState('')
  const [newCondition, setNewCondition] = useState('Bon état')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Création libre hors catalogue
  const [showCreate, setShowCreate] = useState(false)
  const [customName, setCustomName] = useState('')

  // Fusion SURFACE_TYPES + noms DB, dédupliqués et triés (catalogue complet)
  const allSurfaceTypes = useMemo(() => {
    const merged = new Set([...SURFACE_TYPES, ...dbSurfaceNames])
    return Array.from(merged).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [dbSurfaceNames])

  // Chargement initial : surfaces de l'appartement + noms distincts du catalogue
  useEffect(() => {
    getAllDistinctSurfaceNamesAction().then(setDbSurfaceNames).catch(() => {})
  }, [])

  useEffect(() => {
    if (!apartmentId) return
    setLoading(true)
    getSurfacesForApartmentAction(apartmentId).then(rows => {
      setSurfaces(rows)
      setLoading(false)
    })
  }, [apartmentId])

  async function handleSave(id: string, room: string | null, material: string | null, condition: string | null, notes: string | null) {
    await updateSurfaceAction(id, room, material, condition, notes)
    setSurfaces(prev => prev.map(r => r.id === id ? { ...r, room, material, condition, notes } : r))
  }

  async function handleDelete(id: string) {
    await deleteSurfaceAction(id)
    setSurfaces(prev => prev.filter(r => r.id !== id))
  }

  async function handleAdd() {
    setAddError('')
    const surfaceName = showCreate ? customName.trim() : newSurface
    if (!surfaceName) { setAddError('Le nom de la surface est requis.'); return }
    setAdding(true)
    const result = await addSurfaceAction(
      apartmentId, surfaceName, newRoom || null, newMaterial || null, newCondition || null, newNotes || null,
    )
    setAdding(false)
    if (!result.ok) { setAddError(result.error ?? 'Erreur'); return }

    // Mise à jour immédiate du catalogue local si nom personnalisé
    if (showCreate) {
      setDbSurfaceNames(prev => prev.includes(surfaceName) ? prev : [...prev, surfaceName])
    }

    const rows = await getSurfacesForApartmentAction(apartmentId)
    setSurfaces(rows)
    setShowAdd(false)
    setShowCreate(false)
    setNewSurface(SURFACE_TYPES[0])
    setCustomName('')
    setNewRoom('')
    setNewMaterial('')
    setNewCondition('Bon état')
    setNewNotes('')
  }

  function handleToggleAdd() {
    setShowAdd(v => !v)
    setShowCreate(false)
    setCustomName('')
    setAddError('')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${open ? 'border-b border-gray-100' : ''}`}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-primary transition-colors"
        >
          <span className="text-xs text-gray-400">{open ? '▼' : '▶'}</span>
          État des lieux — Surfaces & équipements
          {surfaces.length > 0 && (
            <span className="text-sm font-normal text-gray-400">{surfaces.length}</span>
          )}
        </button>
        {open && (
          <button onClick={handleToggleAdd}
            className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors">
            + Ajouter
          </button>
        )}
      </div>

      {open && (loading ? (
        <p className="text-sm text-gray-400 p-6">Chargement…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 780 }}>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Surface / Équipement</th>
                <th className="text-left px-3 py-3">Pièce</th>
                <th className="text-left px-3 py-3">Matière</th>
                <th className="text-left px-3 py-3">État</th>
                <th className="text-left px-3 py-3">Commentaire</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {/* Formulaire ajout */}
              {showAdd && (
                <tr className="bg-blue-50/30 border-t border-blue-100">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Surface / Équipement *</label>
                        {showCreate ? (
                          <input
                            type="text"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder="Nom de la surface…"
                            className={inputCls + ' w-full'}
                            data-testid="custom-surface-input"
                          />
                        ) : (
                          <select value={newSurface} onChange={e => setNewSurface(e.target.value)}
                            className={inputCls + ' w-full'}>
                            {allSurfaceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => { setShowCreate(v => !v); setCustomName('') }}
                          className="mt-1.5 text-xs text-blue-primary hover:underline"
                        >
                          {showCreate ? '▲ Annuler la création' : '+ Créer un nouvel item dans la bibliothèque'}
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Pièce</label>
                        <select value={newRoom} onChange={e => setNewRoom(e.target.value)}
                          className={inputCls + ' w-full'}>
                          <option value="">—</option>
                          {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Matière</label>
                        <select value={newMaterial} onChange={e => setNewMaterial(e.target.value)}
                          className={inputCls + ' w-full'}>
                          <option value="">—</option>
                          {SURFACE_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">État</label>
                        <select value={newCondition} onChange={e => setNewCondition(e.target.value)}
                          className={inputCls + ' w-full'}>
                          <option value="">—</option>
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Commentaire</label>
                        <input type="text" value={newNotes} placeholder="Commentaire libre…"
                          onChange={e => setNewNotes(e.target.value)} className={inputCls + ' w-full'} />
                      </div>
                    </div>
                    {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleAdd} disabled={adding}
                        className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50">
                        {adding ? 'Ajout…' : '+ Ajouter'}
                      </button>
                      <button onClick={handleToggleAdd}
                        className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">
                        Annuler
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {surfaces.length === 0 && !showAdd ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                    Aucune surface enregistrée. Cliquez sur "+ Ajouter".
                  </td>
                </tr>
              ) : (
                surfaces
                  .sort((a, b) => a.surface.localeCompare(b.surface, 'fr'))
                  .map(row => (
                    <SurfaceRow key={row.id} row={row} onSave={handleSave} onDelete={handleDelete} />
                  ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
