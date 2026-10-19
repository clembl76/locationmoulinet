'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signSession, SESSION_COOKIE } from '@/lib/session'
import { resolveLogin } from '@/lib/loginCredentials'

export async function loginAction(formData: FormData) {
  const email    = (formData.get('email') as string | null)?.trim().toLowerCase() || ''
  const password = formData.get('password') as string

  const session = resolveLogin(email, password, {
    ADMIN_PASSWORD:  process.env.ADMIN_PASSWORD,
    VIEWER_EMAIL:    process.env.VIEWER_EMAIL,
    VIEWER_PASSWORD: process.env.VIEWER_PASSWORD,
    MUSE_EMAIL:      process.env.MUSE_EMAIL,
    MUSE_PASSWORD:   process.env.MUSE_PASSWORD,
  })

  if (!session) {
    redirect('/admin/login?error=1')
  }

  const token = await signSession(session)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect(session.role === 'admin' ? '/admin' : '/admin/apartments')
}
