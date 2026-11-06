// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buttonClass, type ButtonVariant, type ButtonSize } from '@/lib/buttonStyles'

const classes = (s: string) => s.split(' ')

describe('buttonClass — base commune', () => {
  const variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'link', 'danger', 'success']

  it.each(variants)('centre toujours le libellé (%s)', variant => {
    const c = classes(buttonClass({ variant }))
    expect(c).toEqual(expect.arrayContaining(['inline-flex', 'items-center', 'justify-center', 'text-center']))
    expect(c).not.toContain('text-left')
  })

  it.each(variants)('gère le focus clavier et l’état désactivé (%s)', variant => {
    const c = classes(buttonClass({ variant }))
    expect(c).toEqual(expect.arrayContaining([
      'focus-visible:outline-2',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
    ]))
  })

  it('ne produit ni espace double ni classe vide', () => {
    const s = buttonClass()
    expect(s).not.toMatch(/\s{2,}/)
    expect(s.trim()).toBe(s)
  })
})

describe('buttonClass — variantes', () => {
  it('primary par défaut : rectangle sombre aux coins arrondis', () => {
    expect(classes(buttonClass())).toEqual(expect.arrayContaining(['rounded-lg', 'bg-gray-900', 'text-white', 'hover:bg-black']))
  })

  it('secondary : rectangle blanc bordé', () => {
    expect(classes(buttonClass({ variant: 'secondary' }))).toEqual(
      expect.arrayContaining(['rounded-lg', 'border', 'border-gray-200', 'bg-white']),
    )
  })

  it('ghost : sans fond ni bordure au repos', () => {
    const c = classes(buttonClass({ variant: 'ghost' }))
    expect(c).toContain('hover:bg-gray-100')
    expect(c).not.toContain('border')
    expect(c.some(x => x.startsWith('bg-'))).toBe(false)
  })

  it('danger et success : couleurs de décision', () => {
    expect(classes(buttonClass({ variant: 'danger' }))).toContain('bg-red-600')
    expect(classes(buttonClass({ variant: 'success' }))).toContain('bg-green-600')
  })

  it('link : texte teal sans padding horizontal', () => {
    const c = classes(buttonClass({ variant: 'link' }))
    expect(c).toContain('text-teal')
    expect(c).toContain('hover:underline')
    expect(c.some(x => /^px-/.test(x))).toBe(false)
  })
})

describe('buttonClass — tailles et zone tactile', () => {
  const sizes: ButtonSize[] = ['sm', 'md', 'lg']

  it.each(sizes)('garantit au moins 44px de hauteur sur mobile (%s)', size => {
    const c = classes(buttonClass({ size }))
    expect(c.some(x => x === 'min-h-11' || x === 'min-h-12')).toBe(true)
  })

  it('sm est compact à partir de md, en texte xs', () => {
    expect(classes(buttonClass({ size: 'sm' }))).toEqual(expect.arrayContaining(['md:min-h-8', 'text-xs']))
  })

  it('md est la taille par défaut', () => {
    expect(buttonClass()).toBe(buttonClass({ size: 'md' }))
    expect(classes(buttonClass())).toEqual(expect.arrayContaining(['px-4', 'text-sm']))
  })

  it('lg est plus large pour les validations de formulaire', () => {
    expect(classes(buttonClass({ size: 'lg' }))).toEqual(expect.arrayContaining(['min-h-12', 'px-6']))
  })

  it('link garde la zone tactile mobile sans hauteur imposée sur desktop', () => {
    expect(classes(buttonClass({ variant: 'link', size: 'sm' }))).toEqual(
      expect.arrayContaining(['min-h-11', 'md:min-h-0', 'text-xs']),
    )
  })
})

describe('buttonClass — options', () => {
  it('fullWidth ajoute w-full', () => {
    expect(classes(buttonClass({ fullWidth: true }))).toContain('w-full')
    expect(classes(buttonClass())).not.toContain('w-full')
  })

  it('className est ajouté en dernier', () => {
    const c = classes(buttonClass({ className: 'flex-1 mr-2' }))
    expect(c.slice(-2)).toEqual(['flex-1', 'mr-2'])
  })
})
