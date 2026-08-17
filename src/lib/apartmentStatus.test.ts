// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getApartmentStatus, statusSortOrder } from '@/lib/apartmentStatus'

describe('getApartmentStatus', () => {
  it('aucun bail : disponible', () => {
    const { status, availableFrom } = getApartmentStatus([])
    expect(status).toBe('available')
    expect(availableFrom).toBeNull()
  })

  it('bail actif sans date de sortie : loué', () => {
    const { status, availableFrom } = getApartmentStatus([{ move_out_inspection_date: null }])
    expect(status).toBe('rented')
    expect(availableFrom).toBeNull()
  })

  it('bail avec date de sortie future : statut "soon"', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`

    const { status, availableFrom } = getApartmentStatus([{ move_out_inspection_date: iso }])

    expect(status).toBe('soon')
    expect(availableFrom).not.toBeNull()
  })

  it('date de sortie future : le jour affiché correspond exactement à la date de sortie + 1, sans décalage', () => {
    // Cas concret du bug signalé : une date de sortie ne doit jamais afficher la veille (décalage timezone).
    // Date calculée par rapport à aujourd'hui (plutôt que codée en dur) pour rester valable dans le temps.
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`

    const { availableFrom } = getApartmentStatus([{ move_out_inspection_date: iso }])
    expect(availableFrom).not.toBeNull()

    const expectedNextDay = new Date(future.getFullYear(), future.getMonth(), future.getDate() + 1)
    expect(availableFrom!.getFullYear()).toBe(expectedNextDay.getFullYear())
    expect(availableFrom!.getMonth()).toBe(expectedNextDay.getMonth())
    expect(availableFrom!.getDate()).toBe(expectedNextDay.getDate())
  })

  it('bail avec date de sortie passée (aucune date future) : disponible', () => {
    const { status, availableFrom } = getApartmentStatus([{ move_out_inspection_date: '2020-01-01' }])
    expect(status).toBe('available')
    expect(availableFrom).toBeNull()
  })

  it('plusieurs baux : un actif sans sortie prime sur les baux passés', () => {
    const { status } = getApartmentStatus([
      { move_out_inspection_date: '2020-01-01' },
      { move_out_inspection_date: null },
    ])
    expect(status).toBe('rented')
  })

  it('plusieurs baux avec sorties futures : retient la plus proche', () => {
    const { availableFrom } = getApartmentStatus([
      { move_out_inspection_date: '2026-12-25' },
      { move_out_inspection_date: '2026-09-10' },
    ])
    expect(availableFrom!.getMonth()).toBe(8) // septembre = index 8
    expect(availableFrom!.getDate()).toBe(11)
  })
})

describe('statusSortOrder', () => {
  it('ordonne available < soon < rented', () => {
    expect(statusSortOrder('available')).toBeLessThan(statusSortOrder('soon'))
    expect(statusSortOrder('soon')).toBeLessThan(statusSortOrder('rented'))
  })
})
