import * as React from 'react'
import { Folder, FolderRoot, Check } from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { listAllFolders, subtreeIds } from '@/db/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface FolderRow {
  id: string
  name: string
  depth: number
  disabled: boolean
}

/** Діалог вибору папки-призначення (включно з коренем). */
export function MoveDialog({
  node,
  roomId,
  open,
  onOpenChange,
  onMove,
}: {
  node: TreeNode | null
  roomId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (nodeId: string, destParentId: string | null) => Promise<void>
}) {
  const { t } = useI18n()
  const [rows, setRows] = React.useState<FolderRow[]>([])
  const [selected, setSelected] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open || !node) return
    let active = true
    ;(async () => {
      const [folders, excluded] = await Promise.all([
        listAllFolders(roomId),
        node.type === 'folder' ? subtreeIds(node.id) : Promise.resolve(new Set<string>()),
      ])
      if (!active) return
      // будуємо ієрархію: діти по parentId (корінь = roomId)
      const byParent = new Map<string, TreeNode[]>()
      for (const f of folders) {
        const list = byParent.get(f.parentId) ?? []
        list.push(f)
        byParent.set(f.parentId, list)
      }
      const result: FolderRow[] = []
      const walk = (parentId: string, depth: number) => {
        const children = (byParent.get(parentId) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
        )
        for (const c of children) {
          result.push({
            id: c.id,
            name: c.name,
            depth,
            // не можна: у власне піддерево, або туди, де вже лежить
            disabled: excluded.has(c.id) || c.id === node.parentId,
          })
          walk(c.id, depth + 1)
        }
      }
      walk(roomId, 0)
      setRows(result)
      setSelected(null)
    })()
    return () => {
      active = false
    }
  }, [open, node, roomId])

  async function submit() {
    if (!node || selected === undefined) return
    setBusy(true)
    try {
      // selected === '__root__' → корінь (null)
      await onMove(node.id, selected === '__root__' ? null : selected)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const rootDisabled = node?.parentId === roomId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('move.title', { name: node?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('move.desc')}</DialogDescription>
        </DialogHeader>

        <div className="my-2 max-h-72 overflow-y-auto rounded-lg border p-1.5">
          {/* Корінь */}
          <FolderOption
            icon={<FolderRoot className="size-4 text-primary" />}
            label={t('move.root')}
            depth={0}
            selected={selected === '__root__'}
            disabled={rootDisabled}
            hint={rootDisabled ? t('move.here') : undefined}
            onSelect={() => setSelected('__root__')}
          />
          {rows.map((r) => (
            <FolderOption
              key={r.id}
              icon={<Folder className="size-4 fill-primary/15 text-primary" />}
              label={r.name}
              depth={r.depth + 1}
              selected={selected === r.id}
              disabled={r.disabled}
              hint={r.disabled && r.id === node?.parentId ? t('move.here') : undefined}
              onSelect={() => setSelected(r.id)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={busy || selected === null}>
            {t('move.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FolderOption({
  icon,
  label,
  depth,
  selected,
  disabled,
  hint,
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  depth: number
  selected: boolean
  disabled?: boolean
  hint?: string
  onSelect: () => void
}) {
  return (
    <button
      disabled={disabled}
      onClick={onSelect}
      style={{ paddingLeft: `${depth * 16 + 10}px` }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:bg-accent',
        selected && 'bg-primary/10 text-foreground',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {selected && <Check className="size-4 text-primary" />}
    </button>
  )
}
