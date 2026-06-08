import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisitsTable from '@/app/admin/mise-en-location/VisitsTable'
import type { LettingVisit } from '@/lib/adminData'

const mockDeleteVisit = vi.fn()

vi.mock('@/app/admin/mise-en-location/visitsActions', () => ({
  deleteVisitAction: (...args: unknown[]) => mockDeleteVisit(...args),
}))

const visits: LettingVisit[] = [
  {
    id: 'v1', last_name: 'dupont', first_name: 'Alice', email: 'alice@mail.fr', phone: '0601020304',
    visit_date: '2026-07-01', visit_time: '10:00:00', status: 'pending', created_at: '2026-06-01',
    apartment_numbers: '7',
  },
  {
    id: 'v2', last_name: 'martin', first_name: 'Bob', email: 'bob@mail.fr', phone: null,
    visit_date: '2026-07-02', visit_time: '11:00:00', status: 'confirmed', created_at: '2026-06-02',
    apartment_numbers: '3, 5',
  },
]

beforeEach(() => {
  mockDeleteVisit.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('VisitsTable — affichage', () => {
  it('affiche un message si aucune visite', () => {
    render(<VisitsTable visits={[]} />)
    expect(screen.getByText('Aucune visite.')).toBeInTheDocument()
  })

  it('affiche un bouton de suppression pour chaque visite', () => {
    render(<VisitsTable visits={visits} />)
    expect(screen.getAllByTitle('Supprimer la visite')).toHaveLength(2)
  })
})

describe('VisitsTable — pagination', () => {
  const manyVisits: LettingVisit[] = Array.from({ length: 7 }, (_, i) => ({
    id: `v${i}`, last_name: `nom${i}`, first_name: `Prénom${i}`, email: `p${i}@mail.fr`, phone: null,
    visit_date: `2026-07-0${i + 1}`, visit_time: '10:00:00', status: 'pending', created_at: '2026-06-01',
    apartment_numbers: '7',
  }))

  it('affiche la pagination et navigue entre les pages au-delà de 5 visites', async () => {
    const user = userEvent.setup()
    render(<VisitsTable visits={manyVisits} />)

    expect(screen.getByText('1–5 sur 7')).toBeInTheDocument()
    expect(screen.getByText('Prénom0 NOM0')).toBeInTheDocument()
    expect(screen.queryByText('Prénom6 NOM6')).not.toBeInTheDocument()

    const prevButton = screen.getByRole('button', { name: '‹ Précédent' })
    const nextButton = screen.getByRole('button', { name: 'Suivant ›' })
    expect(prevButton).toBeDisabled()

    await user.click(nextButton)
    expect(screen.getByText('6–7 sur 7')).toBeInTheDocument()
    expect(screen.getByText('Prénom6 NOM6')).toBeInTheDocument()
    expect(nextButton).toBeDisabled()

    await user.click(prevButton)
    expect(screen.getByText('1–5 sur 7')).toBeInTheDocument()
  })
})

describe('VisitsTable — suppression', () => {
  it('demande confirmation avant de supprimer', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockDeleteVisit.mockResolvedValue({ ok: true })
    render(<VisitsTable visits={visits} />)

    await user.click(screen.getAllByTitle('Supprimer la visite')[0])

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Alice DUPONT'))
  })

  it("n'appelle pas l'action de suppression si l'utilisateur annule la confirmation", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<VisitsTable visits={visits} />)

    await user.click(screen.getAllByTitle('Supprimer la visite')[0])

    expect(mockDeleteVisit).not.toHaveBeenCalled()
    expect(screen.getByText('Alice DUPONT')).toBeInTheDocument()
  })

  it('supprime la visite de la liste après confirmation et succès', async () => {
    const user = userEvent.setup()
    mockDeleteVisit.mockResolvedValue({ ok: true })
    render(<VisitsTable visits={visits} />)

    await user.click(screen.getAllByTitle('Supprimer la visite')[0])

    expect(mockDeleteVisit).toHaveBeenCalledWith('v1')
    await waitFor(() => expect(screen.queryByText('Alice DUPONT')).not.toBeInTheDocument())
    expect(screen.getByText('Bob MARTIN')).toBeInTheDocument()
  })

  it("affiche un message d'erreur et conserve la visite si la suppression échoue", async () => {
    const user = userEvent.setup()
    mockDeleteVisit.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    render(<VisitsTable visits={visits} />)

    await user.click(screen.getAllByTitle('Supprimer la visite')[0])

    await waitFor(() => expect(screen.getByText('Erreur serveur')).toBeInTheDocument())
    expect(screen.getByText('Alice DUPONT')).toBeInTheDocument()
  })

  it('affiche "Aucune visite." une fois la dernière visite supprimée', async () => {
    const user = userEvent.setup()
    mockDeleteVisit.mockResolvedValue({ ok: true })
    render(<VisitsTable visits={[visits[0]]} />)

    await user.click(screen.getByTitle('Supprimer la visite'))

    await waitFor(() => expect(screen.getByText('Aucune visite.')).toBeInTheDocument())
  })
})
