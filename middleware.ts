import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE = 'admin_session'

function getKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not set')
  return new TextEncoder().encode(secret)
}

// Paths accessibles au viewer uniquement
const VIEWER_ALLOWED = [
  /^\/admin\/apartments(\/[^/]+)?$/,
  /^\/admin\/mise-en-location$/,
  /^\/admin\/mise-en-location\/candidats\/[^/]+$/,
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, getKey())
    const role = (payload as { role?: string }).role

    if (role === 'viewer') {
      const allowed = VIEWER_ALLOWED.some(re => re.test(pathname))
      if (!allowed) {
        return NextResponse.redirect(new URL('/admin/apartments', req.url))
      }
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
