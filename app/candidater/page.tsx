import { getApartmentsForCandidature, getVisitSettings } from '@/lib/adminData'
import CandidateForm from '@/components/CandidateForm'
import { publicFontClassName } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

export default async function CandidaterPage() {
  const [apartments, settings] = await Promise.all([
    getApartmentsForCandidature(),
    getVisitSettings(),
  ])

  if (!settings.applications_active) {
    return (
      <main className={`min-h-screen bg-white py-10 px-4 ${publicFontClassName}`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth={1.6} />
                <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" strokeWidth={1.6} />
              </svg>
            </div>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Il n'est pas possible de déposer son dossier actuellement. N'hésitez pas à revenir consulter cette page prochainement.
            </p>
            <a href="/" className="inline-block mt-2 text-sm text-teal hover:underline">
              Retour à l'accueil
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-screen bg-white py-10 px-4 ${publicFontClassName}`}>
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
