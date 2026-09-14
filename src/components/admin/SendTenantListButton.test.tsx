import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SendTenantListButton from '@/components/admin/SendTenantListButton'

const mockSendTenantListEmailAction = vi.fn()

vi.mock('@/app/admin/apartments/actions', () => ({
  sendTenantListEmailAction: (...args: unknown[]) => mockSendTenantListEmailAction(...args),
}))

beforeEach(() => {
  mockSendTenantListEmailAction.mockReset()
})

describe('SendTenantListButton — affichage', () => {
  it('affiche le bouton', () => {
    render(<SendTenantListButton />)
    expect(screen.getByRole('button', { name: 'Envoyer la liste des locataires' })).toBeInTheDocument()
  })
})

describe('SendTenantListButton — envoi réussi', () => {
  it('appelle sendTenantListEmailAction et affiche la confirmation', async () => {
    const user = userEvent.setup()
    mockSendTenantListEmailAction.mockResolvedValue({ ok: true })
    render(<SendTenantListButton />)

    await user.click(screen.getByRole('button', { name: 'Envoyer la liste des locataires' }))

    await waitFor(() => expect(mockSendTenantListEmailAction).toHaveBeenCalled())
    expect(await screen.findByText('Email envoyé.')).toBeInTheDocument()
  })
})

describe('SendTenantListButton — erreur', () => {
  it("affiche le message d'erreur si l'action échoue", async () => {
    const user = userEvent.setup()
    mockSendTenantListEmailAction.mockResolvedValue({ ok: false, error: 'Erreur envoi' })
    render(<SendTenantListButton />)

    await user.click(screen.getByRole('button', { name: 'Envoyer la liste des locataires' }))

    expect(await screen.findByText('Erreur envoi')).toBeInTheDocument()
  })
})
