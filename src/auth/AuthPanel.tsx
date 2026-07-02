import * as React from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Loader2, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/LanguageContext'
import { cn, isStrongPassword } from '@/lib/utils'
import { useAuth, decodeGoogleJwt, type User } from './AuthContext'
import { registerRequest, verifyRequest, loginRequest, resendRequest } from './authApi'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
// Тестовий site-key Cloudflare (завжди проходить) — для деву без налаштованого Turnstile.
const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '1x00000000000000000000AA'

type Mode = 'login' | 'register'

export function AuthPanel() {
  const { t, lang } = useI18n()
  const { signIn } = useAuth()
  const [mode, setMode] = React.useState<Mode>('login')

  // спільні поля
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [repeat, setRepeat] = React.useState('')
  const [tsToken, setTsToken] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  // крок верифікації коду
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null)
  const [code, setCode] = React.useState('')

  const tsRef = React.useRef<TurnstileInstance>(null)

  function resetTurnstile() {
    setTsToken('')
    tsRef.current?.reset()
  }

  function mapErr(e: unknown): string {
    const code = e instanceof Error ? e.message : 'server_error'
    const key = `auth.err.${code}` as Parameters<typeof t>[0]
    const msg = t(key)
    return msg.startsWith('auth.err.') ? t('auth.err.server_error') : msg
  }

  function finishAuth(token: string, u: { email: string; name: string }) {
    const user: User = { name: u.name, email: u.email, provider: 'email', token }
    signIn(user)
    toast.success(t('login.welcome', { name: u.name.split(' ')[0] || u.name }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    if (mode === 'register') {
      if (!isStrongPassword(password)) return setErr(t('auth.passWeak'))
      if (password !== repeat) return setErr(t('auth.passMismatch'))
    }

    setBusy(true)
    try {
      if (mode === 'register') {
        await registerRequest({ email, password, name: name.trim() || undefined, turnstileToken: tsToken })
        setPendingEmail(email)
        toast.success(t('auth.registered'))
      } else {
        const { token, user } = await loginRequest({ email, password, turnstileToken: tsToken })
        finishAuth(token, user)
      }
    } catch (e) {
      setErr(mapErr(e))
      resetTurnstile()
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const { token, user } = await verifyRequest({ email: pendingEmail!, code })
      finishAuth(token, user)
    } catch (e) {
      setErr(mapErr(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    if (!pendingEmail) return
    await resendRequest(pendingEmail).catch(() => {})
    toast.success(t('auth.resent'))
  }

  function handleGoogle(credential?: string) {
    if (!credential) return toast.error(t('login.googleError'))
    const p = decodeGoogleJwt(credential)
    signIn({
      name: p.name ?? 'User',
      email: p.email ?? '',
      picture: p.picture,
      provider: 'google',
    })
    toast.success(t('login.welcome', { name: (p.name ?? 'User').split(' ')[0] }))
  }

  // Локальний fallback, коли Google Client ID не налаштовано (dev). На проді — справжній вхід.
  function handleGoogleFallback() {
    signIn({ name: 'Google User', email: 'user@gmail.com', provider: 'google' })
    toast.success(t('login.welcome', { name: 'Google' }))
  }

  // ── Крок верифікації коду ──
  if (pendingEmail) {
    return (
      <div className="w-full space-y-6">
        <button
          onClick={() => {
            setPendingEmail(null)
            setCode('')
            setErr(null)
          }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> {t('auth.back')}
        </button>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t('auth.verifyTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('auth.verifyDesc', { email: pendingEmail })}
          </p>
        </div>
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            aria-invalid={!!err}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              setErr(null)
            }}
            className="text-center text-lg tracking-[0.5em]"
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy && <Loader2 className="size-4 animate-spin" />} {t('auth.verifyBtn')}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            className="mx-auto block text-sm text-primary hover:underline"
          >
            {t('auth.resend')}
          </button>
        </form>
      </div>
    )
  }

  // ── Вхід / Реєстрація ──
  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t('login.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
      </div>

      {/* Google-вхід: справжній за наявності Client ID, інакше — стандартна кнопка (dev-fallback) */}
      <div className="flex justify-center">
        {GOOGLE_CLIENT_ID ? (
          <GoogleLogin
            onSuccess={(r) => handleGoogle(r.credential)}
            onError={() => toast.error(t('login.googleError'))}
            theme="outline"
            size="large"
            width="320"
            text="signin_with"
          />
        ) : (
          <GoogleButton label={t('login.google')} onClick={handleGoogleFallback} />
        )}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('login.or')}</span>
        </div>
      </div>

      {/* Таби */}
      <div className="flex rounded-lg border bg-secondary p-1 text-sm font-medium">
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setErr(null)
              resetTurnstile()
            }}
            className={cn(
              'flex-1 rounded-md py-1.5 transition-colors',
              mode === m
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'login' ? t('auth.signInTab') : t('auth.registerTab')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <Field label={t('auth.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Carter" />
          </Field>
        )}
        <Field label={t('auth.email')}>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        <Field label={t('auth.password')} hint={mode === 'register' ? t('auth.passHint') : undefined}>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {mode === 'register' && (
          <Field label={t('auth.repeatPassword')}>
            <Input
              type="password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        )}

        <Turnstile
          ref={tsRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setTsToken}
          onExpire={() => setTsToken('')}
          options={{ theme: lang === 'uk' ? 'auto' : 'auto', size: 'flexible' }}
        />

        {err && <p className="text-sm text-destructive">{err}</p>}

        <Button type="submit" className="w-full" disabled={busy || !tsToken}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === 'login' ? t('auth.signInBtn') : t('auth.registerBtn')}
        </Button>
      </form>
    </div>
  )
}

/** Стандартна Google-кнопка (fallback, коли Client ID не налаштовано). */
function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-[320px] max-w-full items-center justify-center gap-3 rounded-md border bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent active:scale-[0.99]"
    >
      <GoogleLogo />
      {label}
    </button>
  )
}

function GoogleLogo() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
