import {
  getAvailableApartments,
  getVisitSettings,
  getVisitAvailabilityRules,
  getVisitAvailabilityExceptions,
} from '@/lib/adminData'
import VisitorForm from '@/components/VisitorForm'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <a href="/" className="text-sm font-semibold text-blue-primary hover:text-blue-dark transition-colors">
          ← Location Moulinet
        </a>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {!visitsAvailable ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <p className="text-4xl">🗓️</p>
            <h1 className="text-xl font-bold text-gray-900">
              Nous ne proposons pas de visites actuellement
            </h1>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Nos disponibilités pour les visites sont momentanément suspendues.
              N&apos;hésitez pas à revenir consulter cette page prochainement.
            </p>
            <a
              href="/"
              className="inline-block mt-2 text-sm text-blue-primary hover:text-blue-dark font-medium underline underline-offset-2"
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
