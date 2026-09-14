import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExportLeasesButton from '@/components/admin/ExportLeasesButton'

describe('ExportLeasesButton — affichage', () => {
  it('propose les années de 2016 à l\'année courante', () => {
    render(<ExportLeasesButton currentYear={2026} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toContain('2016')
    expect(options).toContain('2026')
    expect(options).toHaveLength(2026 - 2016 + 1)
  })

  it('sélectionne l\'année courante par défaut', () => {
    render(<ExportLeasesButton currentYear={2026} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('2026')
  })

  it('pointe le lien d\'export vers l\'année courante par défaut', () => {
    render(<ExportLeasesButton currentYear={2026} />)
    expect(screen.getByRole('link', { name: /exporter csv/i })).toHaveAttribute(
      'href', '/api/admin/export-leases?year=2026'
    )
  })
})

describe('ExportLeasesButton — changement d\'année', () => {
  it('met à jour le lien d\'export quand on change l\'année sélectionnée', async () => {
    const user = userEvent.setup()
    render(<ExportLeasesButton currentYear={2026} />)
    await user.selectOptions(screen.getByRole('combobox'), '2024')
    expect(screen.getByRole('link', { name: /exporter csv/i })).toHaveAttribute(
      'href', '/api/admin/export-leases?year=2024'
    )
  })
})
