import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateActions from '@/app/admin/mise-en-location/candidats/[id]/CandidateActions'

const mockUpdateApplicationStatus = vi.fn()
const mockSignLease = vi.fn()

vi.mock('@/app/admin/mise-en-location/candidats/[id]/actions', () => ({
  updateApplicationStatusAction: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
  signLeaseAction: (...args: unknown[]) => mockSignLease(...args),
}))

const defaultProps = {
  applicationId: 'app-1',
  visitorId: null,
  aptNumber: '7',
  desiredSigningDate: '2026-08-01',
  rentCC: 500,
  candidate: {
    title: null,
    firstName: 'Jean',
    lastName: 'Dupont',
    email: null,
    phone: null,
    birthDate: null,
    birthPlace: null,
    address: null,
    familyStatus: null,
  },
  guarantor: null,
}

beforeEach(() => {
  mockUpdateApplicationStatus.mockReset()
  mockSignLease.mockReset()
})

describe('CandidateActions — statut "pending"', () => {
  it('active Rejeter/Choisir uniquement après avoir coché "Revenus vérifiés"', async () => {
    const user = userEvent.setup()
    render(<CandidateActions {...defaultProps} currentStatus="pending" />)

    expect(screen.getByRole('button', { name: 'Choisir' })).toBeDisabled()
    await user.click(screen.getByLabelText('Revenus vérifiés'))
    expect(screen.getByRole('button', { name: 'Choisir' })).toBeEnabled()
  })
})

describe('CandidateActions — alerte IRL après acceptation', () => {
  it('affiche l\'irlWarning renvoyé par le serveur quand le candidat est accepté', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationStatus.mockResolvedValue({
      ok: true,
      irlWarning: 'IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025...',
    })

    render(<CandidateActions {...defaultProps} currentStatus="pending" />)
    await user.click(screen.getByLabelText('Revenus vérifiés'))
    await user.click(screen.getByRole('button', { name: 'Choisir' }))

    await waitFor(() => {
      expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('app-1', 'accepted', null)
    })
  })

  it('n\'affiche aucune alerte quand le statut est déjà "accepted" et qu\'aucune action n\'a été faite', () => {
    render(<CandidateActions {...defaultProps} currentStatus="accepted" />)
    expect(screen.getByText('Candidat retenu')).toBeInTheDocument()
    expect(screen.queryByText(/IRL potentiellement obsolète/)).not.toBeInTheDocument()
  })

  it('affiche la bannière d\'alerte dans le statut "accepted" si une irlWarning a été renvoyée au clic', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationStatus.mockResolvedValue({
      ok: true,
      irlWarning: 'IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025, alors que le 2e trimestre 2026 devrait déjà être publié.',
    })

    // On simule un composant déjà dans l'état "pending" qui bascule vers "accepted"
    // en repassant currentStatus="accepted" après l'appel, comme le ferait le re-render
    // déclenché par revalidatePath côté serveur.
    const { rerender } = render(<CandidateActions {...defaultProps} currentStatus="pending" />)
    await user.click(screen.getByLabelText('Revenus vérifiés'))
    await user.click(screen.getByRole('button', { name: 'Choisir' }))
    await waitFor(() => expect(mockUpdateApplicationStatus).toHaveBeenCalled())

    rerender(<CandidateActions {...defaultProps} currentStatus="accepted" />)

    expect(await screen.findByText(/IRL potentiellement obsolète/)).toBeInTheDocument()
  })
})

describe('CandidateActions — statuts terminaux', () => {
  it('affiche "Bail signé" et masque les actions quand currentStatus est "signed"', () => {
    render(<CandidateActions {...defaultProps} currentStatus="signed" />)
    expect(screen.getByText('Bail signé — locataire créé')).toBeInTheDocument()
  })

  it('affiche "Candidat rejeté" sans actions quand currentStatus est "rejected"', () => {
    render(<CandidateActions {...defaultProps} currentStatus="rejected" />)
    expect(screen.getByText('Candidat rejeté')).toBeInTheDocument()
  })

  it('affiche "Plus intéressé" sans actions quand currentStatus est "withdrawn"', () => {
    render(<CandidateActions {...defaultProps} currentStatus="withdrawn" />)
    expect(screen.getByText('Plus intéressé')).toBeInTheDocument()
  })
})
