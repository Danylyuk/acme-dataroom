import * as React from 'react'
import { Folder, FileText, MoreVertical, Pencil, Trash2, Eye, Download } from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils'

interface NodeTileProps {
  node: TreeNode
  view: 'grid' | 'list'
  onOpen: (node: TreeNode) => void
  onRename: (node: TreeNode) => void
  onDelete: (node: TreeNode) => void
  onDownload: (node: TreeNode) => void
  /** drag-and-drop move */
  onDropNode: (draggedId: string, targetFolderId: string) => void
}

export function NodeTile({
  node,
  view,
  onOpen,
  onRename,
  onDelete,
  onDownload,
  onDropNode,
}: NodeTileProps) {
  const isFolder = node.type === 'folder'
  const [dragOver, setDragOver] = React.useState(false)

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-node-id', node.id)
      e.dataTransfer.effectAllowed = 'move'
    },
    // папки — валідні цілі для дропу
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

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="opacity-70 transition-opacity hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Дії"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {!isFolder && (
          <>
            <DropdownMenuItem onSelect={() => onOpen(node)}>
              <Eye /> Переглянути
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDownload(node)}>
              <Download /> Завантажити
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => onRename(node)}>
          <Pencil /> Перейменувати
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(node)}>
          <Trash2 /> Видалити
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const icon = isFolder ? (
    <Folder className="size-5 fill-primary/15 text-primary" />
  ) : (
    <FileText className="size-5 text-rose-500" />
  )

  if (view === 'list') {
    return (
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
          {formatRelativeTime(node.updatedAt)}
        </span>
        <span className="shrink-0">{menu}</span>
      </div>
    )
  }

  return (
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
        <div className="absolute right-2 top-2">{menu}</div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={node.name}>
          {node.name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isFolder
            ? 'Папка'
            : `${node.size != null ? formatBytes(node.size) : 'PDF'} · ${formatRelativeTime(node.updatedAt)}`}
        </p>
      </div>
    </div>
  )
}
