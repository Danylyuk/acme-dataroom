import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Тости в стилі дизайн-системи (використовує наші CSS-змінні). */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
