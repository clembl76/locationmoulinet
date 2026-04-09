import { getApartmentsForCandidature } from '@/lib/adminData'
import CandidateForm from '@/components/CandidateForm'

export const dynamic = 'force-dynamic'

export default async function CandidaterPage() {
  const apartments = await getApartmentsForCandidature()

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Déposer un dossier de candidature</h1>
          <p className="text-sm text-gray-500 mt-1">
            Remplissez ce formulaire pour soumettre votre candidature à un bail.
          </p>
        </div>
        <CandidateForm apartments={apartments} />
      </div>
    </main>
  )
}
