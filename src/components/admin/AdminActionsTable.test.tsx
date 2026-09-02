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

  it("n'affiche plus la colonne \"Date de création\"", () => {
    render(<AdminActionsTable actions={[makeAction({})]} />)
    expect(screen.queryByText('Date de création')).not.toBeInTheDocument()
    // La date limite (dérivée d'un autre champ que createdAt) reste affichée
    expect(screen.getByRole('button', { name: /date limite/i })).toBeInTheDocument()
  })

  it("n'affiche plus la liste déroulante \"Owner (tous)\"", () => {
    render(<AdminActionsTable actions={[makeAction({})]} />)
    expect(screen.queryByText('Owner (tous)')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('AdminActionsTable — tri des colonnes', () => {
  it('trie par date limite croissante par défaut', () => {
    render(
      <AdminActionsTable
        actions={[
          makeAction({ title: 'action tardive', dueDate: '2026-09-01' }),
          makeAction({ title: 'action urgente', dueDate: '2026-07-15' }),
        ]}
      />
    )
    const rows = screen.getAllByRole('row').slice(1) // sans l'en-tête
    expect(within(rows[0]).getByText('action urgente')).toBeInTheDocument()
    expect(within(rows[1]).getByText('action tardive')).toBeInTheDocument()
  })

  it('inverse le tri au clic sur la colonne déjà active (Date limite, triée croissant par défaut)', async () => {
    const user = userEvent.setup()
    render(
      <AdminActionsTable
        actions={[
          makeAction({ title: 'action tardive', dueDate: '2026-09-01' }),
          makeAction({ title: 'action urgente', dueDate: '2026-07-15' }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /date limite/i }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('action tardive')).toBeInTheDocument()
    expect(within(rows[1]).getByText('action urgente')).toBeInTheDocument()
  })

  it('trie par titre au clic sur l\'en-tête "Titre"', async () => {
    const user = userEvent.setup()
    render(
      <AdminActionsTable
        actions={[
          makeAction({ title: 'zebre' }),
          makeAction({ title: 'alpha' }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /^titre/i }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('alpha')).toBeInTheDocument()
    expect(within(rows[1]).getByText('zebre')).toBeInTheDocument()
  })

  it('trie numériquement par appartement (pas alphabétiquement : "2" avant "10")', async () => {
    const user = userEvent.setup()
    render(
      <AdminActionsTable
        actions={[
          makeAction({ title: 'appt 10', apartmentNumber: '10' }),
          makeAction({ title: 'appt 2', apartmentNumber: '2' }),
        ]}
      />
    )

    await user.click(screen.getByRole('button', { name: /appartement/i }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('appt 2')).toBeInTheDocument()
    expect(within(rows[1]).getByText('appt 10')).toBeInTheDocument()
  })
})
