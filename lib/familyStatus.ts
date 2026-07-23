// Liste fermée des statuts familiaux — partagée entre le formulaire public de
// candidature (candidater/CandidateForm.tsx) et le formulaire admin de création
// de bail (NouveauBailForm.tsx). Modifier ce tableau met à jour les deux écrans.
export const FAMILY_STATUSES = ['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/Veuve'] as const
export type FamilyStatus = typeof FAMILY_STATUSES[number]
