import { redirect } from 'next/navigation'

// Page fusionnée dans /admin (Tableau de bord) — redirection pour les liens éventuels.
export default function MoisEnCoursRedirect() {
  redirect('/admin')
}
