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

describe('CandidateActions — alertes (warnings) après acceptation', () => {
  it('déclenche bien updateApplicationStatusAction("accepted") au clic sur Choisir', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationStatus.mockResolvedValue({ ok: true })

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
    expect(screen.queryByText(/échoué/)).not.toBeInTheDocument()
  })

  it('affiche la bannière d\'alerte dans le statut "accepted" si des warnings ont été renvoyées au clic', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationStatus.mockResolvedValue({
      ok: true,
      warnings: ['IRL potentiellement obsolète : bail généré avec le 4e trimestre 2025, alors que le 2e trimestre 2026 devrait déjà être publié.'],
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

  it('affiche une bannière par warning quand plusieurs actions best-effort échouent (ex. bug D\'Almeida : bail + webhook + Gmail)', async () => {
    const user = userEvent.setup()
    mockUpdateApplicationStatus.mockResolvedValue({
      ok: true,
      warnings: [
        'Génération du bail échouée : Invalid Value',
        'Webhook Make.com échoué : Make.com a répondu 500',
      ],
    })

    const { rerender } = render(<CandidateActions {...defaultProps} currentStatus="pending" />)
    await user.click(screen.getByLabelText('Revenus vérifiés'))
    await user.click(screen.getByRole('button', { name: 'Choisir' }))
    await waitFor(() => expect(mockUpdateApplicationStatus).toHaveBeenCalled())
    rerender(<CandidateActions {...defaultProps} currentStatus="accepted" />)

    expect(await screen.findByText(/Génération du bail échouée/)).toBeInTheDocument()
    expect(screen.getByText(/Webhook Make\.com échoué/)).toBeInTheDocument()
  })
})

describe('CandidateActions — signature du bail', () => {
  it('affiche les warnings de signLeaseAction (ex. échec déplacement dossier Drive) après signature', async () => {
    const user = userEvent.setup()
    mockSignLease.mockResolvedValue({
      ok: true,
      warnings: ["Déplacement du dossier Drive échoué : Invalid Value"],
    })

    render(<CandidateActions {...defaultProps} currentStatus="accepted" />)
    await user.click(screen.getByRole('button', { name: 'Bail signé' }))

    expect(await screen.findByText(/Déplacement du dossier Drive échoué/)).toBeInTheDocument()
    expect(screen.getByText('Bail signé — locataire créé')).toBeInTheDocument()
  })

  it('affiche le message d\'erreur si signLeaseAction échoue', async () => {
    const user = userEvent.setup()
    mockSignLease.mockResolvedValue({ ok: false, error: 'Candidature introuvable' })

    render(<CandidateActions {...defaultProps} currentStatus="accepted" />)
    await user.click(screen.getByRole('button', { name: 'Bail signé' }))

    expect(await screen.findByText('Candidature introuvable')).toBeInTheDocument()
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
