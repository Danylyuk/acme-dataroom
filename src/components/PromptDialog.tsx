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
  type = 'text',
  minLength = 1,
  hint,
  validate,
  autoComplete,
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
  type?: string
  minLength?: number
  autoComplete?: string
  /** приглушена підказка під полем */
  hint?: string
  /** повертає текст помилки або null, якщо все ок */
  validate?: (value: string) => string | null
  onSubmit: (value: string) => void | Promise<void>
}) {
  const [value, setValue] = React.useState(initialValue)
  const [busy, setBusy] = React.useState(false)
  const [touched, setTouched] = React.useState(false)

  // синхронізуємо початкове значення при кожному відкритті
  React.useEffect(() => {
    if (open) {
      setValue(initialValue)
      setTouched(false)
    }
  }, [open, initialValue])

  const error = validate ? validate(value) : null
  const canSubmit = value.trim().length >= minLength && !error

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setBusy(true)
    try {
      await onSubmit(value.trim())
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
              type={type}
              value={value}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-invalid={touched && !!error}
              onChange={(e) => {
                setValue(e.target.value)
                setTouched(true)
              }}
              onFocus={(e) => {
                if (type !== 'text') return
                // при перейменуванні виділяємо ім'я без розширення
                const dot = e.target.value.lastIndexOf('.')
                if (dot > 0) e.target.setSelectionRange(0, dot)
                else e.target.select()
              }}
            />
            {/* Підказку з вимогами показуємо завжди; помилку — лише після вводу */}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {touched && error && value.length > 0 && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
            <Button type="submit" disabled={busy || !canSubmit}>
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
