import * as React from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { getFileBlob } from '@/db/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/LanguageContext'
import { formatBytes } from '@/lib/utils'

/** Модалка перегляду PDF: тягне Blob з IndexedDB → object URL → <iframe>. */
export function PdfViewerDialog({
  node,
  open,
  onOpenChange,
}: {
  node: TreeNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const [url, setUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    if (open && node) {
      setLoading(true)
      getFileBlob(node.id).then((blob) => {
        if (!active) return
        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
        setLoading(false)
      })
    }
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [open, node])

  function download() {
    if (url && node) {
      const a = document.createElement('a')
      a.href = url
      a.download = node.name
      a.click()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90svh] max-w-4xl flex-col gap-0 p-0 sm:w-[calc(100%-4rem)]">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b px-5 py-3.5 pr-14">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base" title={node?.name}>
              {node?.name}
            </DialogTitle>
            {node?.size != null && (
              <p className="text-xs text-muted-foreground">{formatBytes(node.size)}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={download} disabled={!url}>
            <Download /> <span className="hidden sm:inline">{t('node.download')}</span>
          </Button>
        </DialogHeader>

        <div className="relative flex-1 overflow-hidden rounded-b-xl bg-muted/40">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {url && (
            <iframe
              src={url}
              title={node?.name}
              className="size-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
