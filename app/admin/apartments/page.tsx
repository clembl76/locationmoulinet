import { getAdminApartments, getFutureLeases } from '@/lib/adminData'

export const dynamic = 'force-dynamic'
import ApartmentsClient from '@/components/admin/ApartmentsClient'

export default async function AdminApartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const [apartments, futureLeases] = await Promise.all([
    getAdminApartments(),
    getFutureLeases(),
  ])

  const now = new Date()
  const mois = now.toLocaleString('fr-FR', { month: 'short' })

  return (
    <div className="space-y-6">
      <ApartmentsClient
        apartments={apartments}
        initialStatus={status ?? null}
        mois={mois}
      />

      {futureLeases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="px-5 pt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Futurs baux</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Appt</th>
                  <th className="text-left px-5 py-3 font-semibold">Locataire</th>
                  <th className="text-left px-5 py-3 font-semibold whitespace-nowrap">Entrée</th>
                  <th className="text-right px-5 py-3 font-semibold whitespace-nowrap hidden sm:table-cell">Loyer CC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {futureLeases.map((fl) => (
                  <tr
                    key={fl.lease_id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-bold text-blue-dark">
                      <a href={`/admin/apartments/${fl.apartment_number}?lease=${fl.lease_id}`} className="block">
                        {fl.apartment_number}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      <a href={`/admin/apartments/${fl.apartment_number}?lease=${fl.lease_id}`} className="block">
                        {[fl.tenant_first_name, fl.tenant_last_name].filter(Boolean).join(' ') || '—'}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                      <a href={`/admin/apartments/${fl.apartment_number}?lease=${fl.lease_id}`} className="block">
                        {new Date(fl.signing_date).toLocaleDateString('fr-FR')}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 whitespace-nowrap hidden sm:table-cell">
                      <a href={`/admin/apartments/${fl.apartment_number}?lease=${fl.lease_id}`} className="block">
                        {fl.rent_including_charges != null ? `${fl.rent_including_charges} €` : '—'}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
