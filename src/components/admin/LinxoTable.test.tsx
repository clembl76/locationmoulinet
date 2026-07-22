import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LinxoTable from '@/components/admin/LinxoTable'
import type { LinxoTransaction } from '@/lib/linxoImport'

function makeTx(overrides: Partial<LinxoTransaction>): LinxoTransaction {
  return {
    id: 'tx-1',
    date: '2026-07-19',
    libelle: 'VIREMENT',
    categorie: null,
    montant: 100,
    notes: null,
    numero_cheque: null,
    labels: null,
    nom_du_compte: null,
    nom_de_la_connexion: null,
    source: 'moulinet',
    imported_at: '2026-07-19T00:00:00Z',
    supplier: null,
    type: null,
    description: null,
    apartment_num: null,
    tenant_name: null,
    validated: false,
    ...overrides,
  }
}

describe('LinxoTable — source Renard', () => {
  it('affiche le badge "Renard" (pas "renard" brut ni "Perso") pour une transaction source=renard', () => {
    render(<LinxoTable initialRows={[makeTx({ id: 'tx-renard', source: 'renard' })]} />)
    const badge = screen.getByText('Renard', { selector: 'span' })
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-violet-100')
    expect(screen.queryByText('Perso')).not.toBeInTheDocument()
  })

  it('le filtre Source propose "Renard" et ne propose plus "Perso"', () => {
    render(<LinxoTable initialRows={[makeTx({ source: 'moulinet' })]} />)
    const sourceSelect = screen.getByDisplayValue('Source (toutes)')
    const options = within(sourceSelect).getAllByRole('option').map(o => o.textContent)
    expect(options).toContain('Renard')
    expect(options).not.toContain('Perso')
  })

  it('filtrer par "Renard" n\'affiche que les transactions de cette source', async () => {
    const user = userEvent.setup()
    render(
      <LinxoTable
        initialRows={[
          makeTx({ id: 'tx-moulinet', source: 'moulinet', libelle: 'VIR MOULINET' }),
          makeTx({ id: 'tx-renard', source: 'renard', libelle: 'VIR RENARD' }),
        ]}
      />
    )

    expect(screen.getByText('VIR MOULINET')).toBeInTheDocument()
    expect(screen.getByText('VIR RENARD')).toBeInTheDocument()

    const sourceSelect = screen.getByDisplayValue('Source (toutes)')
    await user.selectOptions(sourceSelect, 'Renard')

    expect(screen.queryByText('VIR MOULINET')).not.toBeInTheDocument()
    expect(screen.getByText('VIR RENARD')).toBeInTheDocument()
  })
})
