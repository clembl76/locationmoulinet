import { getAvailableApartments } from '@/lib/adminData'
import VisitorForm from '@/components/VisitorForm'

export const dynamic = 'force-dynamic'

export default async function VisiterPage() {
  const apartments = await getAvailableApartments()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <a href="/" className="text-sm font-semibold text-blue-primary hover:text-blue-dark transition-colors">
          ← Location Moulinet
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Demande de visite
          </h1>
          <p className="text-sm text-gray-500">
            Remplissez ce formulaire pour planifier une visite. Nous vous contacterons
            rapidement pour confirmer votre rendez-vous.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <VisitorForm apartments={apartments} />
        </div>
      </main>
    </div>
  )
}
