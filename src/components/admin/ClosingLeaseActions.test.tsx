import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClosingLeaseActions from '@/components/admin/ClosingLeaseActions'

const mockUpdateEdlSigned = vi.fn()
const mockUpdateDepositReturned = vi.fn()
const mockArchiveLease = vi.fn()
const mockRouterPush = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateEdlSignedAction: (...args: unknown[]) => mockUpdateEdlSigned(...args),
  updateDepositReturnedAction: (...args: unknown[]) => mockUpdateDepositReturned(...args),
  archiveLeaseAction: (...args: unknown[]) => mockArchiveLease(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  initialEdlSigned: false,
  initialDepositReturned: false,
}

beforeEach(() => {
  mockUpdateEdlSigned.mockReset()
  mockUpdateDepositReturned.mockReset()
  mockArchiveLease.mockReset()
  mockRouterPush.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('ClosingLeaseActions — affichage', () => {
  it('affiche les deux cases à cocher et le bouton Archiver', () => {
    render(<ClosingLeaseActions {...defaultProps} />)
    expect(screen.getByLabelText('EDL signé')).toBeInTheDocument()
    expect(screen.getByLabelText('Caution restituée')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeInTheDocument()
  })

  it('initialise les cases à décoché par défaut', () => {
    render(<ClosingLeaseActions {...defaultProps} />)
    expect(screen.getByLabelText('EDL signé')).not.toBeChecked()
    expect(screen.getByLabelText('Caution restituée')).not.toBeChecked()
  })

  it('initialise les cases cochées si les valeurs initiales sont true', () => {
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)
    expect(screen.getByLabelText('EDL signé')).toBeChecked()
    expect(screen.getByLabelText('Caution restituée')).toBeChecked()
  })
})

describe('ClosingLeaseActions — EDL signé', () => {
  it('coche la case et appelle updateEdlSignedAction avec true', async () => {
    const user = userEvent.setup()
    mockUpdateEdlSigned.mockResolvedValue({ ok: true })
    render(<ClosingLeaseActions {...defaultProps} />)

    await user.click(screen.getByLabelText('EDL signé'))

    expect(screen.getByLabelText('EDL signé')).toBeChecked()
    await waitFor(() => expect(mockUpdateEdlSigned).toHaveBeenCalledWith('lease-123', '7', true))
  })

  it('revient à l\'état précédent si l\'action échoue', async () => {
    const user = userEvent.setup()
    mockUpdateEdlSigned.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<ClosingLeaseActions {...defaultProps} />)

    await user.click(screen.getByLabelText('EDL signé'))

    await waitFor(() => expect(screen.getByLabelText('EDL signé')).not.toBeChecked())
  })
})

describe('ClosingLeaseActions — Caution restituée', () => {
  it('coche la case et appelle updateDepositReturnedAction avec true', async () => {
    const user = userEvent.setup()
    mockUpdateDepositReturned.mockResolvedValue({ ok: true })
    render(<ClosingLeaseActions {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution restituée'))

    expect(screen.getByLabelText('Caution restituée')).toBeChecked()
    await waitFor(() => expect(mockUpdateDepositReturned).toHaveBeenCalledWith('lease-123', '7', true))
  })

  it('revient à l\'état précédent si l\'action échoue', async () => {
    const user = userEvent.setup()
    mockUpdateDepositReturned.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<ClosingLeaseActions {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution restituée'))

    await waitFor(() => expect(screen.getByLabelText('Caution restituée')).not.toBeChecked())
  })
})

describe('ClosingLeaseActions — bouton Archiver désactivé', () => {
  it('est désactivé par défaut (aucune case cochée)', () => {
    render(<ClosingLeaseActions {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeDisabled()
  })

  it('est désactivé si seulement EDL signé est coché', () => {
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} />)
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeDisabled()
  })

  it('est désactivé si seulement Caution restituée est cochée', () => {
    render(<ClosingLeaseActions {...defaultProps} initialDepositReturned={true} />)
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeDisabled()
  })

  it('est actif lorsque les deux cases sont cochées', () => {
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)
    expect(screen.getByRole('button', { name: 'Archiver' })).not.toBeDisabled()
  })
})

describe('ClosingLeaseActions — Archiver', () => {
  it('demande confirmation avant d\'archiver', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)

    await user.click(screen.getByRole('button', { name: 'Archiver' }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('irréversible'))
    expect(mockArchiveLease).not.toHaveBeenCalled()
  })

  it('n\'archive pas si l\'utilisateur annule', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)

    await user.click(screen.getByRole('button', { name: 'Archiver' }))

    expect(mockArchiveLease).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('redirige vers /admin/apartments après archivage réussi', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockArchiveLease.mockResolvedValue({ ok: true })
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)

    await user.click(screen.getByRole('button', { name: 'Archiver' }))

    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/admin/apartments'))
  })

  it('affiche un message d\'erreur si l\'archivage échoue', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockArchiveLease.mockResolvedValue({ ok: false, error: 'Erreur archivage' })
    render(<ClosingLeaseActions {...defaultProps} initialEdlSigned={true} initialDepositReturned={true} />)

    await user.click(screen.getByRole('button', { name: 'Archiver' }))

    await waitFor(() => expect(screen.getByText('Erreur archivage')).toBeInTheDocument())
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
