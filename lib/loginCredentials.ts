import type { SessionPayload } from '@/lib/session'

export type LoginEnv = {
  ADMIN_PASSWORD?: string
  VIEWER_EMAIL?: string
  VIEWER_PASSWORD?: string
  MUSE_EMAIL?: string
  MUSE_PASSWORD?: string
}

// Compte admin dédié à l'agent IA Muse : email + mot de passe propres,
// pour pouvoir le révoquer sans toucher au mot de passe admin principal.
export function resolveLogin(email: string, password: string, env: LoginEnv): SessionPayload | null {
  const museEmail    = (env.MUSE_EMAIL ?? '').trim().toLowerCase()
  const musePassword = env.MUSE_PASSWORD ?? ''

  if (museEmail && musePassword && email === museEmail && password === musePassword) {
    return { sub: 'muse', role: 'admin' }
  }

  if (password === (env.ADMIN_PASSWORD ?? '')) {
    return { sub: 'admin', role: 'admin' }
  }

  const viewerEmail = env.VIEWER_EMAIL ?? ''
  if (email && email === viewerEmail && password === (env.VIEWER_PASSWORD ?? '')) {
    return { sub: email, role: 'viewer' }
  }

  return null
}
