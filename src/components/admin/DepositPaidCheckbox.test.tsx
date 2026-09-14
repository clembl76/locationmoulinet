import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DepositPaidCheckbox from '@/components/admin/DepositPaidCheckbox'

const mockUpdateDepositPaidAction = vi.fn()
const mockGenerateQuittanceCautionAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateDepositPaidAction: (...args: unknown[]) => mockUpdateDepositPaidAction(...args),
  generateQuittanceCautionAction: (...args: unknown[]) => mockGenerateQuittanceCautionAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  depositAmount: 480,
  initialPaid: false,
}

beforeEach(() => {
  mockUpdateDepositPaidAction.mockReset()
  mockGenerateQuittanceCautionAction.mockReset()
  vi.spyOn(window, 'confirm').mockReturnValue(false).mockClear()
})

describe('DepositPaidCheckbox — affichage', () => {
  it('affiche la case à cocher et le montant', () => {
    render(<DepositPaidCheckbox {...defaultProps} />)
    expect(screen.getByLabelText('Caution payée ?')).toBeInTheDocument()
    expect(screen.getByText('480 €')).toBeInTheDocument()
  })

  it("n'affiche pas de montant quand depositAmount est null", () => {
    render(<DepositPaidCheckbox {...defaultProps} depositAmount={null} />)
    expect(screen.queryByText('€')).not.toBeInTheDocument()
  })

  it('initialise la case cochée si initialPaid est true', () => {
    render(<DepositPaidCheckbox {...defaultProps} initialPaid={true} />)
    expect(screen.getByLabelText('Caution payée ?')).toBeChecked()
  })
})

describe('DepositPaidCheckbox — changement d\'état', () => {
  it('coche la case et appelle updateDepositPaidAction avec true', async () => {
    const user = userEvent.setup()
    mockUpdateDepositPaidAction.mockResolvedValue({ ok: true })
    render(<DepositPaidCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution payée ?'))

    expect(screen.getByLabelText('Caution payée ?')).toBeChecked()
    await waitFor(() => expect(mockUpdateDepositPaidAction).toHaveBeenCalledWith('lease-123', '7', true))
  })

  it('revient à l\'état précédent si l\'action échoue', async () => {
    const user = userEvent.setup()
    mockUpdateDepositPaidAction.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<DepositPaidCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution payée ?'))

    await waitFor(() => expect(screen.getByLabelText('Caution payée ?')).not.toBeChecked())
    expect(screen.getByText('Erreur DB')).toBeInTheDocument()
  })
})

describe('DepositPaidCheckbox — génération de la quittance de caution', () => {
  it('demande confirmation pour générer la quittance quand on coche', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockUpdateDepositPaidAction.mockResolvedValue({ ok: true })
    render(<DepositPaidCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution payée ?'))

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled())
    expect(mockGenerateQuittanceCautionAction).not.toHaveBeenCalled()
  })

  it('génère la quittance de caution si l\'utilisateur confirme', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockUpdateDepositPaidAction.mockResolvedValue({ ok: true })
    mockGenerateQuittanceCautionAction.mockResolvedValue({ ok: true, filename: 'quittance-caution.pdf', draftId: 'draft-1' })
    render(<DepositPaidCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText('Caution payée ?'))

    await waitFor(() => expect(mockGenerateQuittanceCautionAction).toHaveBeenCalledWith('lease-123', '7'))
    expect(await screen.findByText('quittance-caution.pdf')).toBeInTheDocument()
  })

  it('ne demande pas de confirmation quand on décoche la case', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockUpdateDepositPaidAction.mockResolvedValue({ ok: true })
    render(<DepositPaidCheckbox {...defaultProps} initialPaid={true} />)

    await user.click(screen.getByLabelText('Caution payée ?'))

    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
