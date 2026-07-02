import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Мерджить Tailwind-класи без конфліктів (стандарт shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

/** Відносна дата: "щойно", "5 хв тому", "2 год тому", інакше — дата. */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'щойно'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} хв тому`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} год тому`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} дн тому`
  return new Date(ts).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
