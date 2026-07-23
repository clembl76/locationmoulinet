import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import NouveauBailForm from '@/app/admin/apartments/[number]/nouveau-bail/NouveauBailForm'

describe('NouveauBailForm — situation familiale', () => {
  it('propose les 5 statuts familiaux de la liste partagée, dont "Veuf/Veuve"', () => {
    render(<NouveauBailForm aptNumber="7" />)
    const label = screen.getByText('Situation familiale')
    const select = label.closest('div')!.querySelector('select')!
    const options = within(select).getAllByRole('option').map(o => o.textContent)
    expect(options).toEqual(['— Choisir —', 'Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/Veuve'])
  })
})
