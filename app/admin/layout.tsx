export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-dark text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-sm tracking-wide">
            Location Moulinet
          </a>
          <nav className="flex gap-4 text-sm text-blue-light/80">
            <a href="/admin/mise-en-location" className="hover:text-white transition-colors">Mise en location</a>
            <a href="/admin/apartments" className="hover:text-white transition-colors">Appartements</a>
            <a href="/admin/payments" className="hover:text-white transition-colors">Paiements</a>
            <a href="/admin/mois" className="hover:text-white transition-colors">Mois en cours</a>
            <a href="/admin" className="hover:text-white transition-colors">Tableau de bord annuel</a>
          </nav>
        </div>
        <a href="/admin/logout" className="text-xs text-blue-light/60 hover:text-white transition-colors">
          Déconnexion
        </a>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
