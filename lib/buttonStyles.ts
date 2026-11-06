// ─── Design system des boutons ────────────────────────────────────────────────
// Source unique des styles de boutons d'action (<button>, <Link>, <a>).
//
// Principes :
// - Libellé toujours centré (inline-flex + justify-center + text-center), y compris
//   en pleine largeur ou sur plusieurs lignes.
// - Forme unique : rectangle aux coins légèrement arrondis (rounded-lg).
// - Hiérarchie : un seul `primary` par zone d'action ; `secondary` pour les actions
//   alternatives ; `ghost` pour Annuler / Réinitialiser ; `link` pour une action
//   discrète dans un texte ; `danger` / `success` réservés aux décisions
//   irréversibles (refuser / accepter).
// - Zone tactile ≥ 44px sur mobile (min-h-11), plus compacte à partir de md pour `sm`.
// - États : focus clavier visible, disabled à 50 % d'opacité sans curseur cliquable.
//
// Hors périmètre (styles propres, volontairement) : filtres/chips, contrôles
// segmentés, interrupteurs, cellules de calendrier, cartes sélectionnables,
// en-têtes d'accordéon et de tri, icônes de suppression, menu hamburger.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonClassOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

const BASE =
  'inline-flex items-center justify-center gap-2 text-center leading-tight font-semibold ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'rounded-lg bg-gray-900 text-white hover:bg-black',
  secondary: 'rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
  ghost: 'rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900',
  link: 'rounded text-teal underline-offset-2 hover:underline',
  danger: 'rounded-lg bg-red-600 text-white hover:bg-red-700',
  success: 'rounded-lg bg-green-600 text-white hover:bg-green-700',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 md:min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-11 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-3 text-sm',
}

// Un lien textuel ne prend pas de padding horizontal (aligné avec le texte voisin).
const LINK_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 md:min-h-0 text-xs',
  md: 'min-h-11 md:min-h-0 text-sm',
  lg: 'min-h-11 md:min-h-0 text-base',
}

export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonClassOptions = {}): string {
  const sizeCls = variant === 'link' ? LINK_SIZES[size] : SIZES[size]
  return [BASE, VARIANTS[variant], sizeCls, fullWidth ? 'w-full' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}
