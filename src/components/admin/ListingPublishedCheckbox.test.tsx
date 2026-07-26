import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListingPublishedCheckbox from '@/components/admin/ListingPublishedCheckbox'

const mockUpdate = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateListingPublishedAction: (...args: unknown[]) => mockUpdate(...args),
}))

beforeEach(() => {
  mockUpdate.mockReset()
})

describe('ListingPublishedCheckbox', () => {
  it('affiche la case décochée quand initialValue=false', () => {
    render(<ListingPublishedCheckbox leaseId="l1" aptNumber="7" initialValue={false} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('affiche la case cochée quand initialValue=true', () => {
    render(<ListingPublishedCheckbox leaseId="l1" aptNumber="7" initialValue={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('coche la case et appelle updateListingPublishedAction(leaseId, aptNumber, true)', async () => {
    mockUpdate.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    render(<ListingPublishedCheckbox leaseId="lease-1" aptNumber="7" initialValue={false} />)

    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(mockUpdate).toHaveBeenCalledWith('lease-1', '7', true)
  })

  it('revient à l\'état précédent et affiche une erreur si l\'action échoue', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: 'Erreur serveur' })
    const user = userEvent.setup()
    render(<ListingPublishedCheckbox leaseId="lease-1" aptNumber="7" initialValue={false} />)

    await user.click(screen.getByRole('checkbox'))

    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(screen.getByText('Erreur serveur')).toBeInTheDocument()
  })
})
