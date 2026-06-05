import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_INVENTORY, DEFAULT_EDL, DEFAULT_INVENTORY_NAMED } from '@/app/admin/inventory/defaultData'

vi.mock('@/lib/supabaseAdmin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabaseAdmin'
import { fillDefaultAction } from '@/app/admin/inventory/defaultActions'

type MockOptions = {
  existingItemsByName?: Record<string, string>
  invBulkError?: { message: string } | null
  invSingleError?: { message: string } | null
  surfError?: { message: string } | null
  createItemError?: { message: string } | null
}

function makeAdminMock({
  existingItemsByName = {},
  invBulkError = null,
  invSingleError = null,
  surfError = null,
  createItemError = null,
}: MockOptions = {}) {
  const insertInventory = vi.fn().mockImplementation((rows: unknown) =>
    Promise.resolve({ error: Array.isArray(rows) ? invBulkError : invSingleError })
  )
  const insertSurfaces = vi.fn().mockResolvedValue({ error: surfError })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'items') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((_col: string, name: string) => ({
            limit: vi.fn().mockResolvedValue({
              data: existingItemsByName[name] ? [{ id: existingItemsByName[name] }] : [],
              error: null,
            }),
          })),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createItemError ? null : { id: 'created-item-id' },
              error: createItemError ?? null,
            }),
          }),
        }),
      }
    }
    if (table === 'inventory') return { insert: insertInventory }
    if (table === 'surfaces') return { insert: insertSurfaces }
    return {}
  })

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

  it('retourne ok:false si l\'insert inventaire en bloc échoue', async () => {
    makeAdminMock({ invBulkError: { message: 'FK violation' } })

    const result = await fillDefaultAction('apt-42')

    expect(result).toEqual({ ok: false, error: 'FK violation' })
  })

  it('retourne ok:false si l\'insert surfaces échoue', async () => {
    makeAdminMock({ surfError: { message: 'Enum invalide' } })

    const result = await fillDefaultAction('apt-42')

    expect(result).toEqual({ ok: false, error: 'Enum invalide' })
  })

  it('inclut tous les items du DEFAULT_INVENTORY dans l\'insert en bloc', async () => {
    const { insertInventory } = makeAdminMock()

    await fillDefaultAction('apt-99')

    const bulkCall = insertInventory.mock.calls.find(([rows]) => Array.isArray(rows))
    expect(bulkCall).toBeDefined()
    const [rows] = bulkCall!
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

describe('fillDefaultAction — items nommés (find-or-create)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('utilise l\'id existant si l\'item est trouvé dans le catalogue', async () => {
    const { insertInventory } = makeAdminMock({
      existingItemsByName: {
        Saladier: 'uuid-saladier',
        Passoire: 'uuid-passoire',
        'Porte-serviette': 'uuid-porte-serviette',
      },
    })

    const result = await fillDefaultAction('apt-1')

    expect(result).toEqual({ ok: true })
    const singleCalls = insertInventory.mock.calls.filter(([rows]) => !Array.isArray(rows))
    expect(singleCalls).toHaveLength(DEFAULT_INVENTORY_NAMED.length)
    expect(singleCalls.map(([row]) => row.item_id)).toEqual(
      expect.arrayContaining(['uuid-saladier', 'uuid-passoire', 'uuid-porte-serviette'])
    )
  })

  it('crée l\'item dans le catalogue si absent et utilise le nouvel id', async () => {
    const { from, insertInventory } = makeAdminMock()

    const result = await fillDefaultAction('apt-1')

    expect(result).toEqual({ ok: true })
    // L'insert items doit avoir été appelé pour chaque item manquant
    const itemsInsertCalls = (from.mock.results as { value: { insert: ReturnType<typeof vi.fn> } }[])
      .filter(r => r.value?.insert)
    expect(itemsInsertCalls.length).toBeGreaterThan(0)
    // Les inserts inventory simples utilisent l'id créé
    const singleCalls = insertInventory.mock.calls.filter(([rows]) => !Array.isArray(rows))
    expect(singleCalls).toHaveLength(DEFAULT_INVENTORY_NAMED.length)
    for (const [row] of singleCalls) {
      expect(row.item_id).toBe('created-item-id')
    }
  })

  it('retourne ok:false si la création d\'un item échoue', async () => {
    makeAdminMock({ createItemError: { message: 'Erreur création' } })

    const result = await fillDefaultAction('apt-1')

    expect(result).toEqual({ ok: false, error: 'Erreur création' })
  })

  it('retourne ok:false si l\'insert inventory d\'un item nommé échoue', async () => {
    makeAdminMock({
      existingItemsByName: {
        Saladier: 'uuid-s',
        Passoire: 'uuid-p',
        'Porte-serviette': 'uuid-ps',
      },
      invSingleError: { message: 'Erreur insert nommé' },
    })

    const result = await fillDefaultAction('apt-1')

    expect(result).toEqual({ ok: false, error: 'Erreur insert nommé' })
  })

  it('insère bien Saladier, Passoire et Porte-serviette dans l\'inventaire', async () => {
    const { insertInventory } = makeAdminMock({
      existingItemsByName: {
        Saladier: 'uuid-s',
        Passoire: 'uuid-p',
        'Porte-serviette': 'uuid-ps',
      },
    })

    await fillDefaultAction('apt-1')

    const singleCalls = insertInventory.mock.calls.filter(([rows]) => !Array.isArray(rows))
    const rooms = singleCalls.map(([row]) => row.room)
    expect(rooms.filter(r => r === 'Cuisine')).toHaveLength(2)
    expect(rooms.filter(r => r === 'Salle de bains')).toHaveLength(1)
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

  it('DEFAULT_INVENTORY_NAMED contient Saladier, Passoire et Porte-serviette', () => {
    const names = DEFAULT_INVENTORY_NAMED.map(i => i.item_name)
    expect(names).toContain('Saladier')
    expect(names).toContain('Passoire')
    expect(names).toContain('Porte-serviette')
  })

  it('DEFAULT_INVENTORY_NAMED ne contient que des conditions valides', () => {
    const valid = ['Neuf', 'Bon état', "État d'usage", 'Mauvais état']
    for (const row of DEFAULT_INVENTORY_NAMED) {
      expect(valid).toContain(row.condition)
    }
  })
})
