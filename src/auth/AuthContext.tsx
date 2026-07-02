import * as React from 'react'

/**
 * Легкий шар автентифікації. Профіль користувача тримаємо в localStorage.
 * Джерело — реальний Google-логін (див. LoginPage), тут лише зберігання стану.
 */

export interface User {
  name: string
  email: string
  picture?: string
  /** 'google' — увійшов через Google; 'demo' — резервний вхід (fallback). */
  provider: 'google' | 'demo'
}

interface AuthContextValue {
  user: User | null
  signIn: (user: User) => void
  signOut: () => void
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
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }, [])

  const signOut = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = React.useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])
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
