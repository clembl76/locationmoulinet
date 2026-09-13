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
            ? 'text-gray-900'
            : 'text-gray-400 hover:text-gray-900'
        }`}
      >
        FR
      </button>
      <span className="text-gray-200 select-none">|</span>
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded transition-colors ${
          lang === 'en'
            ? 'text-gray-900'
            : 'text-gray-400 hover:text-gray-900'
        }`}
      >
        EN
      </button>
    </div>
  )
}
