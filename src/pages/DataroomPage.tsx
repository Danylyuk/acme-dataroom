import * as React from 'react'
import { useParams, useSearch, useNavigate, Link } from '@tanstack/react-router'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  ChevronRight,
  FolderPlus,
  Upload,
  Search,
  LayoutGrid,
  List,
  Home,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import type { TreeNode } from '@/db/types'
import { getFileBlob, countSubtree } from '@/db/api'
import {
  useDataroom,
  useChildren,
  useBreadcrumbs,
  useCreateFolder,
  useUploadFiles,
  useRenameNode,
  useDeleteNode,
  useMoveNode,
} from '@/hooks/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PromptDialog } from '@/components/PromptDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { NodeTile } from './NodeTile'
import { PdfViewerDialog } from './PdfViewerDialog'
import { cn } from '@/lib/utils'

export function DataroomPage() {
  const { roomId } = useParams({ from: '/r/$roomId' })
  const { folder } = useSearch({ from: '/r/$roomId' })
  const navigate = useNavigate()
  const currentFolder = folder ?? null

  const { data: room } = useDataroom(roomId)
  const { data: children, isLoading } = useChildren(roomId, currentFolder)
  const { data: crumbs } = useBreadcrumbs(currentFolder)

  const createFolder = useCreateFolder(roomId)
  const uploadFiles = useUploadFiles(roomId)
  const renameNode = useRenameNode(roomId)
  const deleteNode = useDeleteNode(roomId)
  const moveNode = useMoveNode(roomId)

  const [view, setView] = React.useState<'grid' | 'list'>('grid')
  const [query, setQuery] = React.useState('')
  const [newFolderOpen, setNewFolderOpen] = React.useState(false)
  const [renaming, setRenaming] = React.useState<TreeNode | null>(null)
  const [deleting, setDeleting] = React.useState<TreeNode | null>(null)
  const [deleteInfo, setDeleteInfo] = React.useState<{ folders: number; files: number } | null>(null)
  const [viewing, setViewing] = React.useState<TreeNode | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function goToFolder(id: string | null) {
    navigate({ to: '/r/$roomId', params: { roomId }, search: { folder: id ?? undefined } })
  }

  // ── Upload (тільки PDF) ──
  const handleFiles = React.useCallback(
    async (files: File[]) => {
      const pdfs = files.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      const rejected = files.length - pdfs.length
      if (rejected > 0) toast.warning(`Пропущено ${rejected}: приймаються лише PDF`)
      if (pdfs.length === 0) return

      const tid = toast.loading(`Завантаження 0/${pdfs.length}…`)
      try {
        await uploadFiles.mutateAsync({
          parentId: currentFolder,
          files: pdfs,
          onProgress: (done, total) => toast.loading(`Завантаження ${done}/${total}…`, { id: tid }),
        })
        toast.success(`Завантажено ${pdfs.length} ${pdfs.length === 1 ? 'файл' : 'файлів'}`, { id: tid })
      } catch {
        toast.error('Помилка завантаження', { id: tid })
      }
    },
    [currentFolder, uploadFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: { 'application/pdf': ['.pdf'] },
    noClick: true,
    noKeyboard: true,
  })

  // ── Open (папка → навігація, файл → перегляд) ──
  function openNode(node: TreeNode) {
    if (node.type === 'folder') goToFolder(node.id)
    else setViewing(node)
  }

  async function downloadNode(node: TreeNode) {
    const blob = await getFileBlob(node.id)
    if (!blob) return toast.error('Файл не знайдено')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = node.name
    a.click()
    URL.revokeObjectURL(url)
  }

  async function askDelete(node: TreeNode) {
    setDeleting(node)
    if (node.type === 'folder') setDeleteInfo(await countSubtree(node.id))
    else setDeleteInfo(null)
  }

  async function handleMove(draggedId: string, targetFolderId: string) {
    try {
      await moveNode.mutateAsync({ id: draggedId, newParentId: targetFolderId })
      toast.success('Переміщено')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не вдалося перемістити')
    }
  }

  const filtered = React.useMemo(() => {
    if (!children) return []
    if (!query.trim()) return children
    const q = query.toLowerCase()
    return children.filter((n) => n.name.toLowerCase().includes(q))
  }, [children, query])

  return (
    <div className="flex min-h-svh flex-col" {...getRootProps()}>
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />

      {/* Хедер: breadcrumbs + дії */}
      <header className="sticky top-0 z-10 border-b bg-background/80 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <Breadcrumbs roomName={room?.name ?? '…'} crumbs={crumbs ?? []} onNavigate={goToFolder} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload /> Завантажити PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus /> Нова папка
            </Button>

            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Пошук у цій папці…"
                className="pl-8"
              />
            </div>

            <div className="flex rounded-md border p-0.5">
              <ViewToggle active={view === 'grid'} onClick={() => setView('grid')}>
                <LayoutGrid className="size-4" />
              </ViewToggle>
              <ViewToggle active={view === 'list'} onClick={() => setView('list')}>
                <List className="size-4" />
              </ViewToggle>
            </div>
          </div>
        </div>
      </header>

      {/* Контент */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          query ? (
            <EmptyState icon={<Search />} title="Нічого не знайдено" description={`За запитом «${query}» немає файлів чи папок.`} />
          ) : (
            <EmptyState
              icon={<FolderOpen />}
              title="Порожня папка"
              description="Перетягніть PDF сюди або скористайтесь кнопками вгорі, щоб додати документи."
              action={
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload /> Завантажити PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}>
                    <FolderPlus /> Нова папка
                  </Button>
                </div>
              }
            />
          )
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((node) => (
              <NodeTile key={node.id} node={node} view="grid" onOpen={openNode} onRename={setRenaming} onDelete={askDelete} onDownload={downloadNode} onDropNode={handleMove} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border">
            <div className="flex items-center gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="flex-1 pl-8">Назва</span>
              <span className="hidden w-24 text-right sm:block">Розмір</span>
              <span className="hidden w-28 text-right md:block">Змінено</span>
              <span className="w-8" />
            </div>
            <div className="p-1.5">
              {filtered.map((node) => (
                <NodeTile key={node.id} node={node} view="list" onOpen={openNode} onRename={setRenaming} onDelete={askDelete} onDownload={downloadNode} onDropNode={handleMove} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Оверлей drag-and-drop */}
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card px-10 py-8 shadow-lg">
            <Upload className="size-8 text-primary" />
            <p className="font-medium">Відпустіть, щоб завантажити PDF</p>
          </div>
        </div>
      )}

      {/* Діалоги */}
      <PromptDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="Нова папка"
        label="Назва папки"
        placeholder="Фінансові звіти"
        confirmText="Створити"
        onSubmit={async (name) => {
          await createFolder.mutateAsync({ parentId: currentFolder, name })
          toast.success('Папку створено')
        }}
      />
      <PromptDialog
        open={!!renaming}
        onOpenChange={(o) => !o && setRenaming(null)}
        title={renaming?.type === 'folder' ? 'Перейменувати папку' : 'Перейменувати файл'}
        label="Назва"
        initialValue={renaming?.name ?? ''}
        onSubmit={async (name) => {
          if (renaming) {
            await renameNode.mutateAsync({ id: renaming.id, name })
            toast.success('Назву оновлено')
          }
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && (setDeleting(null), setDeleteInfo(null))}
        title={`Видалити «${deleting?.name}»?`}
        description={
          deleting?.type === 'folder' && deleteInfo && (deleteInfo.files > 0 || deleteInfo.folders > 0)
            ? `Разом з папкою буде видалено ${deleteInfo.folders} вкл. папок і ${deleteInfo.files} файлів. Дію не можна скасувати.`
            : 'Дію не можна скасувати.'
        }
        onConfirm={async () => {
          if (deleting) {
            await deleteNode.mutateAsync(deleting.id)
            toast.success('Видалено')
          }
        }}
      />
      <PdfViewerDialog node={viewing} open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  )
}

function Breadcrumbs({
  roomName,
  crumbs,
  onNavigate,
}: {
  roomName: string
  crumbs: TreeNode[]
  onNavigate: (id: string | null) => void
}) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      <Link to="/" className="flex items-center gap-1 rounded px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground">
        <Home className="size-3.5" />
      </Link>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
      <button
        onClick={() => onNavigate(null)}
        className={cn(
          'shrink-0 rounded px-1.5 py-1 font-medium transition-colors hover:text-foreground',
          crumbs.length === 0 ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {roomName}
      </button>
      {crumbs.map((c, i) => (
        <React.Fragment key={c.id}>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
          <button
            onClick={() => onNavigate(c.id)}
            className={cn(
              'shrink-0 truncate rounded px-1.5 py-1 transition-colors hover:text-foreground',
              i === crumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {c.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  )
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded transition-colors',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
