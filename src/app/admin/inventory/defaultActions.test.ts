import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_INVENTORY, DEFAULT_EDL } from '@/app/admin/inventory/defaultData'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import { fillDefaultAction } from '@/app/admin/inventory/defaultActions'

function makeAdminMock(invError: unknown = null, surfError: unknown = null) {
  const insertInventory = vi.fn().mockResolvedValue({ error: invError })
  const insertSurfaces = vi.fn().mockResolvedValue({ error: surfError })

  const from = vi.fn().mockImplementation((table: string) => ({
    insert: table === 'inventory' ? insertInventory : insertSurfaces,
  }))

  vi.mocked(createAdminClient).mockReturnValue({ from } as ReturnType<typeof createAdminClient>)
  return { from, insertInventory, insertSurfaces }
}

describe('fillDefaultAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('insère les lignes inventaire et surfaces, retourne ok:true', async () => {
    const { insertInventory, insertSurfaces } = makeAdminMock()

    const result = await fillDefaultAction('apt-42')

    expect(result).toEqual({ ok: true })
    expect(insertInventory).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ apartment_id: 'apt-42', item_id: expect.any(String) }),
      ])
    )
    expect(insertSurfaces).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ apartment_id: 'apt-42', surface: expect.any(String) }),
      ])
    )
  })

  it('retourne ok:false si l\'insert inventaire échoue', async () => {
    makeAdminMock({ message: 'FK violation' }, null)

    const result = await fillDefaultAction('apt-42')

    expect(result).toEqual({ ok: false, error: 'FK violation' })
  })

  it('retourne ok:false si l\'insert surfaces échoue', async () => {
    makeAdminMock(null, { message: 'Enum invalide' })

    const result = await fillDefaultAction('apt-42')

    expect(result).toEqual({ ok: false, error: 'Enum invalide' })
  })

  it('inclut tous les items du DEFAULT_INVENTORY dans l\'insert', async () => {
    const { insertInventory } = makeAdminMock()

    await fillDefaultAction('apt-99')

    const [rows] = insertInventory.mock.calls[0]
    expect(rows).toHaveLength(DEFAULT_INVENTORY.length)
    for (const row of rows) {
      expect(row.apartment_id).toBe('apt-99')
      expect(row.notes).toBeNull()
    }
  })

  it('inclut toutes les surfaces du DEFAULT_EDL dans l\'insert', async () => {
    const { insertSurfaces } = makeAdminMock()

    await fillDefaultAction('apt-99')

    const [rows] = insertSurfaces.mock.calls[0]
    expect(rows).toHaveLength(DEFAULT_EDL.length)
    for (const row of rows) {
      expect(row.apartment_id).toBe('apt-99')
      expect(row.notes).toBeNull()
    }
  })
})

describe('données par défaut', () => {
  it('DEFAULT_INVENTORY contient uniquement des UUIDs valides', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    for (const row of DEFAULT_INVENTORY) {
      expect(row.item_id).toMatch(uuidRegex)
    }
  })

  it('DEFAULT_INVENTORY ne contient que des conditions valides', () => {
    const valid = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état']
    for (const row of DEFAULT_INVENTORY) {
      expect(valid).toContain(row.condition)
    }
  })

  it('DEFAULT_EDL ne contient que des conditions valides', () => {
    const valid = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état']
    for (const row of DEFAULT_EDL) {
      expect(valid).toContain(row.condition)
    }
  })
})
