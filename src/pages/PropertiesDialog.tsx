import * as React from 'react'
import { Folder, FileText } from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { getBreadcrumbs, countSubtree } from '@/db/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/i18n/LanguageContext'
import { formatBytes, formatDateTime } from '@/lib/utils'

/** Діалог властивостей папки/файлу (аналог Windows «Properties»). */
export function PropertiesDialog({
  node,
  roomName,
  open,
  onOpenChange,
}: {
  node: TreeNode | null
  roomName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, locale } = useI18n()
  const [path, setPath] = React.useState('')
  const [contains, setContains] = React.useState<{ folders: number; files: number } | null>(null)

  React.useEffect(() => {
    if (!open || !node) return
    let active = true
    ;(async () => {
      const crumbs = await getBreadcrumbs(node.parentId === node.dataroomId ? null : node.parentId)
      if (!active) return
      const segments = [roomName, ...crumbs.map((c) => c.name)]
      setPath(segments.join(' / '))
      if (node.type === 'folder') setContains(await countSubtree(node.id))
      else setContains(null)
    })()
    return () => {
      active = false
    }
  }, [open, node, roomName])

  if (!node) return null
  const isFolder = node.type === 'folder'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('props.title')}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex items-center gap-3 border-b pb-4">
          <div
            className={
              'flex size-12 items-center justify-center rounded-xl ' +
              (isFolder ? 'bg-primary/10' : 'bg-rose-500/10')
            }
          >
            {isFolder ? (
              <Folder className="size-6 fill-primary/15 text-primary" />
            ) : (
              <FileText className="size-6 text-rose-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium" title={node.name}>
              {node.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {isFolder ? t('props.typeFolder') : t('props.typeFile')}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 py-2 text-sm">
          <Row label={t('props.type')}>
            {isFolder ? t('props.typeFolder') : t('props.typeFile')}
          </Row>
          {isFolder ? (
            <Row label={t('props.contains')}>
              {contains
                ? t('props.containsVal', { folders: contains.folders, files: contains.files })
                : '…'}
            </Row>
          ) : (
            <Row label={t('props.size')}>
              {node.size != null ? formatBytes(node.size) : '—'}
            </Row>
          )}
          <Row label={t('props.location')}>
            <span className="break-words">{path || '…'}</span>
          </Row>
          <Row label={t('props.created')}>{formatDateTime(node.createdAt, locale)}</Row>
          <Row label={t('props.modified')}>{formatDateTime(node.updatedAt, locale)}</Row>
        </dl>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </>
  )
}
