// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveLogin, type LoginEnv } from '@/lib/loginCredentials'

const env: LoginEnv = {
  ADMIN_PASSWORD: 'admin-pwd',
  VIEWER_EMAIL: 'viewer@test.fr',
  VIEWER_PASSWORD: 'viewer-pwd',
  MUSE_EMAIL: 'Muse@Test.fr',
  MUSE_PASSWORD: 'muse-pwd',
}

describe('resolveLogin — admin principal', () => {
  it('connecte en admin avec le mot de passe admin, sans email', () => {
    expect(resolveLogin('', 'admin-pwd', env)).toEqual({ sub: 'admin', role: 'admin' })
  })

  it('connecte en admin avec le mot de passe admin, quel que soit l\'email', () => {
    expect(resolveLogin('autre@test.fr', 'admin-pwd', env)).toEqual({ sub: 'admin', role: 'admin' })
  })
})

describe('resolveLogin — compte Muse', () => {
  it('connecte Muse en admin avec son email et son mot de passe', () => {
    expect(resolveLogin('muse@test.fr', 'muse-pwd', env)).toEqual({ sub: 'muse', role: 'admin' })
  })

  it('refuse le mot de passe Muse sans email', () => {
    expect(resolveLogin('', 'muse-pwd', env)).toBeNull()
  })

  it('refuse le mot de passe Muse avec un autre email', () => {
    expect(resolveLogin('viewer@test.fr', 'muse-pwd', env)).toBeNull()
  })

  it('refuse l\'email Muse avec un mauvais mot de passe', () => {
    expect(resolveLogin('muse@test.fr', 'wrong', env)).toBeNull()
  })

  it('compte Muse désactivé si MUSE_PASSWORD est vide', () => {
    expect(resolveLogin('muse@test.fr', '', { ...env, MUSE_PASSWORD: '' })).toBeNull()
  })

  it('compte Muse désactivé si MUSE_EMAIL est absent', () => {
    expect(resolveLogin('', 'muse-pwd', { ...env, MUSE_EMAIL: undefined })).toBeNull()
  })
})

describe('resolveLogin — viewer', () => {
  it('connecte le viewer avec son email et son mot de passe', () => {
    expect(resolveLogin('viewer@test.fr', 'viewer-pwd', env)).toEqual({ sub: 'viewer@test.fr', role: 'viewer' })
  })

  it('refuse le mot de passe viewer sans email', () => {
    expect(resolveLogin('', 'viewer-pwd', env)).toBeNull()
  })
})

describe('resolveLogin — échecs', () => {
  it('refuse un mot de passe inconnu', () => {
    expect(resolveLogin('', 'nope', env)).toBeNull()
  })
})
