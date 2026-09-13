import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSetLang = vi.fn()

vi.mock('@/context/LanguageContext', () => ({
  useLang: vi.fn(() => ({ lang: 'fr', setLang: mockSetLang })),
}))

const { default: LanguageSwitch } = await import('@/components/LanguageSwitch')
const { useLang } = await import('@/context/LanguageContext')

describe('LanguageSwitch', () => {
  it('affiche les boutons FR et EN', () => {
    render(<LanguageSwitch />)
    expect(screen.getByText('FR')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('appelle setLang("en") au clic sur EN', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitch />)
    await user.click(screen.getByText('EN'))
    expect(mockSetLang).toHaveBeenCalledWith('en')
  })

  it('met en avant la langue active (fr)', () => {
    render(<LanguageSwitch />)
    expect(screen.getByText('FR').className).toContain('text-gray-900')
    expect(screen.getByText('EN').className).toContain('text-gray-400')
  })

  it('met en avant la langue active (en)', () => {
    vi.mocked(useLang).mockReturnValue({ lang: 'en', setLang: mockSetLang })
    render(<LanguageSwitch />)
    expect(screen.getByText('EN').className).toContain('text-gray-900')
    expect(screen.getByText('FR').className).toContain('text-gray-400')
  })
})
