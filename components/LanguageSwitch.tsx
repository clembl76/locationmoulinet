'use client'

import { useLang } from '@/context/LanguageContext'

export default function LanguageSwitch() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex items-center text-sm font-semibold">
      <button
        onClick={() => setLang('fr')}
        className={`px-2 py-1 rounded transition-colors ${
          lang === 'fr'
            ? 'text-blue-primary'
            : 'text-gray-400 hover:text-blue-primary'
        }`}
      >
        FR
      </button>
      <span className="text-gray-200 select-none">|</span>
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded transition-colors ${
          lang === 'en'
            ? 'text-blue-primary'
            : 'text-gray-400 hover:text-blue-primary'
        }`}
      >
        EN
      </button>
    </div>
  )
}
