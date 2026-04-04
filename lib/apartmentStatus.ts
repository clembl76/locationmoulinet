export type ApartmentStatus = 'available' | 'soon' | 'rented'

export function getApartmentStatus(
  leases: { move_out_inspection_date: string | null }[]
): { status: ApartmentStatus; availableFrom: Date | null } {
  const now = new Date()

  // Active lease = no departure date set
  if (leases.some(l => l.move_out_inspection_date === null)) {
    return { status: 'rented', availableFrom: null }
  }

  // Future move-out = tenant has given notice
  const futureDates = leases
    .map(l => (l.move_out_inspection_date ? new Date(l.move_out_inspection_date) : null))
    .filter((d): d is Date => d !== null && d > now)
    .sort((a, b) => a.getTime() - b.getTime())

  if (futureDates.length > 0) {
    const availableFrom = new Date(futureDates[0])
    availableFrom.setDate(availableFrom.getDate() + 1)
    return { status: 'soon', availableFrom }
  }

  return { status: 'available', availableFrom: null }
}

export function statusSortOrder(status: ApartmentStatus): number {
  return { available: 0, soon: 1, rented: 2 }[status]
}

export function formatAvailableFrom(date: Date, lang: 'fr' | 'en'): string {
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}
