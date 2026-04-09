import { getAdminApartmentDetail, getEdlPageData, type EdlTenant, type EdlGuarantor } from '@/lib/adminData'
import { notFound } from 'next/navigation'
import EdlElementsTable from '@/components/admin/EdlElementsTable'
import EdlItemsTable from '@/components/admin/EdlItemsTable'
import EdlKeysTable from '@/components/admin/EdlKeysTable'

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 w-40 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function PersonBlock({ title, person }: {
  title: string
  person: EdlTenant | EdlGuarantor | null
}) {
  if (!person) return null
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : null
  const fullName = [person.title, person.first_name, person.last_name].filter(Boolean).join(' ')

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-0">
        <InfoRow label="Nom" value={fullName} />
        <InfoRow label="Date de naissance" value={fmt(person.birth_date)} />
        <InfoRow label="Lieu de naissance" value={person.birth_place} />
        <InfoRow label="Adresse" value={person.address} />
        <InfoRow label="Téléphone" value={person.phone} />
        <InfoRow label="Email" value={person.email} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EdlPage({
  params,
}: {
  params: Promise<{ number: string; reportId: string }>
}) {
  const { number, reportId } = await params
  const apt = await getAdminApartmentDetail(number)
  if (!apt) notFound()

  const data = await getEdlPageData(reportId, apt.id)
  if (!data) notFound()

  const { report, installation, keys, elements, items, tenant, guarantor } = data

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Breadcrumb */}
      <a href={`/admin/apartments/${number}`} className="text-sm text-gray-400 hover:text-gray-600">
        ← Appartement {number}
      </a>

      {/* Titre + dates */}
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          État des lieux — Appartement {number}
        </h1>
        <span className="text-sm text-gray-400">{apt.building_address}</span>
      </div>
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-gray-400">Entrée :</span>{' '}
          <span className="font-semibold text-gray-800">{fmt(report.entry_date)}</span>
        </div>
        <div>
          <span className="text-gray-400">Sortie :</span>{' '}
          <span className={`font-semibold ${report.exit_date ? 'text-gray-800' : 'text-gray-300'}`}>
            {fmt(report.exit_date)}
          </span>
        </div>
      </div>

      {/* Locataire */}
      <PersonBlock title="Locataire" person={tenant} />

      {/* Installation */}
      {installation && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Installation</SectionTitle>
          <div className="grid grid-cols-2 gap-x-8 text-sm">
            <InfoRow label="Eau chaude" value={installation.hot_water} />
            <InfoRow label="Chauffage"  value={installation.heating} />
          </div>
          <p className="text-xs text-gray-400 mt-3 italic">
            Les charges étant payées au forfait, il n&apos;est pas établi de relevé des compteurs.
          </p>
        </div>
      )}

      {/* Clés */}
      {keys.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Remise des clefs</SectionTitle>
          <EdlKeysTable initialKeys={keys} />
        </div>
      )}

      {/* État des lieux — éléments fixes */}
      {elements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <SectionTitle>État des lieux</SectionTitle>
          </div>
          <EdlElementsTable initialElements={elements} />
        </div>
      )}

      {/* Inventaire */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-0">
            <SectionTitle>Inventaire</SectionTitle>
          </div>
          <EdlItemsTable initialItems={items} />
        </div>
      )}
    </div>
  )
}
