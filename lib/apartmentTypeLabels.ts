// Libellés bilingues du type d'appartement (apartments.type, enum PostgreSQL
// STUDIO/T1/T2/T3/T4/BUREAU) — partagés entre ApartmentCard.tsx et ApartmentDetail.tsx.
export const TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  STUDIO: { fr: 'Studio', en: 'Studio' },
  T1: { fr: 'T1', en: '1-room apt.' },
  T2: { fr: 'T2', en: '2-room apt.' },
  T3: { fr: 'T3', en: '3-room apt.' },
  T4: { fr: 'T4', en: '4-room apt.' },
}
