import { GoogleLogin } from '@react-oauth/google'
import { ShieldCheck, Lock, FolderLock, FileCheck2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuth, decodeGoogleJwt, type User } from './AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function LoginPage() {
  const { signIn } = useAuth()

  function handleGoogle(credential?: string) {
    if (!credential) {
      toast.error('Не вдалося увійти через Google')
      return
    }
    const p = decodeGoogleJwt(credential)
    const user: User = {
      name: p.name ?? 'Користувач',
      email: p.email ?? '',
      picture: p.picture,
      provider: 'google',
    }
    signIn(user)
    toast.success(`Вітаємо, ${user.name.split(' ')[0]}!`)
  }

  function handleDemo() {
    signIn({ name: 'Demo User', email: 'demo@acmecorp.com', provider: 'demo' })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Лівий брендовий графітовий панель — ховаємо на мобілці */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--primary)' }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderLock className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Acme Data Room</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Безпечний простір для документів вашої угоди
          </h1>
          <p className="max-w-md text-sidebar-foreground/70">
            Організовуйте, зберігайте й діліться конфіденційними документами
            due diligence — в одному захищеному сховищі.
          </p>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-primary" /> Ізольовані Data Room-и під кожну угоду
            </li>
            <li className="flex items-center gap-3">
              <FileCheck2 className="size-4 text-primary" /> Вкладені папки, версії, миттєвий перегляд
            </li>
            <li className="flex items-center gap-3">
              <Lock className="size-4 text-primary" /> Доступ лише для авторизованих
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/50">
          © {new Date().getFullYear()} Acme Corp · Confidential
        </p>
      </div>

      {/* Права панель — вхід */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          {/* мобільний логотип */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderLock className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Acme Data Room</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Вхід у сховище</h2>
            <p className="text-sm text-muted-foreground">
              Увійдіть, щоб отримати доступ до Data Room-ів.
            </p>
          </div>

          <div className="space-y-4">
            {GOOGLE_CLIENT_ID ? (
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={(r) => handleGoogle(r.credential)}
                  onError={() => toast.error('Помилка входу через Google')}
                  theme="outline"
                  size="large"
                  width="320"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Google-логін не налаштовано (немає{' '}
                <code className="text-xs">VITE_GOOGLE_CLIENT_ID</code>). Скористайтесь
                демо-входом нижче.
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">або</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemo}>
              Продовжити в демо-режимі
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Демо-режим створено на випадок, якщо Google-вхід недоступний у вашому
            середовищі — щоб рецензент точно потрапив усередину.
          </p>
        </div>
      </div>
    </div>
  )
}
