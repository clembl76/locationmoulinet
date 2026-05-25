'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getApartmentKeysAction,
  getKeyTypesAction,
  addApartmentKeyAction,
  updateApartmentKeyQuantityAction,
  deleteApartmentKeyAction,
} from '@/app/admin/inventory/keysActions'
import type { EdlKey } from '@/lib/adminData'

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30'

function KeyQuantityInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [draft, setDraft] = useState(String(value))

  return (
    <input
      type="number"
      min={1}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const v = Math.max(1, Number(draft) || 1)
        setDraft(String(v))
        onSave(v)
      }}
      className="w-16 text-right text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-primary focus:outline-none py-0.5"
    />
  )
}

export default function ApartmentKeysPanel({ apartmentId }: { apartmentId: string }) {
  const [open, setOpen] = useState(true)
  const [keys, setKeys] = useState<EdlKey[]>([])
  const [keyTypes, setKeyTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getApartmentKeysAction(apartmentId),
      getKeyTypesAction(),
    ]).then(([k, kt]) => {
      setKeys(k)
      setKeyTypes(kt)
      if (kt.length > 0) setSelectedType(kt[0])
      setLoading(false)
    })
  }, [apartmentId])

  async function handleAdd() {
    if (!selectedType) return
    setAdding(true)
    setError('')
    const result = await addApartmentKeyAction(apartmentId, selectedType, quantity)
    setAdding(false)
    if (!result.ok) { setError(result.error); return }
    setKeys(prev => [...prev, result.key])
    setShowForm(false)
    setQuantity(1)
    if (keyTypes.length > 0) setSelectedType(keyTypes[0])
  }

  function handleUpdateQuantity(id: string, qty: number) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, quantity: qty } : k))
    startTransition(async () => { await updateApartmentKeyQuantityAction(id, qty) })
  }

  function handleDelete(id: string) {
    setKeys(prev => prev.filter(k => k.id !== id))
    startTransition(async () => { await deleteApartmentKeyAction(id) })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-6 py-4 flex items-center justify-between ${open ? 'border-b border-gray-100' : ''}`}>
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-primary transition-colors"
        >
          <span className="text-xs text-gray-400">{open ? '▼' : '▶'}</span>
          Clés
          {keys.length > 0 && (
            <span className="text-sm font-normal text-gray-400">
              {keys.length} clé{keys.length > 1 ? 's' : ''}
            </span>
          )}
        </button>
        {open && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors"
          >
            + Ajouter
          </button>
        )}
      </div>

      {open && (
        loading ? (
          <p className="text-sm text-gray-400 p-6">Chargement…</p>
        ) : (
          <div className="p-6 space-y-4">
            {showForm && (
              <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Type de clé</label>
                    <select
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value)}
                      className={inputCls + ' w-full'}
                    >
                      {keyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Quantité</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className={inputCls + ' w-full'}
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    disabled={adding || !selectedType}
                    className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50"
                  >
                    {adding ? 'Ajout…' : '+ Ajouter'}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setError('') }}
                    className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {keys.length === 0 && !showForm ? (
              <p className="text-sm text-gray-300 italic">Aucune clé</p>
            ) : keys.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="text-left pb-2">Type de clé</th>
                    <th className="text-right pb-2">Quantité</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {keys.map(k => (
                    <tr key={k.id}>
                      <td className="py-2 text-gray-700">{k.key_type}</td>
                      <td className="py-2 text-right">
                        <KeyQuantityInput
                          value={k.quantity}
                          onSave={v => handleUpdateQuantity(k.id, v)}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleDelete(k.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        )
      )}
    </div>
  )
}
