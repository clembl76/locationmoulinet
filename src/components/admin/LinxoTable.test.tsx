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

describe('LinxoTable — colonne Validé en 1ère position', () => {
  it('la colonne Validé est la première colonne du tableau', () => {
    render(<LinxoTable initialRows={[makeTx({})]} />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers[0]).toHaveTextContent('Validé')
    expect(headers[1]).toHaveTextContent('Date')
  })

  it('la case à cocher Validé est la première cellule de chaque ligne', () => {
    render(<LinxoTable initialRows={[makeTx({ validated: true })]} />)
    const row = screen.getByRole('checkbox').closest('tr')!
    const firstCell = within(row).getAllByRole('cell')[0]
    expect(within(firstCell).getByRole('checkbox')).toBeChecked()
  })
})

describe('LinxoTable — retour à la ligne de la colonne Description', () => {
  it('la description longue passe à la ligne (pas de troncature avec ellipse)', () => {
    const longDescription = 'Une description assez longue pour nécessiter plusieurs lignes d\'affichage dans la cellule du tableau'
    render(<LinxoTable initialRows={[makeTx({ description: longDescription })]} />)

    const cell = screen.getByText(longDescription)
    expect(cell.className).toContain('whitespace-normal')
    expect(cell.className).toContain('break-words')
    expect(cell.className).not.toContain('truncate')
  })

  it('les autres colonnes éditables (ex. Fournisseur) restent tronquées sur une ligne', () => {
    render(<LinxoTable initialRows={[makeTx({ supplier: 'Un fournisseur avec un nom très long' })]} />)

    const cell = screen.getByText('Un fournisseur avec un nom très long', { selector: 'span' })
    expect(cell.className).toContain('truncate')
    expect(cell.className).not.toContain('whitespace-normal')
  })
})

describe('LinxoTable — colonnes Libellé et Note interverties', () => {
  it('la colonne Note précède désormais la colonne Fournisseur, et Libellé arrive après Locataire', () => {
    render(<LinxoTable initialRows={[makeTx({})]} />)
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent)
    const noteIdx = headers.findIndex(h => h?.includes('Note'))
    const libelleIdx = headers.findIndex(h => h?.includes('Libellé'))
    const fournisseurIdx = headers.findIndex(h => h?.includes('Fournisseur'))
    const locataireIdx = headers.findIndex(h => h?.includes('Locataire'))
    const sourceIdx = headers.findIndex(h => h?.includes('Source'))

    expect(noteIdx).toBeLessThan(fournisseurIdx)
    expect(libelleIdx).toBeGreaterThan(locataireIdx)
    expect(libelleIdx).toBeLessThan(sourceIdx)
  })

  it('affiche bien la valeur libellé et la valeur note à leur nouvelle position', () => {
    render(<LinxoTable initialRows={[makeTx({ libelle: 'VIR SEPA TEST', notes: 'note de test' })]} />)
    expect(screen.getByText('VIR SEPA TEST')).toBeInTheDocument()
    expect(screen.getByText('note de test')).toBeInTheDocument()
  })
})
