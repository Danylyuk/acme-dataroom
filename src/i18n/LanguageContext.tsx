import * as React from 'react'
import { translations, type Lang, type TKey } from './translations'

/**
 * Двомовність UA/EN. Мова зберігається в localStorage і застосовується миттєво
 * до всього дерева. t(key, vars) робить підстановку {var} у рядок.
 */

type Vars = Record<string, string | number>

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Vars) => string
  /** множина «файл/файли/файлів» (UA) або «file/files» (EN) */
  plural: (n: number, root: 'file') => string
  /** локаль для дат */
  locale: string
}

const STORAGE_KEY = 'acme_dataroom_lang'
const LangContext = React.createContext<LangContextValue | null>(null)

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'uk' || saved === 'en') return saved
    // автодетект мови браузера
    return navigator.language.toLowerCase().startsWith('uk') ? 'uk' : 'en'
  })

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = React.useMemo<LangContextValue>(() => {
    const dict = translations[lang]
    const t = (key: TKey, vars?: Vars) => interpolate(dict[key] ?? key, vars)
    const plural = (n: number, root: 'file') => {
      if (lang === 'en') return t(n === 1 ? `plural.${root}.one` : `plural.${root}.few`)
      const mod10 = n % 10
      const mod100 = n % 100
      if (mod10 === 1 && mod100 !== 11) return t(`plural.${root}.one`)
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
        return t(`plural.${root}.few`)
      return t(`plural.${root}.many`)
    }
    return { lang, setLang, t, plural, locale: lang === 'uk' ? 'uk-UA' : 'en-US' }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = React.useContext(LangContext)
  if (!ctx) throw new Error('useI18n має бути всередині <LanguageProvider>')
  return ctx
}
