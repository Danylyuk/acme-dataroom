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

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(r) => handleGoogle(r.credential)}
              onError={() => toast.error(t('login.googleError'))}
              theme="outline"
              size="large"
              width="320"
              text="signin_with"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('login.or')}</span>
            </div>
          </div>
        </>
      )}

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
