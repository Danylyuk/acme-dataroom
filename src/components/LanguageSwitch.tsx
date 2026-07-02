import { useI18n } from '@/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import type { Lang } from '@/i18n/translations'

const OPTIONS: { code: Lang; label: string }[] = [
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
]

/** Сегментований перемикач мови. variant='dark' — для графітового сайдбару. */
export function LanguageSwitch({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, setLang } = useI18n()
  const dark = variant === 'dark'
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg p-0.5 text-xs font-medium',
        dark ? 'bg-sidebar-accent/60' : 'border bg-secondary',
      )}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          className={cn(
            'rounded-md px-2.5 py-1 transition-colors',
            lang === o.code
              ? dark
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground shadow-sm'
              : dark
                ? 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
                : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={lang === o.code}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
