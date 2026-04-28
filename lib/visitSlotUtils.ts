// Fonctions pures extraites de app/visiter/actions.ts — testables sans DB

export function generateSlots(startTime: string, endTime: string, durationMins: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  const slots: string[] = []
  for (let m = startMins; m + durationMins <= endMins; m += durationMins) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return slots
}

// Convertit un getDay() JS (0=Dim) en convention 0=Lun
export function jsDayToRule(jsDay: number): number {
  return (jsDay + 6) % 7
}

// Filtre les créneaux trop proches pour aujourd'hui (heure courante + buffer)
export function filterSlotsForToday(
  slots: string[],
  nowMins: number,
  bufferMins: number,
): string[] {
  const minMins = nowMins + bufferMins
  return slots.filter(s => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m >= minMins
  })
}
