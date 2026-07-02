import * as React from 'react'
import { Lock, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/LanguageContext'

/**
 * Модалка розблокування зашифрованого Data Room (backdrop blur).
 * Закриття (X / клік поза / Esc) → onCancel (повернення до списку).
 */
export function UnlockScreen({
  roomName,
  onUnlock,
  onCancel,
}: {
  roomName: string
  onUnlock: (passphrase: string) => Promise<boolean>
  onCancel: () => void
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
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <DialogTitle>{t('lock.unlockTitle')}</DialogTitle>
          <p className="truncate text-sm font-medium text-foreground">{roomName}</p>
          <DialogDescription>{t('lock.unlockDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unlock-pass">{t('lock.passLabel')}</Label>
            <Input
              id="unlock-pass"
              type="password"
              autoFocus
              autoComplete="off"
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
      </DialogContent>
    </Dialog>
  )
}
