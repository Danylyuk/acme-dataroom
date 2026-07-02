import * as React from 'react'
import {
  Folder,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Download,
  FolderInput,
  Info,
} from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useI18n } from '@/i18n/LanguageContext'
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils'

interface NodeActions {
  onOpen: (node: TreeNode) => void
  onRename: (node: TreeNode) => void
  onDelete: (node: TreeNode) => void
  onDownload: (node: TreeNode) => void
  onMove: (node: TreeNode) => void
  onProperties: (node: TreeNode) => void
}

interface NodeTileProps extends NodeActions {
  node: TreeNode
  view: 'grid' | 'list'
  /** drag-and-drop move */
  onDropNode: (draggedId: string, targetFolderId: string) => void
}

/** Опис дій — один раз, рендериться і в ⋮-меню, і в ПКМ-меню. */
interface ActionDef {
  key: string
  label: string
  icon: React.ReactNode
  run: () => void
  destructive?: boolean
  separatorBefore?: boolean
}

function useActions(node: TreeNode, a: NodeActions): ActionDef[] {
  const { t } = useI18n()
  const isFolder = node.type === 'folder'
  const list: ActionDef[] = []
  if (!isFolder) {
    list.push({ key: 'preview', label: t('node.preview'), icon: <Eye />, run: () => a.onOpen(node) })
    list.push({ key: 'download', label: t('node.download'), icon: <Download />, run: () => a.onDownload(node) })
  }
  list.push({ key: 'rename', label: t('node.rename'), icon: <Pencil />, run: () => a.onRename(node), separatorBefore: !isFolder })
  list.push({ key: 'move', label: t('node.move'), icon: <FolderInput />, run: () => a.onMove(node) })
  list.push({ key: 'props', label: t('node.properties'), icon: <Info />, run: () => a.onProperties(node) })
  list.push({ key: 'delete', label: t('node.delete'), icon: <Trash2 />, run: () => a.onDelete(node), destructive: true, separatorBefore: true })
  return list
}

export function NodeTile(props: NodeTileProps) {
  const { node, view, onOpen, onDropNode } = props
  const { t } = useI18n()
  const { locale } = useI18n()
  const isFolder = node.type === 'folder'
  const [dragOver, setDragOver] = React.useState(false)
  const actions = useActions(node, props)

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-node-id', node.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    ...(isFolder && {
      onDragOver: (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('application/x-node-id')) {
          e.preventDefault()
          setDragOver(true)
        }
      },
      onDragLeave: () => setDragOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const draggedId = e.dataTransfer.getData('application/x-node-id')
        if (draggedId && draggedId !== node.id) onDropNode(draggedId, node.id)
      },
    }),
  }

  // ⋮-меню (dropdown)
  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-70 transition-opacity hover:opacity-100 data-[state=open]:opacity-100"
          aria-label={t('node.properties')}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((act) => (
          <React.Fragment key={act.key}>
            {act.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={act.destructive ? 'destructive' : 'default'}
              onSelect={act.run}
            >
              {act.icon} {act.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const icon = isFolder ? (
    <Folder className="size-5 fill-primary/15 text-primary" />
  ) : (
    <FileText className="size-5 text-rose-500" />
  )

  const body =
    view === 'list' ? (
      <div
        {...dragProps}
        onClick={() => onOpen(node)}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-accent',
          dragOver && 'border-primary bg-primary/5 ring-2 ring-primary/30',
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={node.name}>
          {node.name}
        </span>
        <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
          {!isFolder && node.size != null ? formatBytes(node.size) : '—'}
        </span>
        <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground md:block">
          {formatRelativeTime(node.updatedAt, t, locale)}
        </span>
        <span className="shrink-0">{dropdownMenu}</span>
      </div>
    ) : (
      <div
        {...dragProps}
        onClick={() => onOpen(node)}
        className={cn(
          'group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm',
          dragOver && 'border-primary bg-primary/5 ring-2 ring-primary/30',
        )}
      >
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              isFolder ? 'bg-primary/10' : 'bg-rose-500/10',
            )}
          >
            {icon}
          </div>
          <div className="absolute right-2 top-2">{dropdownMenu}</div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={node.name}>
            {node.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isFolder
              ? t('node.folder')
              : `${node.size != null ? formatBytes(node.size) : t('node.file')} · ${formatRelativeTime(node.updatedAt, t, locale)}`}
          </p>
        </div>
      </div>
    )

  // Обгортаємо в ПКМ-контекстне меню
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{body}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((act) => (
          <React.Fragment key={act.key}>
            {act.separatorBefore && <ContextMenuSeparator />}
            <ContextMenuItem
              variant={act.destructive ? 'destructive' : 'default'}
              onSelect={act.run}
            >
              {act.icon} {act.label}
            </ContextMenuItem>
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}
