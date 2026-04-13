import {
  getVisitSettings,
  getVisitAvailabilityRules,
  getVisitAvailabilityExceptions,
} from '@/lib/adminData'
import AvailabilityManager from './AvailabilityManager'

export const dynamic = 'force-dynamic'

export default async function VisitesPage() {
  const [settings, rules, exceptions] = await Promise.all([
    getVisitSettings(),
    getVisitAvailabilityRules(),
    getVisitAvailabilityExceptions(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disponibilités visites</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gérez vos plages de disponibilité et les exceptions. Les créneaux proposés
          aux visiteurs tiennent compte de ces règles et des rendez-vous déjà pris.
        </p>
      </div>

      <AvailabilityManager
        settings={settings}
        rules={rules}
        exceptions={exceptions}
      />
    </div>
  )
}
