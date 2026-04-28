import AdminNavbar from '@/components/admin/AdminNavbar'
import { getSession } from '@/lib/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const role = session?.role ?? 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar role={role} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
