import { getAdminApartmentDetail, getApartmentTransactions, getRentForMonth, checkCautionTransaction, getEdlReport, getGuarantorForLease, type RentRecord } from '@/lib/adminData'
import { getDriveTenantFolderUrl, getDriveEdlEntryUrl } from '@/lib/quittance'
import { notFound } from 'next/navigation'
import QuittanceButton from '@/components/admin/QuittanceButton'
import DepositPaidCheckbox from '@/components/admin/DepositPaidCheckbox'
import AttestationLocationButton from '@/components/admin/AttestationLocationButton'
import InsuranceCheckbox from '@/components/admin/InsuranceCheckbox'
import DocusignUrls from '@/components/admin/DocusignUrls'
import PreavisButton from '@/components/admin/PreavisButton'
import EdlButton from '@/components/admin/EdlButton'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

function DisabledBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      className="w-full text-left text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
      title="Bientôt disponible"
    >
      {children}
    </button>
  )
}

export default async function AdminApartmentDetailPage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number } = await params
  const apt = await getAdminApartmentDetail(number)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const [transactions, rentRecord, , edlReport, guarantor, driveLeaseUrl, driveEdlUrl] = await Promise.all([
    getApartmentTransactions(number, apt?.tenant_last_name ?? null, 24),
    apt?.lease_id ? getRentForMonth(apt.lease_id, year, month) : Promise.resolve(null),
    checkCautionTransaction(number),
    apt?.lease_id ? getEdlReport(apt.lease_id) : Promise.resolve(null),
    apt?.lease_id ? getGuarantorForLease(apt.lease_id) : Promise.resolve(null),
    apt?.tenant_last_name ? getDriveTenantFolderUrl(number, apt.tenant_last_name) : Promise.resolve(null),
    apt?.tenant_last_name ? getDriveEdlEntryUrl(number, apt.tenant_last_name) : Promise.resolve(null),
  ])

  if (!apt) notFound()

  const mois = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
  const moisCourt = now.toLocaleString('fr-FR', { month: 'long' })
  const isOccupied = !!apt.lease_id
  const isUnpaid = !!rentRecord && rentRecord.amount_received == null

  const hasTenant = !!apt.tenant_last_name
  const tenantName = hasTenant
    ? `${apt.tenant_first_name ?? ''} ${apt.tenant_last_name}`.trim()
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <a href="/admin/apartments" className="text-sm text-gray-400 hover:text-gray-600">
        ← Appartements
      </a>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          <a href={`/apartments/${apt.number}`} className="hover:text-blue-primary transition-colors">
            Appartement {apt.number}
          </a>
        </h1>
        <span className="text-sm text-gray-400">{apt.building_short_name} · {apt.surface_area} m²</span>
        {apt.move_out_date && (
          <div className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-xl border bg-amber-50 text-amber-700 border-amber-200">
            Départ prévu
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Locataire */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Locataire</h2>
            {hasTenant ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-light flex items-center justify-center text-blue-primary font-bold text-sm">
                    {(apt.tenant_first_name?.[0] ?? '') + (apt.tenant_last_name?.[0] ?? '')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{tenantName}</p>
                    <p className="text-xs text-gray-400">{apt.tenant_title ?? ''}</p>
                  </div>
                </div>
                <InfoRow label="Email" value={apt.tenant_email} />
                <InfoRow label="Téléphone" value={apt.tenant_phone} />
                <InfoRow
                  label="Entrée"
                  value={apt.move_in_date ? new Date(apt.move_in_date).toLocaleDateString('fr-FR') : null}
                />
                {apt.move_out_date && (
                  <InfoRow
                    label="Départ prévu"
                    value={<span className="text-amber-600">{new Date(apt.move_out_date).toLocaleDateString('fr-FR')}</span>}
                  />
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Appartement vacant.</p>
                <a
                  href={`/admin/apartments/${apt.number}/nouveau-bail`}
                  className="inline-block bg-blue-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-dark transition-colors"
                >
                  + Créer un bail
                </a>
              </div>
            )}
          </div>

          {/* Garant */}
          {hasTenant && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Garant</h2>
              {guarantor ? (
                <>
                  <p className="font-semibold text-gray-900 mb-2">
                    {[guarantor.title, guarantor.first_name, guarantor.last_name].filter(Boolean).join(' ')}
                  </p>
                  {guarantor.email && <InfoRow label="Email" value={guarantor.email} />}
                  {guarantor.phone && <InfoRow label="Téléphone" value={guarantor.phone} />}
                </>
              ) : (
                <p className="text-sm text-gray-400">Aucun garant enregistré pour ce bail.</p>
              )}
            </div>
          )}

          {/* Bail */}
          {isOccupied && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bail</h2>
              <div className="space-y-2 mb-4">
                {driveLeaseUrl && (
                  <a
                    href={driveLeaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-primary hover:text-blue-dark underline underline-offset-2"
                  >
                    Ouvrir le bail sur Google Drive →
                  </a>
                )}
              </div>
              <DocusignUrls
                leaseId={apt.lease_id!}
                aptNumber={apt.number}
                initialLeaseUrl={apt.lease_docusign_lease_url}
                initialEdlUrl={apt.lease_docusign_edl_url}
              />
              <InsuranceCheckbox
                leaseId={apt.lease_id!}
                aptNumber={apt.number}
                initialValue={apt.lease_insurance_attestation}
              />
            </div>
          )}

          {/* Historique des transactions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Transactions récentes
            </h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune transaction.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map((tx, i) => (
                  <div key={tx.id ?? i} className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm text-gray-700">
                        {new Date(tx.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                      {tx.type && <span className="text-xs text-gray-400 ml-2">{tx.type}</span>}
                      {tx.payment_method && <span className="text-xs text-gray-300 ml-1">· {tx.payment_method}</span>}
                    </div>
                    <span className={`text-sm font-semibold ${tx.direction === 'CREDIT' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.direction === 'CREDIT' ? '+' : '−'}{tx.amount} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Loyer du mois */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Loyer — {mois}
            </p>
            {!hasTenant ? (
              <p className="text-sm text-gray-400">Vacant</p>
            ) : rentRecord ? (
              <>
                {/* Montant attendu */}
                <div className="mb-3">
                  <p className="text-2xl font-bold text-blue-dark">{rentRecord.amount_expected} €</p>
                  {rentRecord.is_prorata && rentRecord.prorata_days != null && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Prorata : {rentRecord.prorata_days} j sur {rentRecord.days_in_month} j
                      {' '}(loyer CC : {apt.rent_including_charges} €)
                    </p>
                  )}
                </div>
                {/* Statut encaissement */}
                {rentRecord.amount_received != null ? (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-green-700 font-semibold text-sm">
                      Encaissé — {rentRecord.amount_received} €
                      {rentRecord.received_at && (
                        <span className="text-gray-400 font-normal ml-1">
                          le {new Date(rentRecord.received_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-red-500 font-bold">✗</span>
                    <span className="text-red-600 font-semibold text-sm">Non encaissé</span>
                  </div>
                )}
                {isUnpaid && rentRecord && apt.lease_id && (
                  <QuittanceButton
                    rentId={rentRecord.id}
                    leaseId={apt.lease_id}
                    aptNumber={apt.number}
                    year={year}
                    month={month}
                    mois={moisCourt}
                  />
                )}
              </>
            ) : (
              <>
                {/* Pas encore de loyer généré */}
                {apt.paid_this_month ? (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-green-700 font-semibold text-sm">Encaissé (via transactions)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-red-500 font-bold">✗</span>
                    <span className="text-red-600 font-semibold text-sm">Non encaissé</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Loyers non générés pour ce mois. Utilisez le bouton du tableau de bord.
                </p>
              </>
            )}
          </div>

          {/* Loyer détail */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Loyer</p>
            <InfoRow label="Hors charges" value={apt.rent_excluding_charges ? `${apt.rent_excluding_charges} €` : null} />
            <InfoRow label="Charges" value={apt.charges ? `${apt.charges} €` : null} />
            <InfoRow label="Total CC" value={<span className="font-bold text-blue-dark">{apt.rent_including_charges} €</span>} />
          </div>

          {/* Actions */}
          {isOccupied && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</p>
              <PreavisButton
                leaseId={apt.lease_id!}
                aptNumber={apt.number}
                currentMoveOut={apt.move_out_date}
              />
              <DisabledBtn>Contacter</DisabledBtn>
            </div>
          )}

          {/* EDL */}
          {isOccupied && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">État des lieux</p>
              {edlReport ? (
                <a
                  href={`/admin/apartments/${apt.number}/edl/${edlReport.id}`}
                  className="w-full block text-center text-sm font-semibold bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark transition-colors"
                >
                  Voir le document d&apos;EDL
                </a>
              ) : (
                <EdlButton
                  leaseId={apt.lease_id!}
                  aptNumber={apt.number}
                  moveInDate={apt.move_in_date}
                />
              )}
              {driveEdlUrl && (
                <a
                  href={driveEdlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-primary hover:text-blue-dark underline underline-offset-2"
                >
                  Ouvrir l&apos;EDL d&apos;entrée sur Google Drive →
                </a>
              )}
              {apt.lease_docusign_edl_url && (
                <a
                  href={apt.lease_docusign_edl_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-primary hover:text-blue-dark underline underline-offset-2"
                >
                  EDL Entrée sur Docusign →
                </a>
              )}
            </div>
          )}

          {/* Documents */}
          {isOccupied && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents</p>
              <DepositPaidCheckbox
                leaseId={apt.lease_id!}
                aptNumber={apt.number}
                depositAmount={apt.lease_deposit}
                initialPaid={apt.lease_deposit_paid}
              />
              <AttestationLocationButton
                leaseId={apt.lease_id!}
                aptNumber={apt.number}
                hasUnpaidRent={isUnpaid}
              />
              <DisabledBtn>Attestation CAF</DisabledBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
