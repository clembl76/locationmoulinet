import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocusignUrls from '@/components/admin/DocusignUrls'

const mockUpdateDocusignUrlsAction = vi.fn()

vi.mock('@/app/admin/apartments/[number]/actions', () => ({
  updateDocusignUrlsAction: (...args: unknown[]) => mockUpdateDocusignUrlsAction(...args),
}))

const defaultProps = {
  leaseId: 'lease-123',
  aptNumber: '7',
  initialLeaseUrl: null,
  initialEdlUrl: null,
}

beforeEach(() => {
  mockUpdateDocusignUrlsAction.mockReset()
})

describe('DocusignUrls — affichage', () => {
  it('affiche les deux champs et le bouton Enregistrer', () => {
    render(<DocusignUrls {...defaultProps} />)
    expect(screen.getByText('Lien Bail (Docusign)')).toBeInTheDocument()
    expect(screen.getByText("Lien EDL d'entrée (Docusign)")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('pré-remplit les champs avec les valeurs initiales', () => {
    render(<DocusignUrls {...defaultProps} initialLeaseUrl="https://apps.docusign.com/send/documents/details/abc" initialEdlUrl="https://apps.docusign.com/send/documents/details/def" />)
    const inputs = screen.getAllByPlaceholderText(/apps\.docusign\.com/) as HTMLInputElement[]
    expect(inputs[0].value).toBe('https://apps.docusign.com/send/documents/details/abc')
    expect(inputs[1].value).toBe('https://apps.docusign.com/send/documents/details/def')
  })

  it("n'affiche pas de lien tant qu'aucune URL n'est saisie", () => {
    render(<DocusignUrls {...defaultProps} />)
    expect(screen.queryByText(/Bail signé sur Docusign/)).not.toBeInTheDocument()
    expect(screen.queryByText(/EDL Entrée sur Docusign/)).not.toBeInTheDocument()
  })

  it('affiche un lien cliquable quand une URL est fournie', () => {
    render(<DocusignUrls {...defaultProps} initialLeaseUrl="https://apps.docusign.com/send/documents/details/abc" />)
    expect(screen.getByRole('link', { name: /Bail signé sur Docusign/ })).toHaveAttribute(
      'href', 'https://apps.docusign.com/send/documents/details/abc'
    )
  })
})

describe('DocusignUrls — normalisation UUID', () => {
  it('construit l\'URL complète quand on colle juste un UUID', async () => {
    const user = userEvent.setup()
    render(<DocusignUrls {...defaultProps} />)
    const inputs = screen.getAllByPlaceholderText(/apps\.docusign\.com/)

    await user.type(inputs[0], 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')

    expect(screen.getByRole('link', { name: /Bail signé sur Docusign/ })).toHaveAttribute(
      'href', 'https://apps.docusign.com/send/documents/details/a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    )
  })
})

describe('DocusignUrls — enregistrement', () => {
  it('appelle updateDocusignUrlsAction avec les URLs normalisées', async () => {
    const user = userEvent.setup()
    mockUpdateDocusignUrlsAction.mockResolvedValue({ ok: true })
    render(<DocusignUrls {...defaultProps} />)
    const inputs = screen.getAllByPlaceholderText(/apps\.docusign\.com/)

    await user.type(inputs[0], 'example.com/bail')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(mockUpdateDocusignUrlsAction).toHaveBeenCalledWith(
        'lease-123', '7', 'https://example.com/bail', null
      )
    })
  })

  it('affiche "Sauvegardé" après un enregistrement réussi', async () => {
    const user = userEvent.setup()
    mockUpdateDocusignUrlsAction.mockResolvedValue({ ok: true })
    render(<DocusignUrls {...defaultProps} initialLeaseUrl="https://example.com/bail" />)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Sauvegardé')).toBeInTheDocument()
  })

  it("affiche le message d'erreur si l'action échoue", async () => {
    const user = userEvent.setup()
    mockUpdateDocusignUrlsAction.mockResolvedValue({ ok: false, error: 'Erreur réseau' })
    render(<DocusignUrls {...defaultProps} initialLeaseUrl="https://example.com/bail" />)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Erreur réseau')).toBeInTheDocument()
  })
})
