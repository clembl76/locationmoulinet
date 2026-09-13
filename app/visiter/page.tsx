import {
  getAvailableApartments,
  getVisitSettings,
  getVisitAvailabilityRules,
  getVisitAvailabilityExceptions,
} from '@/lib/adminData'
import VisitorForm from '@/components/VisitorForm'
import { publicFontClassName } from '@/lib/fonts'

export const dynamic = 'force-dynamic'

export default async function VisiterPage() {
  const [apartments, settings, rules, exceptions] = await Promise.all([
    getAvailableApartments(),
    getVisitSettings(),
    getVisitAvailabilityRules(),
    getVisitAvailabilityExceptions(),
  ])

  const visitsAvailable = settings.active && rules.length > 0

  return (
    <div className={`min-h-screen bg-white ${publicFontClassName}`}>
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <a href="/" className="text-sm font-semibold text-gray-900 hover:text-teal transition-colors">
          ← Location Moulinet
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {!visitsAvailable ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth={1.6} />
                <path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" strokeWidth={1.6} />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Nous ne proposons pas de visites actuellement
            </h1>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Nos disponibilités pour les visites sont momentanément suspendues.
              N&apos;hésitez pas à revenir consulter cette page prochainement.
            </p>
            <a
              href="/"
              className="inline-block mt-2 text-sm text-teal hover:text-gray-900 font-medium underline underline-offset-2"
            >
              Retour à l&apos;accueil
            </a>
          </div>
        ) : (
          <>
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
              <VisitorForm
                apartments={apartments}
                availabilityData={{
                  active: settings.active,
                  rules,
                  // Seules les exceptions journée entière (sans plage horaire) grisent le calendrier
                  exceptions: exceptions.filter(e => !e.start_time).map(e => e.date),
                  slotDurationMinutes: settings.slot_duration_minutes,
                  contactName: settings.contact_name ?? null,
                  contactPhone: settings.contact_phone ?? null,
                  contactEmail: settings.contact_email ?? null,
                  contactWebsite: settings.contact_website ?? null,
                }}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
