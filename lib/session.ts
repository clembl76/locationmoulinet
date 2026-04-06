import { SignJWT, jwtVerify } from 'jose'

const SESSION_COOKIE = 'admin_session'
const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7 // 7 days

function getKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not set')
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: { sub: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN_SECONDS}s`)
    .sign(getKey())
}

export async function verifySession(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getKey())
    return payload as { sub: string }
  } catch {
    return null
  }
}

export { SESSION_COOKIE }
