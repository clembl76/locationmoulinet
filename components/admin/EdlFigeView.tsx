'use client'

import { Fragment, useState, useTransition } from 'react'
import type { ApartmentWithLease, EdlInstallation, EdlKey } from '@/lib/adminData'
import type { LeaseDates, EdlFigeHeader } from '@/app/admin/inventory/summaryActions'
import type { InventoryRow } from '@/app/admin/inventory/actions'
import type { SurfaceRow } from '@/app/admin/inventory/surfacesActions'
import { updateChargesTypeAction, updateDepositNotesAction, updateTenantNotesExitAction } from '@/app/admin/inventory/summaryActions'
import { updateInventoryNotesExitAction } from '@/app/admin/inventory/actions'
import { updateSurfaceNotesExitAction } from '@/app/admin/inventory/surfacesActions'
import { generateEdlFigePdfAction, type GenerateEdlFigePdfResult } from '@/app/admin/inventory/edlFigePdfActions'

type EdlType = 'entree' | 'sortie'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatBirthDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const sectionCls = 'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:rounded-none print:border-0 print:shadow-none print:overflow-visible'
const printTextareaCls = 'print:border-0 print:shadow-none print:bg-transparent print:resize-none print:px-0 print:placeholder:text-transparent'
const thCls = 'text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider'
const tdCls = 'px-4 py-2.5 text-sm text-gray-700'

