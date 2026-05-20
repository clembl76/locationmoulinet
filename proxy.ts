import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/session'

const VIEWER_ALLOWED = [
  /^\/admin\/apartments(\/[^/]+)?$/,
  /^\/admin\/mise-en-location$/,
  /^\/admin\/mise-en-location\/candidats\/[^/]+$/,
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/admin/login') return NextResponse.next()

  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  const session = await verifySession(token)
  if (!session) {
    const res = NextResponse.redirect(new URL('/admin/login', req.url))
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  if (session.role === 'viewer') {
    const allowed = VIEWER_ALLOWED.some(re => re.test(pathname))
    if (!allowed) {
      return NextResponse.redirect(new URL('/admin/apartments', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
