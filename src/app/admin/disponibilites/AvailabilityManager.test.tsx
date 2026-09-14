import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AvailabilityManager from '@/app/admin/disponibilites/AvailabilityManager'
import type { VisitSettings, VisitAvailabilityRule, VisitAvailabilityException } from '@/lib/adminData'

const mockSetVisitActive = vi.fn()
const mockSetCandidatureActive = vi.fn()
const mockSetSlotDuration = vi.fn()
const mockAddRule = vi.fn()
const mockDeleteRule = vi.fn()
const mockAddException = vi.fn()
const mockDeleteException = vi.fn()
const mockUpdateContact = vi.fn()

vi.mock('@/app/admin/disponibilites/actions', () => ({
  setVisitActiveAction: (...args: unknown[]) => mockSetVisitActive(...args),
  setCandidatureActiveAction: (...args: unknown[]) => mockSetCandidatureActive(...args),
  setSlotDurationAction: (...args: unknown[]) => mockSetSlotDuration(...args),
  addRuleAction: (...args: unknown[]) => mockAddRule(...args),
  deleteRuleAction: (...args: unknown[]) => mockDeleteRule(...args),
  addExceptionAction: (...args: unknown[]) => mockAddException(...args),
  deleteExceptionAction: (...args: unknown[]) => mockDeleteException(...args),
  updateContactAction: (...args: unknown[]) => mockUpdateContact(...args),
}))

const settings: VisitSettings = {
  id: 'settings-1',
  active: true,
  applications_active: false,
  slot_duration_minutes: 30,
  contact_name: 'Clémentine Blanchon',
  contact_phone: '06 28 07 67 29',
  contact_email: 'location.moulinet@gmail.com',
  contact_website: null,
}

const rules: VisitAvailabilityRule[] = [
  { id: 'r1', day_of_week: 0, start_time: '09:00:00', end_time: '12:00:00' },
]

const exceptions: VisitAvailabilityException[] = [
  { id: 'e1', date: '2026-12-25', label: 'Noël', start_time: null, end_time: null },
]

beforeEach(() => {
  mockSetVisitActive.mockReset()
  mockSetCandidatureActive.mockReset()
  mockSetSlotDuration.mockReset()
  mockAddRule.mockReset()
  mockDeleteRule.mockReset()
  mockAddException.mockReset()
  mockDeleteException.mockReset()
  mockUpdateContact.mockReset()
})

describe('AvailabilityManager — paramètres généraux', () => {
  it('affiche l\'état actif des visites et candidatures', () => {
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)
    expect(screen.getByText('Les visiteurs peuvent prendre rendez-vous.')).toBeInTheDocument()
    expect(screen.getByText('Le dépôt de dossier est suspendu.')).toBeInTheDocument()
  })

  it('appelle setVisitActiveAction au clic sur le toggle des visites', async () => {
    const user = userEvent.setup()
    mockSetVisitActive.mockResolvedValue({ ok: true })
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)

    const toggles = screen.getAllByRole('button').filter(b => b.className.includes('rounded-full') && b.className.includes('h-6'))
    await user.click(toggles[0])

    await waitFor(() => expect(mockSetVisitActive).toHaveBeenCalledWith(false))
  })

  it('change la durée de créneau via le select', async () => {
    const user = userEvent.setup()
    mockSetSlotDuration.mockResolvedValue({ ok: true })
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)

    await user.selectOptions(screen.getByRole('combobox'), '45')

    await waitFor(() => expect(mockSetSlotDuration).toHaveBeenCalledWith(45))
  })
})

describe('AvailabilityManager — plages hebdomadaires', () => {
  it('affiche les plages existantes et "Indisponible" pour les jours sans plage', () => {
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)
    expect(screen.getByText('09:00 — 12:00')).toBeInTheDocument()
    expect(screen.getAllByText('Indisponible').length).toBeGreaterThan(0)
  })

  it('supprime une plage au clic sur ×', async () => {
    const user = userEvent.setup()
    mockDeleteRule.mockResolvedValue(undefined)
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)

    await user.click(screen.getAllByText('×')[0])

    await waitFor(() => expect(mockDeleteRule).toHaveBeenCalledWith('r1'))
  })
})

describe('AvailabilityManager — exceptions', () => {
  it('affiche les exceptions existantes', () => {
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)
    expect(screen.getByText('Noël')).toBeInTheDocument()
  })

  it("n'affiche aucune exception quand la liste est vide", () => {
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={[]} />)
    expect(screen.getByText('Aucune exception configurée.')).toBeInTheDocument()
  })
})

describe('AvailabilityManager — contact', () => {
  it('pré-remplit les champs de contact', () => {
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)
    expect(screen.getByDisplayValue('Clémentine Blanchon')).toBeInTheDocument()
    expect(screen.getByDisplayValue('location.moulinet@gmail.com')).toBeInTheDocument()
  })

  it('enregistre le contact et affiche "Sauvegardé"', async () => {
    const user = userEvent.setup()
    mockUpdateContact.mockResolvedValue({ ok: true })
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Sauvegardé')).toBeInTheDocument()
    expect(mockUpdateContact).toHaveBeenCalledWith({
      contact_name: 'Clémentine Blanchon',
      contact_phone: '06 28 07 67 29',
      contact_email: 'location.moulinet@gmail.com',
      contact_website: '',
    })
  })

  it("affiche un message d'erreur si l'enregistrement échoue", async () => {
    const user = userEvent.setup()
    mockUpdateContact.mockResolvedValue({ ok: false, error: 'Erreur réseau' })
    render(<AvailabilityManager settings={settings} rules={rules} exceptions={exceptions} />)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Erreur réseau')).toBeInTheDocument()
  })
})