// ─── Bloc pliable générique ────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  badge,
  open,
  onToggle,
  children,
  printBreakBefore,
}: {
  title: string
  badge?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  printBreakBefore?: boolean
}) {
  return (
    <div className={`${sectionCls}${printBreakBefore ? ' print:break-before-page' : ''}`}>
      <div className={`px-6 py-4 flex items-center justify-between ${open ? 'border-b border-gray-100' : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-blue-primary transition-colors"
        >
          <span className="text-xs text-gray-400">{open ? '▼' : '▶'}</span>
          {title}
          {badge}
        </button>
      </div>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Cellule COMMENTAIRE SORTIE inventaire ─────────────────────────────────────

function NotesExitCell({ row }: { row: InventoryRow }) {
  const [draft, setDraft] = useState(row.notes_exit ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const val = draft.trim() || null
    if (val === (row.notes_exit ?? null)) return
    setSaving(true)
    await updateInventoryNotesExitAction(row.id, val)
    setSaving(false)
  }

  return (
    <td className={tdCls + ' min-w-[140px]'}>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={2}
        placeholder="Commentaire sortie…"
        className={`w-full border border-gray-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-primary/40 ${printTextareaCls} ${saving ? 'opacity-50' : ''}`}
      />
    </td>
  )
}

// ─── Cellule COMMENTAIRE SORTIE surfaces ───────────────────────────────────────

function SurfaceNotesExitCell({ row }: { row: SurfaceRow }) {
  const [draft, setDraft] = useState(row.notes_exit ?? '')
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    const val = draft.trim() || null
    if (val === (row.notes_exit ?? null)) return
    setSaving(true)
    await updateSurfaceNotesExitAction(row.id, val)
    setSaving(false)
  }

  return (
    <td className={tdCls + ' min-w-[140px]'}>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={2}
        placeholder="Commentaire sortie…"
        className={`w-full border border-gray-200 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-primary/40 ${printTextareaCls} ${saving ? 'opacity-50' : ''}`}
      />
    </td>
  )
}

// ─── Section charges éditable ──────────────────────────────────────────────────

function ChargesSection({
  installation,
  apartmentId,
}: {
  installation: EdlInstallation | null
  apartmentId: string
}) {
  const chargesType = installation?.charges_type ?? 'forfait'
  const defaultText = chargesType === 'forfait' ? 'Charges au forfait, aucun relevé des compteurs.' : ''
  const [draft, setDraft] = useState(installation?.meter_readings ?? defaultText)
  const [saving, setSaving] = useState(false)

  async function handleBlur() {
    setSaving(true)
    await updateChargesTypeAction(apartmentId, chargesType, draft.trim() || null)
    setSaving(false)
  }

  return (
    <div className="border-t border-gray-100 pt-3">
      <span className="text-gray-400 text-sm">Relevé des consommations</span>
      {saving && <span className="text-xs text-gray-400 ml-2">Enregistrement…</span>}
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={chargesType === 'compteurs' ? 9 : 2}
        className={`mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-primary/30 resize-y ${printTextareaCls}`}
        placeholder={chargesType === 'forfait' ? 'Charges au forfait, aucun relevé des compteurs.' : 'Relevé des compteurs…'}
      />
    </div>
  )
}

// ─── En-tête officiel EDL (contenu sans wrapper) ──────────────────────────────

function EdlHeaderContent({
  header,
  leaseDates,
  edlType,
}: {
  header: EdlFigeHeader
  leaseDates: LeaseDates
  edlType: EdlType
}) {
  const ownerName = [header.owner_title, header.owner_last_name.toUpperCase(), header.owner_first_name]
    .filter(Boolean).join(' ')
  const ownerBirth = header.owner_birth_date
    ? `, né(e) le ${formatBirthDate(header.owner_birth_date)}${header.owner_birth_place ? ` à ${header.owner_birth_place}` : ''}`
    : ''

  const tenantName = [header.tenant_title, header.tenant_last_name.toUpperCase(), header.tenant_first_name]
    .filter(Boolean).join(' ')
  const tenantBirth = header.tenant_birth_date
    ? `, né(e) le ${formatBirthDate(header.tenant_birth_date)}${header.tenant_birth_place ? ` à ${header.tenant_birth_place}` : ''}`
    : ''

  return (
    <div className="p-6 space-y-5 text-sm text-gray-800 print:p-2 print:space-y-2">
      <h2 className="text-base font-bold text-gray-900 text-center uppercase tracking-wide">
        État des lieux / Inventaire des meubles
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        <div><span className="text-gray-400">Adresse</span></div>
        <div className="font-medium">{header.building_address}</div>
        {header.building_short_name === 'Moulinet' && (
          <>
            <div><span className="text-gray-400">Appartement</span></div>
            <div className="font-medium">{header.apartment_number}</div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        <div><span className="text-gray-400">Date EDL Entrée</span></div>
        <div className="font-medium">{formatDate(leaseDates.move_in_date)}</div>
        {edlType === 'sortie' && (
          <>
            <div><span className="text-gray-400">Date EDL Sortie</span></div>
            <div className="font-medium">{formatDate(leaseDates.move_out_date)}</div>
          </>
        )}
      </div>

      <p className="text-gray-600 italic">Annexe du bail signé entre les soussignés :</p>

      <div className="space-y-0.5">
        <p>
          <span className="font-medium">{ownerName}</span>
          {ownerBirth}
        </p>
        {header.owner_address && <p>domicilié(e) {header.owner_address}</p>}
        {header.owner_phone && <p>Téléphone : {header.owner_phone}</p>}
        {header.owner_email && <p>Email : {header.owner_email}</p>}
        <p className="text-gray-500 italic mt-1">Désigné ci-après «{' '}le Bailleur{' '}»</p>
        <p className="font-semibold">D'UNE PART</p>
      </div>

      <p className="font-semibold">ET :</p>

      <div className="space-y-0.5">
        <p>
          <span className="font-medium">{tenantName}</span>
          {tenantBirth}
        </p>
        {header.tenant_address && <p>domicilié(e) {header.tenant_address}</p>}
        {header.tenant_phone && <p>Téléphone : {header.tenant_phone}</p>}
        {header.tenant_email && <p>Email : {header.tenant_email}</p>}
        <p className="text-gray-500 italic mt-1">Désignés ci-après «{' '}le Locataire{' '}»</p>
        <p className="font-semibold">D'AUTRE PART</p>
      </div>
    </div>
  )
}

// ─── Bloc footer signatures ────────────────────────────────────────────────────

function EdlFooter({
  edlType,
  leaseDates,
  header,
  installation,
  apartmentId,
}: {
  edlType: EdlType
  leaseDates: LeaseDates
  header: EdlFigeHeader | null
  installation: EdlInstallation | null
  apartmentId: string
}) {
  const [depositNotes, setDepositNotes] = useState(installation?.deposit_notes ?? '')
  const [savingDeposit, setSavingDeposit] = useState(false)
  const [tenantNotesExit, setTenantNotesExit] = useState(installation?.tenant_notes_exit ?? '')
  const [savingTenant, setSavingTenant] = useState(false)

  const date = edlType === 'entree'
    ? formatDate(leaseDates.move_in_date)
    : formatDate(leaseDates.move_out_date)

  const tenantName = header
    ? [header.tenant_title, header.tenant_last_name.toUpperCase(), header.tenant_first_name].filter(Boolean).join(' ')
    : ''
  const ownerName = header
    ? [header.owner_title, header.owner_last_name.toUpperCase(), header.owner_first_name].filter(Boolean).join(' ')
    : ''

  async function handleDepositBlur() {
    setSavingDeposit(true)
    await updateDepositNotesAction(apartmentId, depositNotes.trim() || null)
    setSavingDeposit(false)
  }

  async function handleTenantBlur() {
    setSavingTenant(true)
    await updateTenantNotesExitAction(apartmentId, tenantNotesExit.trim() || null)
    setSavingTenant(false)
  }

  return (
    <div className="p-6 space-y-4 text-sm text-gray-800 print:p-2 print:space-y-2">
      <p>
        <span className="font-medium">
          {edlType === 'entree' ? 'Entrée dans les lieux le' : 'Sortie des lieux le'} :
        </span>{' '}
        {date}
      </p>
      <p>
        Le présent état des lieux et inventaire ont été établis contradictoirement et accepté par les parties.
      </p>
      <p>
        Montant de la caution versée :{' '}
        <span className="font-semibold">
          {leaseDates.deposit != null ? `${leaseDates.deposit} €` : '—'}
        </span>
      </p>

      {edlType === 'sortie' && (
        <>
          <div className="space-y-1">
            <p className="text-gray-600">Bailleur - Commentaires, réserves et retenues éventuelles sur caution :</p>
            {savingDeposit && <span className="text-xs text-gray-400">Enregistrement…</span>}
            <textarea
              value={depositNotes}
              onChange={e => setDepositNotes(e.target.value)}
              onBlur={handleDepositBlur}
              rows={4}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 resize-y ${printTextareaCls}`}
              placeholder="Commentaires, réserves…"
            />
          </div>
          <div className="space-y-1">
            <p className="text-gray-600">Locataire - Commentaires ou réserves :</p>
            {savingTenant && <span className="text-xs text-gray-400">Enregistrement…</span>}
            <textarea
              value={tenantNotesExit}
              onChange={e => setTenantNotesExit(e.target.value)}
              onBlur={handleTenantBlur}
              rows={4}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 resize-y ${printTextareaCls}`}
              placeholder="Commentaires ou réserves du locataire…"
            />
          </div>
        </>
      )}

      <p>Fait en 2 exemplaires, à Rouen le {date}</p>

      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100">
        <div className="space-y-1">
          <p className="font-semibold">Signature du locataire</p>
          {tenantName && <p className="text-gray-500">{tenantName}</p>}
          <p className="italic text-gray-500">« Lu et approuvé »</p>
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Signature du propriétaire</p>
          {ownerName && <p className="text-gray-500">{ownerName}</p>}
          <p className="italic text-gray-500">« Lu et approuvé »</p>
        </div>
      </div>
    </div>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function EdlFigeView({
  apt,
  leaseDates,
  installation,
  keys,
  inventory,
  surfaces,
  header,
}: {
  apt: ApartmentWithLease
  leaseDates: LeaseDates
  installation: EdlInstallation | null
  keys: EdlKey[]
  inventory: InventoryRow[]
  surfaces: SurfaceRow[]
  header: EdlFigeHeader | null
}) {
  const [edlType, setEdlType] = useState<EdlType>('entree')
  const [pdfPending, startPdfTransition] = useTransition()
  const [pdfResult, setPdfResult] = useState<GenerateEdlFigePdfResult | null>(null)
  const [open, setOpen] = useState({
    header: true,
    installations: true,
    cles: true,
    inventaire: true,
    surfaces: true,
    footer: true,
  })

  function toggle(key: keyof typeof open) {
    setOpen(p => ({ ...p, [key]: !p[key] }))
  }

  function handleGeneratePdf() {
    setPdfResult(null)
    startPdfTransition(async () => {
      const result = await generateEdlFigePdfAction(apt.apartment_id, edlType)
      setPdfResult(result)
    })
  }

  const byRoom = new Map<string, InventoryRow[]>()
  for (const row of inventory) {
    if (!byRoom.has(row.room)) byRoom.set(row.room, [])
    byRoom.get(row.room)!.push(row)
  }
  const sortedRooms = Array.from(byRoom.keys()).sort()

  return (
    <div className="space-y-6 print:space-y-2 edl-print-area">
      {/* Toggle Entrée/Sortie */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Etat des lieux - Apt {apt.apartment_number}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{apt.tenant_name}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600">Type :</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setEdlType('entree')}
                className={`px-4 py-2 transition-colors ${
                  edlType === 'entree'
                    ? 'bg-blue-primary text-white font-semibold'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Entrée
              </button>
              <button
                type="button"
                onClick={() => setEdlType('sortie')}
                className={`px-4 py-2 transition-colors border-l border-gray-200 ${
                  edlType === 'sortie'
                    ? 'bg-blue-primary text-white font-semibold'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Sortie
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-start sm:items-end">
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={pdfPending}
              className="px-4 py-2 rounded-lg bg-blue-primary text-white text-sm font-semibold hover:bg-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfPending ? 'Enregistrement…' : 'Générer le pdf'}
            </button>
            {pdfResult?.ok && (
              <p className="text-xs text-green-600">
                ✓ Enregistré sur Google Drive
                {pdfResult.webViewLink ? (
                  <> — <a href={pdfResult.webViewLink} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800">{pdfResult.filename}</a></>
                ) : (
                  <span className="font-mono"> — {pdfResult.filename}</span>
                )}
              </p>
            )}
            {pdfResult && !pdfResult.ok && (
              <p className="text-xs text-red-500">{pdfResult.error}</p>
            )}
          </div>
        </div>
      </div>

      {/* En-tête officiel EDL */}
      {header ? (
        <CollapsibleSection
          title="État des lieux / Inventaire des meubles"
          open={open.header}
          onToggle={() => toggle('header')}
        >
          <EdlHeaderContent header={header} leaseDates={leaseDates} edlType={edlType} />
        </CollapsibleSection>
      ) : (
        <CollapsibleSection
          title="Bail"
          open={open.header}
          onToggle={() => toggle('header')}
        >
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 print:p-2">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Entrée</p>
              <p className="text-base font-semibold text-gray-900">{formatDate(leaseDates.move_in_date)}</p>
            </div>
            {edlType === 'sortie' && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sortie</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(leaseDates.move_out_date)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Caution</p>
              <p className="text-base font-semibold text-gray-900">
                {leaseDates.deposit != null ? `${leaseDates.deposit} €` : '—'}
              </p>
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Installations */}
      <CollapsibleSection
        title="Installations"
        open={open.installations}
        onToggle={() => toggle('installations')}
      >
        <div className="p-6 space-y-3 text-sm text-gray-700 print:p-2">
          {installation?.hot_water && (
            <div><span className="text-gray-400">Eau chaude : </span>{installation.hot_water}</div>
          )}
          {installation?.heating && (
            <div><span className="text-gray-400">Chauffage : </span>{installation.heating}</div>
          )}
          {!installation?.hot_water && !installation?.heating && (
            <p className="text-gray-300 italic">Non renseigné</p>
          )}
          <ChargesSection installation={installation} apartmentId={apt.apartment_id} />
        </div>
      </CollapsibleSection>

      {/* Clés */}
      <CollapsibleSection
        title="Clés"
        badge={keys.length > 0
          ? <span className="text-sm font-normal text-gray-400">{keys.length} clé{keys.length > 1 ? 's' : ''}</span>
          : undefined}
        open={open.cles}
        onToggle={() => toggle('cles')}
      >
        <div className="p-6 print:p-2">
          {keys.length === 0 ? (
            <p className="text-sm text-gray-300 italic">Aucune clé</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="text-left pb-2">Type de clé</th>
                  <th className="text-right pb-2">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {keys.map(k => (
                  <tr key={k.id}>
                    <td className="py-2 text-gray-700">{k.key_type}</td>
                    <td className="py-2 text-right text-gray-700">{k.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CollapsibleSection>

      {/* Inventaire — démarre sur une nouvelle page à l'impression */}
      <CollapsibleSection
        title="Inventaire"
        badge={inventory.length > 0
          ? <span className="text-sm font-normal text-gray-400">{inventory.length} item{inventory.length > 1 ? 's' : ''}</span>
          : undefined}
        open={open.inventaire}
        onToggle={() => toggle('inventaire')}
        printBreakBefore
      >
        {inventory.length === 0 ? (
          <p className="text-sm text-gray-300 italic p-6">Aucun item</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: edlType === 'sortie' ? 650 : 520 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls}>Item</th>
                  <th className={thCls + ' text-right'}>Qté</th>
                  <th className={thCls}>État</th>
                  <th className={thCls}>Commentaire</th>
                  {edlType === 'sortie' && <th className={thCls}>Commentaire sortie</th>}
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map(room => (
                  <Fragment key={`room-${room}`}>
                    <tr className="bg-gray-50/70">
                      <td colSpan={edlType === 'sortie' ? 5 : 4} className="px-4 py-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{room}</span>
                      </td>
                    </tr>
                    {byRoom.get(room)!
                      .sort((a, b) => a.item_name.localeCompare(b.item_name, 'fr'))
                      .map(row => (
                        <tr key={row.id} className="border-t border-gray-50">
                          <td className={tdCls}>
                            <p className="font-medium text-gray-900">{row.item_name}</p>
                          </td>
                          <td className={tdCls + ' text-right'}>{row.quantity}</td>
                          <td className={tdCls}>{row.condition ?? '—'}</td>
                          <td className={tdCls}>{row.notes ?? '—'}</td>
                          {edlType === 'sortie' && <NotesExitCell row={row} />}
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* Surfaces & équipements */}
      <CollapsibleSection
        title="Surfaces & équipements"
        badge={surfaces.length > 0
          ? <span className="text-sm font-normal text-gray-400">{surfaces.length}</span>
          : undefined}
        open={open.surfaces}
        onToggle={() => toggle('surfaces')}
      >
        {surfaces.length === 0 ? (
          <p className="text-sm text-gray-300 italic p-6">Aucune surface</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: edlType === 'sortie' ? 700 : 600 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls}>Surface / Équipement</th>
                  <th className={thCls}>Pièce</th>
                  <th className={thCls}>Matière</th>
                  <th className={thCls}>État</th>
                  <th className={thCls}>Commentaire</th>
                  {edlType === 'sortie' && <th className={thCls}>Commentaire sortie</th>}
                </tr>
              </thead>
              <tbody>
                {surfaces
                  .sort((a, b) => a.surface.localeCompare(b.surface, 'fr'))
                  .map(row => (
                    <tr key={row.id} className="border-t border-gray-50">
                      <td className={tdCls + ' font-medium'}>{row.surface}</td>
                      <td className={tdCls}>{row.room ?? '—'}</td>
                      <td className={tdCls}>{row.material ?? '—'}</td>
                      <td className={tdCls}>{row.condition ?? '—'}</td>
                      <td className={tdCls}>{row.notes ?? '—'}</td>
                      {edlType === 'sortie' && <SurfaceNotesExitCell row={row} />}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* Footer signatures — démarre sur une nouvelle page à l'impression */}
      <CollapsibleSection
        title="Signatures"
        open={open.footer}
        onToggle={() => toggle('footer')}
        printBreakBefore
      >
        <EdlFooter
          edlType={edlType}
          leaseDates={leaseDates}
          header={header}
          installation={installation}
          apartmentId={apt.apartment_id}
        />
      </CollapsibleSection>
    </div>
  )
}
