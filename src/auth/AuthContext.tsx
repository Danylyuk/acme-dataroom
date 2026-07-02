import * as React from 'react'

/**
 * Легкий шар автентифікації. Профіль користувача тримаємо в localStorage.
 * Джерело — реальний Google-логін (див. LoginPage), тут лише зберігання стану.
 */

export interface User {
  name: string
  email: string
  picture?: string
  /** як увійшов: email+пароль, Google, або демо. */
  provider: 'email' | 'google' | 'demo'
  /** JWT з бекенду (для email-логіну). */
  token?: string
}

interface AuthContextValue {
  user: User | null
  signIn: (user: User) => void
  signOut: () => void
  updateProfile: (patch: Partial<Pick<User, 'name'>>) => void
}

const STORAGE_KEY = 'acme_dataroom_user'
const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  const signIn = React.useCallback((u: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    // Reload на корінь: db.ts переініціалізує IndexedDB під e-mail цього юзера,
    // а React Query стартує з чистого кешу — жодних чужих даних між акаунтами.
    window.location.assign('/')
  }, [])

  const signOut = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    // reload гарантує скидання розблокованих ключів шифрування і кешу запитів
    window.location.assign('/')
  }, [])

  const updateProfile = React.useCallback((patch: Partial<Pick<User, 'name'>>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ user, signIn, signOut, updateProfile }),
    [user, signIn, signOut, updateProfile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth має бути всередині <AuthProvider>')
  return ctx
}

/** Декодуємо payload з Google JWT (id_token) без зовнішніх залежностей. */
export function decodeGoogleJwt(token: string): {
  name?: string
  email?: string
  picture?: string
} {
  const payload = token.split('.')[1]
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json)
}
