'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export async function loginAction(formData: FormData) {
  const email    = (formData.get('email') as string | null)?.trim().toLowerCase() || ''
  const password = formData.get('password') as string

  const adminPassword  = process.env.ADMIN_PASSWORD  ?? ''
  const viewerEmail    = process.env.VIEWER_EMAIL    ?? ''
  const viewerPassword = process.env.VIEWER_PASSWORD ?? ''

  let role: 'admin' | 'viewer' | null = null

  if (!email && password === adminPassword) {
    role = 'admin'
  } else if (email && email === viewerEmail && password === viewerPassword) {
    role = 'viewer'
  }

  if (!role) {
    redirect('/admin/login?error=1')
  }

  const token = await signSession({ sub: role === 'admin' ? 'admin' : email, role })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect(role === 'admin' ? '/admin' : '/admin/apartments')
}
