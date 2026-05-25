'use client'

import React, { useState, useEffect, useTransition } from 'react'
import type { ApartmentWithLease } from '@/lib/adminData'
import type { ItemRow, InventoryRow } from '@/app/admin/inventory/actions'
import {
  getInventoryForApartmentAction,
  getAllItemsAction,
  addInventoryItemAction,
  updateInventoryItemAction,
  deleteInventoryItemAction,
  createCatalogItemAction,
} from '@/app/admin/inventory/actions'
import SurfacesEdl from '@/components/admin/SurfacesEdl'

const ROOMS: string[] = [
  'Cave', 'Chambre', 'Coin chambre', 'Coin cuisine', 'Coin nuit', 'Coin salon',
  'Coin salon / salle à manger', 'Couloir', 'Cuisine', 'Divers', 'Entrée',
  'Parties communes', 'Partout', 'Salle à manger', 'Salle de bains',
  'Salle de douche', 'Salon', 'Séjour/Cuisine', 'Terrasse', 'Toilettes',
  'Autres', 'Autres frais', 'Bureau', 'Indifférent',
]

const CONDITIONS: string[] = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état']

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30'

// ─── Ligne item existant ───────────────────────────────────────────────────────

function InventoryItemRow({
  row,
  onSave,
  onDelete,
}: {
  row: InventoryRow
  onSave: (id: string, qty: number, room: string, condition: string | null, notes: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [qty, setQty] = useState(row.quantity)
  const [room, setRoom] = useState(row.room)
  const [condition, setCondition] = useState(row.condition ?? '')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function markDirty() { setDirty(true) }

  async function handleSave() {
    setSaving(true)
    await onSave(row.id, qty, room, condition || null, notes || null)
    setSaving(false)
    setDirty(false)
  }

  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50/50">
      <td className="px-4 py-2.5">
        <p className="text-sm font-medium text-gray-900">{row.item_name}</p>
        <p className="text-xs text-gray-400">{row.item_category}</p>
      </td>
      <td className="px-3 py-2.5">
        <select
          value={room}
          onChange={e => { setRoom(e.target.value); markDirty() }}
          className={inputCls + ' w-full'}
        >
          {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 text-right">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={e => { setQty(Number(e.target.value)); markDirty() }}
          className={inputCls + ' w-16 text-right'}
        />
      </td>
      <td className="px-3 py-2.5">
        <select
          value={condition}
          onChange={e => { setCondition(e.target.value); markDirty() }}
          className={inputCls + ' w-full'}
        >
          <option value="">—</option>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <input
          type="text"
          value={notes}
          placeholder="Commentaire…"
          onChange={e => { setNotes(e.target.value); markDirty() }}
          className={inputCls + ' w-full'}
        />
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {row.item_unit_price != null && (
          <span className="text-xs text-gray-400 mr-3">{row.item_unit_price} €</span>
        )}
        {row.item_reference_url && (
          <a href={row.item_reference_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-primary hover:underline mr-3">réf →</a>
        )}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold bg-blue-primary text-white px-2.5 py-1 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50 mr-2"
          >
            {saving ? '…' : 'Enregistrer'}
          </button>
        )}
        <button
          onClick={() => onDelete(row.id)}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
          title="Supprimer"
        >
          ✕
        </button>
      </td>
    </tr>
  )
}

const CATEGORIES = ['Meuble ou objet', 'Appareil électrique', 'Consommable', 'Service']

// ─── Formulaire ajout item ────────────────────────────────────────────────────

function AddItemForm({
  items,
  onAdd,
  onCancel,
  onItemCreated,
}: {
  items: ItemRow[]
  onAdd: (itemId: string, room: string, qty: number, condition: string | null, notes: string | null) => Promise<void>
  onCancel: () => void
  onItemCreated: (item: ItemRow) => void
}) {
  const [search, setSearch] = useState('')
  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [room, setRoom] = useState('Indifférent')
  const [qty, setQty] = useState(1)
  const [condition, setCondition] = useState('Bon état')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Création à la volée
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Meuble ou objet')
  const [newRoom, setNewRoom] = useState('Indifférent')
  const [newPrice, setNewPrice] = useState('')
  const [newLabor, setNewLabor] = useState('')
  const [newRef, setNewRef] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const filtered = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : items
  const selected = items.find(i => i.id === itemId)

  useEffect(() => {
    if (selected) setRoom(selected.default_room)
  }, [itemId, selected])

  async function handleAdd() {
    if (!itemId) return
    setSaving(true)
    await onAdd(itemId, room, qty, condition || null, notes || null)
    setSaving(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreateError('')
    setCreating(true)
    const result = await createCatalogItemAction({
      name: newName.trim(),
      category: newCategory,
      default_room: newRoom,
      reference_url: newRef || undefined,
      unit_price: newPrice ? parseFloat(newPrice) : null,
      labor_cost: newLabor ? parseFloat(newLabor) : null,
    })
    setCreating(false)
    if (!result.ok) { setCreateError(result.error); return }
    onItemCreated(result.item)
    setItemId(result.item.id)
    setRoom(result.item.default_room)
    setSearch(result.item.name)
    setShowCreate(false)
    setNewName(''); setNewCategory('Meuble ou objet'); setNewRoom('Indifférent')
    setNewPrice(''); setNewLabor(''); setNewRef('')
  }

  return (
    <tr className="bg-blue-50/30 border-t border-blue-100">
      <td className="px-4 py-3" colSpan={6}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Item</label>
              <input
                type="text"
                placeholder="Rechercher un item…"
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  const first = items.find(i => i.name.toLowerCase().includes(e.target.value.toLowerCase()))
                  if (first) setItemId(first.id)
                }}
                className={inputCls + ' w-full mb-1.5'}
              />
              <select
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                className={inputCls + ' w-full'}
                size={Math.min(filtered.length, 6)}
              >
                {filtered.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreate(v => !v)}
                className="mt-1.5 text-xs text-blue-primary hover:underline"
              >
                {showCreate ? '▲ Annuler la création' : '+ Créer un nouvel item dans la bibliothèque'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Pièce</label>
              <select value={room} onChange={e => setRoom(e.target.value)} className={inputCls + ' w-full'}>
                {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Formulaire création à la volée */}
          {showCreate && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Nouvel item dans la bibliothèque</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Ex. Lampe de chevet" className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Catégorie *</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className={inputCls + ' w-full'}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pièce par défaut *</label>
                  <select value={newRoom} onChange={e => setNewRoom(e.target.value)} className={inputCls + ' w-full'}>
                    {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Référence URL</label>
                  <input value={newRef} onChange={e => setNewRef(e.target.value)}
                    placeholder="https://…" className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prix unitaire (€)</label>
                  <input type="number" min={0} step={0.01} value={newPrice}
                    onChange={e => setNewPrice(e.target.value)} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Main d'œuvre (€)</label>
                  <input type="number" min={0} step={0.01} value={newLabor}
                    onChange={e => setNewLabor(e.target.value)} className={inputCls + ' w-full'} />
                </div>
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {creating ? 'Création…' : 'Créer l\'item'}
              </button>
            </div>
          )}

          {selected && !showCreate && (
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">
              <span><strong>Catégorie :</strong> {selected.category}</span>
              <span><strong>Pièce par défaut :</strong> {selected.default_room}</span>
              {selected.unit_price != null && <span><strong>Prix unitaire :</strong> {selected.unit_price} €</span>}
              {selected.labor_cost != null && <span><strong>Main d'œuvre :</strong> {selected.labor_cost} €</span>}
              {selected.reference_url && (
                <a href={selected.reference_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-primary hover:underline">Référence →</a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Quantité</label>
              <input type="number" min={1} value={qty}
                onChange={e => setQty(Number(e.target.value))} className={inputCls + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">État</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className={inputCls + ' w-full'}>
                <option value="">—</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Commentaire</label>
            <input type="text" value={notes} placeholder="Commentaire libre…"
              onChange={e => setNotes(e.target.value)} className={inputCls + ' w-full'} />
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !itemId}
              className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors disabled:opacity-50">
              {saving ? 'Ajout…' : '+ Ajouter'}
            </button>
            <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">
              Annuler
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function InventoryManager({
  apartments,
}: {
  apartments: ApartmentWithLease[]
}) {
  const [aptId, setAptId] = useState('')
  const [selectedApt, setSelectedApt] = useState<ApartmentWithLease | null>(null)
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [allItems, setAllItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(true)
  const [filterRoom, setFilterRoom] = useState('')
  const [filterItem, setFilterItem] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [, startTransition] = useTransition()

  // Charger le catalogue d'items une fois
  useEffect(() => {
    getAllItemsAction().then(setAllItems)
  }, [])

  function selectApartment(id: string) {
    setAptId(id)
    setSelectedApt(apartments.find(a => a.apartment_id === id) ?? null)
    setShowAddForm(false)
    if (!id) { setInventory([]); return }
    setLoading(true)
    getInventoryForApartmentAction(id).then(rows => {
      setInventory(rows)
      setLoading(false)
    })
  }

  async function handleSave(id: string, qty: number, room: string, condition: string | null, notes: string | null) {
    await updateInventoryItemAction(id, qty, room, condition, notes)
    setInventory(prev => prev.map(r => r.id === id ? { ...r, quantity: qty, room, condition, notes } : r))
  }

  async function handleDelete(id: string) {
    await deleteInventoryItemAction(id)
    setInventory(prev => prev.filter(r => r.id !== id))
  }

  async function handleAdd(itemId: string, room: string, qty: number, condition: string | null, notes: string | null) {
    const result = await addInventoryItemAction(aptId, itemId, room, qty, condition, notes)
    if (result.ok) {
      setShowAddForm(false)
      setLoading(true)
      const rows = await getInventoryForApartmentAction(aptId)
      setInventory(rows)
      setLoading(false)
    }
  }

  // Filtrer puis grouper par pièce
  const filteredInventory = inventory.filter(row => {
    if (filterRoom && row.room !== filterRoom) return false
    if (filterItem && !row.item_name.toLowerCase().includes(filterItem.toLowerCase())) return false
    if (filterCategory && row.item_category !== filterCategory) return false
    return true
  })

  const byRoom = new Map<string, InventoryRow[]>()
  for (const row of filteredInventory) {
    if (!byRoom.has(row.room)) byRoom.set(row.room, [])
    byRoom.get(row.room)!.push(row)
  }
  const sortedRooms = Array.from(byRoom.keys()).sort()

  // Options dynamiques pour les filtres
  const availableRooms = Array.from(new Set(inventory.map(r => r.room))).sort()
  const availableCategories = Array.from(new Set(inventory.map(r => r.item_category))).sort()

  return (
    <div className="space-y-6">
      {/* Sélecteur appartement */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Appartement
        </label>
        <select
          value={aptId}
          onChange={e => selectApartment(e.target.value)}
          className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
        >
          <option value="">— Sélectionner un appartement —</option>
          {apartments.map(a => (
            <option key={a.apartment_id} value={a.apartment_id}>
              Apt {a.apartment_number} — {a.tenant_name}
            </option>
          ))}

        </select>
      </div>

      {/* Inventaire */}
      {aptId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`px-6 py-4 flex items-center justify-between ${inventoryOpen ? 'border-b border-gray-100' : ''}`}>
            <button
              onClick={() => setInventoryOpen(v => !v)}
              className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-primary transition-colors"
            >
              <span className="text-xs text-gray-400">{inventoryOpen ? '▼' : '▶'}</span>
              Inventaire
              {inventory.length > 0 && (
                <span className="text-sm font-normal text-gray-400">
                  {filteredInventory.length}{filteredInventory.length !== inventory.length ? `/${inventory.length}` : ''} item{inventory.length > 1 ? 's' : ''}
                </span>
              )}
            </button>
            {inventoryOpen && (
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="text-sm font-semibold bg-blue-primary text-white px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors"
              >
                + Ajouter un item
              </button>
            )}
          </div>

          {/* Barre de filtres */}
          {inventoryOpen && inventory.length > 0 && (
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 bg-gray-50/50">
              <input
                type="text"
                placeholder="Filtrer par nom d'item…"
                value={filterItem}
                onChange={e => setFilterItem(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 w-full sm:w-52"
              />
              <select
                value={filterRoom}
                onChange={e => setFilterRoom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
              >
                <option value="">Toutes les pièces</option>
                {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
              >
                <option value="">Toutes les catégories</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(filterItem || filterRoom || filterCategory) && (
                <button
                  onClick={() => { setFilterItem(''); setFilterRoom(''); setFilterCategory('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                >
                  ✕ Réinitialiser
                </button>
              )}
            </div>
          )}

          {inventoryOpen && (loading ? (
            <p className="text-sm text-gray-400 p-6">Chargement…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-left px-3 py-3">Pièce</th>
                    <th className="text-right px-3 py-3">Qté</th>
                    <th className="text-left px-3 py-3">État</th>
                    <th className="text-left px-3 py-3">Commentaire</th>
                    <th className="text-right px-3 py-3">Prix / Réf.</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {showAddForm && (
                    <AddItemForm
                      items={allItems}
                      onAdd={handleAdd}
                      onCancel={() => setShowAddForm(false)}
                      onItemCreated={item => setAllItems(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name, 'fr')))}
                    />
                  )}
                  {inventory.length === 0 && !showAddForm ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400 italic">
                        Aucun item dans l'inventaire. Cliquez sur "+ Ajouter un item".
                      </td>
                    </tr>
                  ) : (
                    sortedRooms.map(room => (
                      <React.Fragment key={`room-${room}`}>
                        <tr className="bg-gray-50/70">
                          <td colSpan={6} className="px-4 py-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{room}</span>
                          </td>
                        </tr>
                        {byRoom.get(room)!
                          .sort((a, b) => a.item_name.localeCompare(b.item_name, 'fr'))
                          .map(row => (
                            <InventoryItemRow
                              key={row.id}
                              row={row}
                              onSave={handleSave}
                              onDelete={handleDelete}
                            />
                          ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Section État des lieux */}
      {aptId && <SurfacesEdl apartmentId={aptId} />}
    </div>
  )
}
