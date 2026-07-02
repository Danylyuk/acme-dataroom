import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Lock, Loader2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/LanguageContext'

/** Екран введення пароля для зашифрованого Data Room. */
export function UnlockScreen({
  roomName,
  onUnlock,
}: {
  roomName: string
  onUnlock: (passphrase: string) => Promise<boolean>
}) {
  const { t } = useI18n()
  const [pass, setPass] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!pass) return
    setBusy(true)
    setError(false)
    const ok = await onUnlock(pass)
    setBusy(false)
    if (!ok) {
      setError(true)
      setPass('')
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> {t('shell.allRooms')}
        </Link>

        <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight">{t('lock.unlockTitle')}</h1>
        <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{roomName}</p>
        <p className="mt-3 text-sm text-muted-foreground">{t('lock.unlockDesc')}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-pass">{t('lock.passLabel')}</Label>
            <Input
              id="unlock-pass"
              type="password"
              autoFocus
              value={pass}
              placeholder="••••••••"
              aria-invalid={error}
              onChange={(e) => {
                setPass(e.target.value)
                setError(false)
              }}
            />
            {error && <p className="text-sm text-destructive">{t('lock.wrongPass')}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy || !pass}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock />} {t('lock.unlock')}
          </Button>
        </form>
      </div>
    </div>
  )
}
