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

/**
 * Універсальний діалог з одним текстовим полем (створити / перейменувати).
 * Керований: батько тримає open і onSubmit.
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  label = 'Назва',
  placeholder,
  initialValue = '',
  confirmText = 'Зберегти',
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  label?: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  onSubmit: (value: string) => void | Promise<void>
}) {
  const [value, setValue] = React.useState(initialValue)
  const [busy, setBusy] = React.useState(false)

  // синхронізуємо початкове значення при кожному відкритті
  React.useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await onSubmit(trimmed)
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
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="my-5 space-y-2">
            <Label htmlFor="prompt-input">{label}</Label>
            <Input
              id="prompt-input"
              autoFocus
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onFocus={(e) => {
                // при перейменуванні виділяємо ім'я без розширення
                const dot = e.target.value.lastIndexOf('.')
                if (dot > 0) e.target.setSelectionRange(0, dot)
                else e.target.select()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={busy || !value.trim()}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
