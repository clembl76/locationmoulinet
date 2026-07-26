import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminActionsTable from '@/components/admin/AdminActionsTable'
import type { AdminAction } from '@/lib/adminData'

function makeAction(overrides: Partial<AdminAction>): AdminAction {
  return {
    title: 'caution non reçue',
    apartmentNumber: '7',
    tenantName: 'Jean Dupont',
    owner: 'locataire',
    createdAt: '2026-07-01',
    dueDate: '2026-07-10',
    linkUrl: '/admin/apartments/7',
    ...overrides,
  }
}

describe('AdminActionsTable', () => {
  it('affiche un message si aucune action', () => {
    render(<AdminActionsTable actions={[]} />)
    expect(screen.getByText('Aucune action en attente.')).toBeInTheDocument()
  })

  it('affiche une ligne par action avec les bonnes colonnes', () => {
    render(<AdminActionsTable actions={[makeAction({})]} />)
    expect(screen.getByText('caution non reçue')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('Locataire', { selector: 'span' })).toBeInTheDocument()
  })

  it('le titre pointe vers linkUrl (appartement pour la plupart des actions)', () => {
    render(<AdminActionsTable actions={[makeAction({ linkUrl: '/admin/apartments/7' })]} />)
    expect(screen.getByText('caution non reçue').closest('a')).toHaveAttribute('href', '/admin/apartments/7')
  })

  it('le titre pointe vers la fiche candidat pour une candidature à approuver', () => {
    render(
      <AdminActionsTable
        actions={[makeAction({
          title: 'candidatures à approuver ou refuser',
          owner: 'proprietaire',
          linkUrl: '/admin/mise-en-location/candidats/app-42',
        })]}
      />
    )
    expect(screen.getByText('candidatures à approuver ou refuser').closest('a'))
      .toHaveAttribute('href', '/admin/mise-en-location/candidats/app-42')
  })

  it('affiche la date limite en rouge quand elle est dépassée', () => {
    render(<AdminActionsTable actions={[makeAction({ dueDate: '2020-01-01' })]} />)
    expect(screen.getByText('1 janv. 2020')).toHaveClass('text-red-600')
  })

  it('n\'affiche pas la date limite en rouge quand elle est dans le futur', () => {
    const farFuture = `${new Date().getFullYear() + 5}-01-01`
    render(<AdminActionsTable actions={[makeAction({ dueDate: farFuture })]} />)
    const cell = screen.getByText(`1 janv. ${new Date().getFullYear() + 5}`)
    expect(cell).not.toHaveClass('text-red-600')
  })

  it('filtre par owner', async () => {
    const user = userEvent.setup()
    render(
      <AdminActionsTable
        actions={[
          makeAction({ title: 'caution non reçue', owner: 'locataire' }),
          makeAction({ title: 'candidatures à approuver ou refuser', owner: 'proprietaire' }),
        ]}
      />
    )

    expect(screen.getByText('caution non reçue')).toBeInTheDocument()
    expect(screen.getByText('candidatures à approuver ou refuser')).toBeInTheDocument()

    const select = screen.getByDisplayValue('Owner (tous)')
    await user.selectOptions(select, 'Propriétaire')

    expect(screen.queryByText('caution non reçue')).not.toBeInTheDocument()
    expect(screen.getByText('candidatures à approuver ou refuser')).toBeInTheDocument()
  })
})
