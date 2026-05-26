'use client'

import { useState, useEffect } from 'react'
import {
  getInstallationAction,
  updateInstallationAction,
  updateChargesTypeAction,
} from '@/app/admin/inventory/summaryActions'
import type { EdlInstallation } from '@/lib/adminData'

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 w-full'

const METER_READINGS_TEMPLATE = `ELECTRICITE
HC Été : KWh
HC Hiver : KWh
HP Été : KWh
HP Hiver : KWh

EAU
 m3`

export default function ApartmentInstallationPanel({ apartmentId }: { apartmentId: string }) {
  const [open, setOpen] = useState(true)
  const [installation, setInstallation] = useState<EdlInstallation | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draftHot, setDraftHot] = useState('')
  const [draftHeating, setDraftHeating] = useState('')
  const [saving, setSaving] = useState(false)

  // Charges
  const [chargesType, setChargesType] = useState<'forfait' | 'compteurs'>('forfait')
  const [meterReadings, setMeterReadings] = useState('')
  const [savingCharges, setSavingCharges] = useState(false)

  useEffect(() => {
    setLoading(true)
    getInstallationAction(apartmentId).then(inst => {
      setInstallation(inst)
      const ct = (inst?.charges_type ?? 'forfait') === 'compteurs' ? 'compteurs' : 'forfait'
      setChargesType(ct)
      setMeterReadings(inst?.meter_readings ?? '')
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
    setInstallation(prev => ({ ...(prev ?? { charges_type: null, meter_readings: null }), hot_water: hot, heating: heat }))
    setSaving(false)
    setEditing(false)
  }

  async function handleChargesTypeChange(newType: 'forfait' | 'compteurs') {
    setChargesType(newType)
    const readings = newType === 'compteurs'
      ? (meterReadings || METER_READINGS_TEMPLATE)
      : null
    if (newType === 'compteurs' && !meterReadings) {
      setMeterReadings(METER_READINGS_TEMPLATE)
    }
    setSavingCharges(true)
    await updateChargesTypeAction(apartmentId, newType, readings)
    setInstallation(prev => ({
      ...(prev ?? { hot_water: null, heating: null }),
      charges_type: newType,
      meter_readings: readings,
    }))
    setSavingCharges(false)
  }

  async function handleMeterReadingsBlur() {
    if (chargesType !== 'compteurs') return
    setSavingCharges(true)
    await updateChargesTypeAction(apartmentId, 'compteurs', meterReadings || null)
    setInstallation(prev => ({
      ...(prev ?? { hot_water: null, heating: null }),
      charges_type: 'compteurs',
      meter_readings: meterReadings || null,
    }))
    setSavingCharges(false)
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
        ) : (
          <div className="p-6 space-y-4">
            {/* Eau chaude / Chauffage */}
            {editing ? (
              <div className="space-y-3">
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
              <div>
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
            )}

            {/* Toggle Charges */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Charges</span>
                {savingCharges && <span className="text-xs text-gray-400">Enregistrement…</span>}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => handleChargesTypeChange('forfait')}
                    className={`px-3 py-1.5 transition-colors ${
                      chargesType === 'forfait'
                        ? 'bg-blue-primary text-white font-semibold'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Charges au forfait
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChargesTypeChange('compteurs')}
                    className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${
                      chargesType === 'compteurs'
                        ? 'bg-blue-primary text-white font-semibold'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Relevé des compteurs
                  </button>
                </div>
              </div>

              {chargesType === 'forfait' ? (
                <p className="text-sm text-gray-700">Charges au forfait</p>
              ) : (
                <textarea
                  value={meterReadings}
                  onChange={e => setMeterReadings(e.target.value)}
                  onBlur={handleMeterReadingsBlur}
                  rows={9}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-primary/30 resize-y"
                  placeholder={METER_READINGS_TEMPLATE}
                />
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
