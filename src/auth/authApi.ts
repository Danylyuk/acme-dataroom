/**
 * Клієнт до auth-бекенду (реєстрація / верифікація / логін).
 * База — VITE_API_URL (напр. http://localhost:8787 у деві).
 */
const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8787'

export interface AuthUser {
  id: string
  email: string
  name: string
}

/** Кидає Error, у якого message = код помилки з бекенду (для мапінгу в i18n). */
async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('network')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'server_error')
  return data as T
}

export function registerRequest(input: {
  email: string
  password: string
  name?: string
  turnstileToken: string
}) {
  return post<{ ok: true; next: 'verify' }>('register', input)
}

export function verifyRequest(input: { email: string; code: string }) {
  return post<{ token: string; user: AuthUser }>('verify', input)
}

export function loginRequest(input: {
  email: string
  password: string
  turnstileToken: string
}) {
  return post<{ token: string; user: AuthUser }>('login', input)
}

export function resendRequest(email: string) {
  return post<{ ok: true }>('resend', { email })
}
