import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n/LanguageContext'
import { isStrongPassword } from '@/lib/utils'

/**
 * Діалог захисту Data Room паролем: пароль + повтор, валідація сили та збігу.
 * Помилки показуються лише після вводу; підказка з вимогами — завжди.
 */
export function LockDialog({
  roomName,
  open,
  onOpenChange,
  onConfirm,
}: {
  roomName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (passphrase: string) => Promise<void>
}) {
  const { t } = useI18n()
  const [pass, setPass] = React.useState('')
  const [repeat, setRepeat] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setPass('')
      setRepeat('')
    }
  }, [open])

  const passError = pass.length > 0 && !isStrongPassword(pass) ? t('lock.passWeak') : null
  const repeatError = repeat.length > 0 && repeat !== pass ? t('lock.passMismatch') : null
  const canSubmit = isStrongPassword(pass) && pass === repeat

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      await onConfirm(pass)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t('lock.setTitle', { name: roomName })}</DialogTitle>
            <DialogDescription>{t('lock.setDesc')}</DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lock-pass">{t('lock.passLabel')}</Label>
              <Input
                id="lock-pass"
                type="password"
                autoFocus
                autoComplete="new-password"
                value={pass}
                placeholder="••••••••"
                aria-invalid={!!passError}
                onChange={(e) => setPass(e.target.value)}
              />
              {passError ? (
                <p className="text-sm text-destructive">{passError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('lock.passHint')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lock-repeat">{t('lock.repeatLabel')}</Label>
              <Input
                id="lock-repeat"
                type="password"
                autoComplete="new-password"
                value={repeat}
                placeholder="••••••••"
                aria-invalid={!!repeatError}
                onChange={(e) => setRepeat(e.target.value)}
              />
              {repeatError && <p className="text-sm text-destructive">{repeatError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={busy || !canSubmit}>
              {t('lock.encrypt')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
