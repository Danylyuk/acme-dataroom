import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Мерджить Tailwind-класи без конфліктів (стандарт shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Пароль достатньо сильний: ≥6 символів, ≥1 велика літера, ≥1 цифра. */
export function isStrongPassword(pw: string): boolean {
  return pw.length >= 6 && /[A-ZА-ЯЄІЇҐ]/.test(pw) && /\d/.test(pw)
}

/** Людський розмір файлу: 1024 → "1 KB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

type TimeKey = 'time.now' | 'time.min' | 'time.hour' | 'time.day'
type Translator = (key: TimeKey, vars?: Record<string, string | number>) => string

/** Відносна дата, локалізована: "щойно"/"just now", "5 хв тому"/"5 min ago", інакше — дата. */
export function formatRelativeTime(ts: number, t: Translator, locale: string): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return t('time.now')
  const min = Math.floor(sec / 60)
  if (min < 60) return t('time.min', { n: min })
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return t('time.hour', { n: hrs })
  const days = Math.floor(hrs / 24)
  if (days < 7) return t('time.day', { n: days })
  return new Date(ts).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Повна дата+час для діалогу властивостей. */
export function formatDateTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
