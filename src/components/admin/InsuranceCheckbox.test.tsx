import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InsuranceCheckbox from '@/components/admin/InsuranceCheckbox'

const mockUpdateInsuranceAttestationAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateInsuranceAttestationAction: (...args: unknown[]) => mockUpdateInsuranceAttestationAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  initialValue: false,
}

beforeEach(() => {
  mockUpdateInsuranceAttestationAction.mockReset()
})

describe('InsuranceCheckbox — affichage', () => {
  it('affiche la case à cocher et son libellé', () => {
    render(<InsuranceCheckbox {...defaultProps} />)
    expect(screen.getByLabelText("Attestation d'assurance fournie")).toBeInTheDocument()
  })

  it('initialise la case cochée si initialValue est true', () => {
    render(<InsuranceCheckbox {...defaultProps} initialValue={true} />)
    expect(screen.getByLabelText("Attestation d'assurance fournie")).toBeChecked()
  })
})

describe('InsuranceCheckbox — changement d\'état', () => {
  it('coche la case et appelle updateInsuranceAttestationAction avec true', async () => {
    const user = userEvent.setup()
    mockUpdateInsuranceAttestationAction.mockResolvedValue({ ok: true })
    render(<InsuranceCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText("Attestation d'assurance fournie"))

    expect(screen.getByLabelText("Attestation d'assurance fournie")).toBeChecked()
    await waitFor(() => expect(mockUpdateInsuranceAttestationAction).toHaveBeenCalledWith('lease-123', '7', true))
  })

  it('revient à l\'état précédent si l\'action échoue', async () => {
    const user = userEvent.setup()
    mockUpdateInsuranceAttestationAction.mockResolvedValue({ ok: false, error: 'Erreur DB' })
    render(<InsuranceCheckbox {...defaultProps} />)

    await user.click(screen.getByLabelText("Attestation d'assurance fournie"))

    await waitFor(() => expect(screen.getByLabelText("Attestation d'assurance fournie")).not.toBeChecked())
    expect(screen.getByText('Erreur DB')).toBeInTheDocument()
  })
})
