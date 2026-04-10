import { notFound } from 'next/navigation'
import {
  getCandidateDetail,
  getCandidateGuarantor,
  getCandidateDocuments,
} from '@/lib/adminData'
import CandidateActions from './CandidateActions'

export const dynamic = 'force-dynamic'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fmtTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function fmtIncome(n: number | null) {
  if (!n) return '—'
  return `${n.toLocaleString('fr-FR')} €/mois`
}

function fmtDuration(months: number | null) {
  if (!months) return '—'
  if (months < 12) return `${months} mois`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return years === 1 ? '1 an' : `${years} ans`
  return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50 last:border-0">
      <dt className="text-sm text-gray-400 w-44 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '—'}</dd>
    </div>
  )
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Nouvelle',
  accepted:  'Retenu',
  rejected:  'Refusé',
  withdrawn: 'Plus intéressé',
  signed:    'Bail signé',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-blue-50 text-blue-700 border-blue-200',
  accepted:  'bg-green-50 text-green-700 border-green-200',
  rejected:  'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-500 border-gray-200',
  signed:    'bg-green-100 text-green-800 border-green-300',
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, docs] = await Promise.all([
    getCandidateDetail(id),
    getCandidateDocuments(id),
  ])

  if (!detail) notFound()

  const guarantor = await getCandidateGuarantor(detail.candidate_id)

  const candidateDocs = docs.filter(d => d.owner === 'candidate')
  const guarantorDocs = docs.filter(d => d.owner === 'guarantor')

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <a href="/admin/mise-en-location"
            className="text-sm text-blue-primary hover:underline mb-2 block">
            ← Mise en location
          </a>
          <h1 className="text-2xl font-bold text-gray-900">
            {detail.first_name} {detail.last_name.toUpperCase()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Candidature · Appartement n°{detail.apartment_number}
            {detail.floor_label && ` · ${detail.floor_label}`}
          </p>
        </div>
        <div className={`text-sm font-semibold px-3 py-1.5 rounded-xl border ${STATUS_COLORS[detail.status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
          {STATUS_LABELS[detail.status] ?? detail.status}
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="flex gap-6 items-start">

        {/* ── Colonne gauche ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Demande de bail — EN PREMIER */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Demande de bail</h2>
            <dl>
              <Row label="Appartement" value={`n°${detail.apartment_number}${detail.floor_label ? ` · ${detail.floor_label}` : ''}`} />
              <Row label="Date de signature souhaitée" value={fmtDate(detail.desired_signing_date)} />
              <Row label="Dossier reçu le" value={fmtDate(detail.created_at)} />
              {detail.visitor_visit_date && (
                <Row
                  label="Visite effectuée le"
                  value={`${fmtDate(detail.visitor_visit_date)}${detail.visitor_visit_time ? ` à ${fmtTime(detail.visitor_visit_time)}` : ''}`}
                />
              )}
              {detail.visitor_desired_duration_months != null && (
                <Row label="Durée souhaitée" value={fmtDuration(detail.visitor_desired_duration_months)} />
              )}
              {detail.visitor_total_income != null && (
                <Row label="Revenus déclarés" value={fmtIncome(detail.visitor_total_income)} />
              )}
              {detail.visitor_comments && (
                <Row label="Commentaires" value={detail.visitor_comments} />
              )}
            </dl>
          </section>

          {/* Candidat */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Candidat</h2>
            <dl>
              {detail.title && <Row label="Titre" value={detail.title} />}
              <Row label="Prénom" value={detail.first_name} />
              <Row label="Nom" value={detail.last_name.toUpperCase()} />
              <Row label="Email" value={detail.email} />
              <Row label="Téléphone" value={detail.phone} />
              <Row label="Date de naissance" value={fmtDate(detail.birth_date)} />
              <Row label="Lieu de naissance" value={detail.birth_place} />
              <Row label="Adresse" value={detail.address} />
            </dl>
          </section>

          {/* Garant */}
          {guarantor ? (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Garant</h2>
              <dl>
                {guarantor.title && <Row label="Titre" value={guarantor.title} />}
                <Row label="Prénom" value={guarantor.first_name} />
                <Row label="Nom" value={guarantor.last_name ? guarantor.last_name.toUpperCase() : null} />
                <Row label="Email" value={guarantor.email} />
                <Row label="Téléphone" value={guarantor.phone} />
                <Row label="Date de naissance" value={fmtDate(guarantor.birth_date)} />
                <Row label="Lieu de naissance" value={guarantor.birth_place} />
                <Row label="Adresse" value={guarantor.address} />
              </dl>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Garant</h2>
              <p className="text-sm text-gray-400 italic">Pas de garant déclaré.</p>
            </section>
          )}

        </div>

        {/* ── Colonne droite ─────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Actions */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Actions</h2>
            <CandidateActions
              applicationId={detail.application_id}
              currentStatus={detail.status}
              visitorId={detail.visitor_id}
              aptNumber={detail.apartment_number}
              desiredSigningDate={detail.desired_signing_date}
              rentCC={detail.rent_including_charges}
              candidate={{
                title: detail.title,
                firstName: detail.first_name,
                lastName: detail.last_name,
                email: detail.email,
                phone: detail.phone,
                birthDate: detail.birth_date,
                birthPlace: detail.birth_place,
                address: detail.address,
                familyStatus: detail.family_status,
              }}
              guarantor={guarantor ? {
                firstName: guarantor.first_name,
                lastName: guarantor.last_name,
                email: guarantor.email,
                phone: guarantor.phone,
              } : null}
            />
          </section>

          {/* Documents */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Documents
              {docs.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {docs.length} fichier{docs.length > 1 ? 's' : ''}
                </span>
              )}
            </h2>

            {docs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucun document transmis.</p>
            ) : (
              <div className="space-y-4">
                {candidateDocs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Candidat</p>
                    <ul className="space-y-1.5">
                      {candidateDocs.map((doc, i) => (
                        <li key={i} className="text-sm">
                          {doc.drive_url ? (
                            <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-primary hover:underline flex items-center gap-1.5">
                              <span className="text-gray-300 text-xs">📄</span>
                              <span className="truncate">{doc.file_name || 'Document'}</span>
                            </a>
                          ) : (
                            <span className="text-gray-600 flex items-center gap-1.5">
                              <span className="text-gray-300 text-xs">📄</span>
                              <span className="truncate">{doc.file_name || 'Document'}</span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {guarantorDocs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Garant</p>
                    <ul className="space-y-1.5">
                      {guarantorDocs.map((doc, i) => (
                        <li key={i} className="text-sm">
                          {doc.drive_url ? (
                            <a href={doc.drive_url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-primary hover:underline flex items-center gap-1.5">
                              <span className="text-gray-300 text-xs">📄</span>
                              <span className="truncate">{doc.file_name || 'Document'}</span>
                            </a>
                          ) : (
                            <span className="text-gray-600 flex items-center gap-1.5">
                              <span className="text-gray-300 text-xs">📄</span>
                              <span className="truncate">{doc.file_name || 'Document'}</span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

        </div>
      </div>

    </div>
  )
}
