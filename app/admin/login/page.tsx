import { loginAction } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-blue-light flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
        <h1 className="text-xl font-bold text-blue-dark mb-2">Location Moulinet</h1>
        <p className="text-sm text-gray-400 mb-8">Espace gestionnaire</p>

        <form action={loginAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-primary/30 focus:border-blue-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">Mot de passe incorrect.</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-dark transition-colors"
          >
            Connexion
          </button>
        </form>
      </div>
    </div>
  )
}
