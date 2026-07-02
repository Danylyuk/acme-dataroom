import { GoogleLogin } from '@react-oauth/google'
import { ShieldCheck, Lock, FolderLock, FileCheck2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { useI18n } from '@/i18n/LanguageContext'
import { useAuth, decodeGoogleJwt, type User } from './AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function LoginPage() {
  const { signIn } = useAuth()
  const { t } = useI18n()

  function handleGoogle(credential?: string) {
    if (!credential) return toast.error(t('login.googleError'))
    const p = decodeGoogleJwt(credential)
    const user: User = {
      name: p.name ?? 'User',
      email: p.email ?? '',
      picture: p.picture,
      provider: 'google',
    }
    signIn(user)
    toast.success(t('login.welcome', { name: user.name.split(' ')[0] }))
  }

  function handleDemo() {
    signIn({ name: 'Demo User', email: 'demo@acmecorp.com', provider: 'demo' })
  }

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderLock className="size-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">{t('brand')}</span>
    </div>
  )

  const features = (
    <ul className="space-y-3 text-sm text-sidebar-foreground/80">
      <li className="flex items-center gap-3">
        <ShieldCheck className="size-4 shrink-0 text-primary" /> {t('login.feature1')}
      </li>
      <li className="flex items-center gap-3">
        <FileCheck2 className="size-4 shrink-0 text-primary" /> {t('login.feature2')}
      </li>
      <li className="flex items-center gap-3">
        <Lock className="size-4 shrink-0 text-primary" /> {t('login.feature3')}
      </li>
    </ul>
  )

  const copyright = (
    <p className="text-xs leading-relaxed">
      {t('login.confidential', { year: new Date().getFullYear() })}
      <br />
      {t('login.developedBy')}
    </p>
  )

  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      {/* ── Графітовий блок: верх на мобілці, ліва колонка на десктопі ── */}
      <div className="relative flex flex-col gap-8 overflow-hidden bg-sidebar p-8 text-sidebar-foreground lg:justify-center lg:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--primary)' }}
        />

        {/* бренд + перемикач мови (моб). На десктопі бренд прибитий до верху. */}
        <div className="relative flex items-center justify-between lg:absolute lg:inset-x-10 lg:top-10">
          {brand}
          <LanguageSwitch variant="dark" className="lg:hidden" />
        </div>

        {/* hero — вертикально по центру на десктопі */}
        <div className="relative space-y-6 lg:max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t('login.heroTitle')}
          </h1>
          <p className="hidden text-sidebar-foreground/70 sm:block">
            {t('login.heroSubtitle')}
          </p>
          {features}
        </div>

        {/* копірайт — desktop: прибитий до низу лівої колонки */}
        <div className="relative hidden text-sidebar-foreground/50 lg:absolute lg:bottom-10 lg:left-10 lg:block">
          {copyright}
        </div>
      </div>

      {/* ── Білий блок: низ на мобілці, права колонка на десктопі ── */}
      <div className="relative flex flex-1 flex-col p-8 lg:p-10">
        {/* перемикач мови — desktop, top-right */}
        <div className="hidden justify-end lg:absolute lg:right-10 lg:top-10 lg:flex">
          <LanguageSwitch />
        </div>

        {/* форма — вертикально по центру */}
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{t('login.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <div className="space-y-4">
            {GOOGLE_CLIENT_ID ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(r) => handleGoogle(r.credential)}
                  onError={() => toast.error(t('login.googleError'))}
                  theme="outline"
                  size="large"
                  width="320"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            ) : (
              <GoogleButton label={t('login.google')} onClick={handleDemo} />
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('login.or')}
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemo}>
              {t('login.demo')}
            </Button>
          </div>
        </div>

        {/* копірайт — mobile: прибитий до низу */}
        <div className="mt-8 text-center text-muted-foreground/70 lg:hidden">
          {copyright}
        </div>
      </div>
    </div>
  )
}

/** Стандартна Google-кнопка (fallback, коли Client ID не налаштовано). */
function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-3 rounded-md border bg-background text-sm font-medium shadow-sm transition-colors hover:bg-accent active:scale-[0.99]"
    >
      <GoogleLogo />
      {label}
    </button>
  )
}

function GoogleLogo() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
