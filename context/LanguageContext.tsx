'use client'

import { createContext, useContext, useState } from 'react'

export type Lang = 'fr' | 'en'

type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
