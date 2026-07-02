/**
 * Перевірка Cloudflare Turnstile-токена на боку сервера.
 * Клієнтський віджет дає token → сюди → Cloudflare підтверджує, що це людина.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET
  // Якщо секрет не заданий — не блокуємо (dev-режим), але логуємо.
  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET не заданий — перевірку пропущено (dev)')
    return true
  }
  if (!token) return false

  const body = new URLSearchParams({ secret, response: token })
  if (ip) body.append('remoteip', ip)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    const data = (await res.json()) as { success: boolean }
    return data.success === true
  } catch (e) {
    console.error('[turnstile] verify error', e)
    return false
  }
}
