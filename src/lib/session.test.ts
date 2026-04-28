// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { signSession, verifySession } from '@/lib/session'
import { SignJWT } from 'jose'

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-for-unit-tests-minimum-32-chars!'
})

describe('signSession / verifySession', () => {
  it('signe et vérifie un token admin', async () => {
    const token = await signSession({ sub: 'admin', role: 'admin' })
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT = 3 segments

    const payload = await verifySession(token)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('admin')
    expect(payload?.role).toBe('admin')
  })

  it('signe et vérifie un token viewer', async () => {
    const token = await signSession({ sub: 'viewer@test.com', role: 'viewer' })
    const payload = await verifySession(token)
    expect(payload?.role).toBe('viewer')
    expect(payload?.sub).toBe('viewer@test.com')
  })

  it('retourne null pour un token invalide', async () => {
    expect(await verifySession('token.invalide.ici')).toBeNull()
  })

  it('retourne null pour un token vide', async () => {
    expect(await verifySession('')).toBeNull()
  })

  it('retourne null pour un token signé avec un mauvais secret', async () => {
    const wrongKey = new TextEncoder().encode('wrong-secret-totally-different-xyz!!')
    const badToken = await new SignJWT({ sub: 'hacker', role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(wrongKey)

    expect(await verifySession(badToken)).toBeNull()
  })
})
