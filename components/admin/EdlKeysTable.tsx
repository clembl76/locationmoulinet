'use client'

import { useState, useTransition } from 'react'
import { updateKeyQuantityExitAction } from '@/app/admin/apartments/[number]/edl/[reportId]/actions'
import type { EdlKey } from '@/lib/adminData'

function QuantityInput({ keyId, value, onChange }: {
  keyId: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const [, startTransition] = useTransition()

  return (
    <input
      type="number"
      min={0}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim() !== '' ? Number(draft) : null
        onChange(v)
        startTransition(async () => { await updateKeyQuantityExitAction(keyId, v) })
      }}
      placeholder="—"
      className="w-16 text-center text-sm text-gray-700 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-primary focus:outline-none py-0.5 placeholder:text-gray-300"
    />
  )
}

export default function EdlKeysTable({ initialKeys }: { initialKeys: EdlKey[] }) {
  const [keys, setKeys] = useState(initialKeys)

  function update(id: string, patch: Partial<EdlKey>) {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k))
  }

  return (
    <table className="text-sm">
      <thead>
        <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <th className="text-left pr-16 pb-2">Type de clé</th>
          <th className="text-center pr-12 pb-2">Qté entrée</th>
          <th className="text-center pb-2">Qté sortie</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {keys.map(k => (
          <tr key={k.id}>
            <td className="pr-16 py-1.5 text-gray-700">{k.key_type}</td>
            <td className="pr-12 py-1.5 text-center font-semibold text-gray-900">{k.quantity}</td>
            <td className="py-1.5 text-center">
              <QuantityInput
                keyId={k.id}
                value={k.quantity_exit}
                onChange={v => update(k.id, { quantity_exit: v })}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
