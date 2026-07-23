// Libellés du statut d'une candidature — partagés entre LettingTable.tsx
// (tableau récapitulatif) et candidats/[id]/page.tsx (détail d'un candidat).
// Les couleurs restent locales à chaque écran (contextes visuels différents :
// badge de tableau vs puce d'en-tête avec bordure).
export const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  pending:   'Nouvelle',
  accepted:  'Acceptée',
  rejected:  'Rejetée',
  withdrawn: 'Plus intéressé',
  signed:    'Bail signé',
}
