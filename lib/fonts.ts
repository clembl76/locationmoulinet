import { Plus_Jakarta_Sans } from 'next/font/google'

// Police des pages publiques uniquement (accueil, fiche appartement, candidater, visiter).
// Volontairement non appliquée dans app/layout.tsx pour ne pas affecter /admin (police Geist).
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
})

export const publicFontClassName = `${plusJakarta.variable} font-[family-name:var(--font-plus-jakarta)]`
