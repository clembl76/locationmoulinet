import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApartmentSummaryPanel from '@/components/admin/ApartmentSummaryPanel'

const mockGetDates = vi.fn()

vi.mock('@/app/admin/inventory/summaryActions', () => ({
  getLeaseDatesAction: (...args: unknown[]) => mockGetDates(...args),
}))

describe('ApartmentSummaryPanel', () => {
  beforeEach(() => {
    mockGetDates.mockResolvedValue({ move_in_date: '2024-09-01', move_out_date: null, deposit: 1500 })
  })

  it('affiche la date d\'entrée formatée', async () => {
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('01/09/2024')).toBeInTheDocument())
  })

  it('affiche — si pas de date de sortie', async () => {
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('01/09/2024')).toBeInTheDocument())
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('affiche la date de sortie si définie', async () => {
    mockGetDates.mockResolvedValue({ move_in_date: '2024-09-01', move_out_date: '2025-08-31', deposit: 1500 })
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('31/08/2025')).toBeInTheDocument())
  })

  it('affiche le montant de la caution', async () => {
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('01/09/2024')).toBeInTheDocument())
    expect(screen.getByText('Caution')).toBeInTheDocument()
    expect(screen.getByText('1500 €')).toBeInTheDocument()
  })

  it('affiche — si caution nulle', async () => {
    mockGetDates.mockResolvedValue({ move_in_date: '2024-09-01', move_out_date: null, deposit: null })
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('01/09/2024')).toBeInTheDocument())
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(2)
  })

  it('affiche les titres de section', async () => {
    render(<ApartmentSummaryPanel apartmentId="apt-1" leaseId="lease-1" />)
    await waitFor(() => expect(screen.getByText('01/09/2024')).toBeInTheDocument())
    expect(screen.getByText('Entrée')).toBeInTheDocument()
    expect(screen.getByText('Sortie')).toBeInTheDocument()
    expect(screen.getByText('Caution')).toBeInTheDocument()
  })

  it('appelle getLeaseDatesAction avec le bon leaseId', async () => {
    render(<ApartmentSummaryPanel apartmentId="apt-42" leaseId="lease-99" />)
    await waitFor(() => expect(mockGetDates).toHaveBeenCalledWith('lease-99'))
  })
})
