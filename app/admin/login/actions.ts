'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signSession, SESSION_COOKIE } from '@/lib/session'

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || password !== adminPassword) {
    redirect('/admin/login?error=1')
  }

  const token = await signSession({ sub: 'admin' })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  redirect('/admin')
}
