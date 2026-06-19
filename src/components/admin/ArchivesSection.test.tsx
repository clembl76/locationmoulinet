import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArchivesSection from '@/components/admin/ArchivesSection'
import type { ArchivedLease } from '@/lib/adminData'

const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

const leases: ArchivedLease[] = [
  {
    lease_id: 'lease-001',
    apartment_number: '7',
    tenant_first_name: 'Alice',
    tenant_last_name: 'Dupont',
    move_out_date: '2025-06-30',
  },
  {
    lease_id: 'lease-002',
    apartment_number: '3',
    tenant_first_name: 'Bob',
    tenant_last_name: 'Martin',
    move_out_date: '2024-08-31',
  },
]

beforeEach(() => {
  mockRouterPush.mockReset()
})

describe('ArchivesSection — affichage', () => {
  it('affiche un message si aucun bail archivé', () => {
    render(<ArchivesSection archivedLeases={[]} />)
    expect(screen.getByText('Aucun bail archivé.')).toBeInTheDocument()
  })

  it('affiche le dropdown et le bouton OK quand des baux sont archivés', () => {
    render(<ArchivesSection archivedLeases={leases} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('liste les baux archivés dans le dropdown', () => {
    render(<ArchivesSection archivedLeases={leases} />)
    expect(screen.getByText(/Appt 7.*Alice Dupont/)).toBeInTheDocument()
    expect(screen.getByText(/Appt 3.*Bob Martin/)).toBeInTheDocument()
  })

  it('le bouton OK est désactivé tant qu\'aucun bail n\'est sélectionné', () => {
    render(<ArchivesSection archivedLeases={leases} />)
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled()
  })
})

describe('ArchivesSection — navigation', () => {
  it('active le bouton OK après sélection d\'un bail', async () => {
    const user = userEvent.setup()
    render(<ArchivesSection archivedLeases={leases} />)

    await user.selectOptions(screen.getByRole('combobox'), 'lease-001')

    expect(screen.getByRole('button', { name: 'OK' })).not.toBeDisabled()
  })

  it('navigue vers la fiche de l\'appartement au clic sur OK', async () => {
    const user = userEvent.setup()
    render(<ArchivesSection archivedLeases={leases} />)

    await user.selectOptions(screen.getByRole('combobox'), 'lease-001')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/admin/apartments/7?lease=lease-001')
  })

  it('navigue vers le bon appartement pour le deuxième bail sélectionné', async () => {
    const user = userEvent.setup()
    render(<ArchivesSection archivedLeases={leases} />)

    await user.selectOptions(screen.getByRole('combobox'), 'lease-002')
    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(mockRouterPush).toHaveBeenCalledWith('/admin/apartments/3?lease=lease-002')
  })

  it('ne navigue pas si aucun bail n\'est sélectionné', async () => {
    const user = userEvent.setup()
    render(<ArchivesSection archivedLeases={leases} />)

    await user.click(screen.getByRole('button', { name: 'OK' }))

    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
