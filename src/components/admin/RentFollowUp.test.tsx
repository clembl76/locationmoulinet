import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RentFollowUp from '@/components/admin/RentFollowUp'

const mockSetRentWrittenOffAction = vi.fn()
const mockUpdateRentNotesAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  setRentWrittenOffAction: (...args: unknown[]) => mockSetRentWrittenOffAction(...args),
  updateRentNotesAction: (...args: unknown[]) => mockUpdateRentNotesAction(...args),
}))

const defaultProps = {
  rentId: 'rent-1',
  aptNumber: '21',
  initialNotes: null,
  initialWrittenOffAt: null,
  unpaid: true,
}

beforeEach(() => {
  mockSetRentWrittenOffAction.mockReset()
  mockUpdateRentNotesAction.mockReset()
})

describe('RentFollowUp — irrécouvrable', () => {
  it('propose le passage en irrécouvrable pour un loyer impayé', () => {
    render(<RentFollowUp {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Passer en irrécouvrable' })).toBeInTheDocument()
  })

  it('ne le propose pas pour un loyer encaissé', () => {
    render(<RentFollowUp {...defaultProps} unpaid={false} />)
    expect(screen.queryByRole('button', { name: 'Passer en irrécouvrable' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Commentaire')).toBeInTheDocument()
  })

  it("demande confirmation avant d'appeler l'action", async () => {
    const user = userEvent.setup()
    render(<RentFollowUp {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Passer en irrécouvrable' }))

    expect(mockSetRentWrittenOffAction).not.toHaveBeenCalled()
    expect(screen.getByText(/ne sera jamais encaissé/)).toBeInTheDocument()
  })

  it('« Retour » referme la confirmation sans rien changer', async () => {
    const user = userEvent.setup()
    render(<RentFollowUp {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Passer en irrécouvrable' }))
    await user.click(screen.getByRole('button', { name: 'Retour' }))

    expect(mockSetRentWrittenOffAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Passer en irrécouvrable' })).toBeInTheDocument()
  })

  it('passe le loyer en irrécouvrable après confirmation et affiche la date', async () => {
    const user = userEvent.setup()
    mockSetRentWrittenOffAction.mockResolvedValue({ ok: true, writtenOffAt: '2026-10-08' })
    render(<RentFollowUp {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Passer en irrécouvrable' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    await waitFor(() => expect(mockSetRentWrittenOffAction).toHaveBeenCalledWith('rent-1', '21', true))
    expect(await screen.findByText('Irrécouvrable depuis le 08/10/2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Passer en irrécouvrable' })).not.toBeInTheDocument()
  })

  it("affiche l'erreur et laisse le loyer inchangé si l'action échoue", async () => {
    const user = userEvent.setup()
    mockSetRentWrittenOffAction.mockResolvedValue({ ok: false, error: 'Loyer introuvable ou déjà encaissé' })
    render(<RentFollowUp {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Passer en irrécouvrable' }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByText('Loyer introuvable ou déjà encaissé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passer en irrécouvrable' })).toBeInTheDocument()
  })

  it("affiche un loyer déjà irrécouvrable et permet d'annuler", async () => {
    const user = userEvent.setup()
    mockSetRentWrittenOffAction.mockResolvedValue({ ok: true, writtenOffAt: null })
    render(<RentFollowUp {...defaultProps} initialWrittenOffAt="2026-10-08" />)

    expect(screen.getByText('Irrécouvrable depuis le 08/10/2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(mockSetRentWrittenOffAction).toHaveBeenCalledWith('rent-1', '21', false))
    expect(await screen.findByRole('button', { name: 'Passer en irrécouvrable' })).toBeInTheDocument()
  })
})

describe('RentFollowUp — commentaire', () => {
  it('affiche le commentaire existant, bouton désactivé tant que rien ne change', () => {
    render(<RentFollowUp {...defaultProps} initialNotes="Espèces" />)
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Espèces')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('enregistre le commentaire saisi et le confirme', async () => {
    const user = userEvent.setup()
    mockUpdateRentNotesAction.mockResolvedValue({ ok: true })
    render(<RentFollowUp {...defaultProps} />)

    await user.type(screen.getByLabelText('Commentaire'), 'Payé en deux fois ')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(mockUpdateRentNotesAction).toHaveBeenCalledWith('rent-1', '21', 'Payé en deux fois '))
    expect(await screen.findByText('✓ Enregistré')).toBeInTheDocument()
    expect(screen.getByLabelText('Commentaire')).toHaveValue('Payé en deux fois')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it("permet d'effacer un commentaire", async () => {
    const user = userEvent.setup()
    mockUpdateRentNotesAction.mockResolvedValue({ ok: true })
    render(<RentFollowUp {...defaultProps} initialNotes="Espèces" />)

    await user.clear(screen.getByLabelText('Commentaire'))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(mockUpdateRentNotesAction).toHaveBeenCalledWith('rent-1', '21', ''))
  })

  it("affiche l'erreur si l'enregistrement échoue, sans confirmer", async () => {
    const user = userEvent.setup()
    mockUpdateRentNotesAction.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<RentFollowUp {...defaultProps} />)

    await user.type(screen.getByLabelText('Commentaire'), 'test')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Erreur DB')).toBeInTheDocument()
    expect(screen.queryByText('✓ Enregistré')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled()
  })
})
