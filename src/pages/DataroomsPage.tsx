import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  FolderPlus,
  FolderLock,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
} from 'lucide-react'
import type { Dataroom } from '@/db/types'
import {
  useDatarooms,
  useCreateDataroom,
  useRenameDataroom,
  useDeleteDataroom,
  useFileCount,
} from '@/hooks/queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PromptDialog } from '@/components/PromptDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { useI18n } from '@/i18n/LanguageContext'
import { formatRelativeTime } from '@/lib/utils'

export function DataroomsPage() {
  const { t } = useI18n()
  const { data: rooms, isLoading } = useDatarooms()
  const createRoom = useCreateDataroom()
  const renameRoom = useRenameDataroom()
  const deleteRoom = useDeleteDataroom()

  const [createOpen, setCreateOpen] = React.useState(false)
  const [renaming, setRenaming] = React.useState<Dataroom | null>(null)
  const [deleting, setDeleting] = React.useState<Dataroom | null>(null)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('rooms.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('rooms.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <FolderPlus /> {t('rooms.new')}
        </Button>
      </header>

      {isLoading ? (
        <SkeletonGrid />
      ) : !rooms || rooms.length === 0 ? (
        <EmptyState
          icon={<FolderLock />}
          title={t('rooms.emptyTitle')}
          description={t('rooms.emptyDesc')}
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <FolderPlus /> {t('rooms.emptyAction')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <DataroomCard
              key={room.id}
              room={room}
              onRename={() => setRenaming(room)}
              onDelete={() => setDeleting(room)}
            />
          ))}
        </div>
      )}

      {/* Створення */}
      <PromptDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('rooms.createTitle')}
        description={t('rooms.createDesc')}
        label={t('rooms.createLabel')}
        placeholder={t('rooms.createPlaceholder')}
        confirmText={t('rooms.create')}
        onSubmit={async (name) => {
          await createRoom.mutateAsync(name)
          toast.success(t('rooms.created'))
        }}
      />

      {/* Перейменування */}
      <PromptDialog
        open={!!renaming}
        onOpenChange={(o) => !o && setRenaming(null)}
        title={t('rooms.renameTitle')}
        label={t('props.name')}
        confirmText={t('common.save')}
        initialValue={renaming?.name ?? ''}
        onSubmit={async (name) => {
          if (renaming) {
            await renameRoom.mutateAsync({ id: renaming.id, name })
            toast.success(t('rooms.renamed'))
          }
        }}
      />

      {/* Видалення */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('rooms.deleteTitle', { name: deleting?.name ?? '' })}
        confirmText={t('common.delete')}
        description={t('rooms.deleteDesc')}
        onConfirm={async () => {
          if (deleting) {
            await deleteRoom.mutateAsync(deleting.id)
            toast.success(t('rooms.deleted'))
          }
        }}
      />
    </div>
  )
}

function DataroomCard({
  room,
  onRename,
  onDelete,
}: {
  room: Dataroom
  onRename: () => void
  onDelete: () => void
}) {
  const { t, plural, locale } = useI18n()
  const { data: fileCount } = useFileCount(room.id)

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
      <Link
        to="/r/$roomId"
        params={{ roomId: room.id }}
        className="block p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            <FolderLock className="size-5.5" />
          </div>
        </div>
        <h3 className="truncate pr-8 font-semibold" title={room.name}>
          {room.name}
        </h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FileText className="size-3.5" />
            {t('rooms.files', { n: fileCount ?? 0, plural: plural(fileCount ?? 0, 'file') })}
          </span>
          <span>·</span>
          <span>{formatRelativeTime(room.updatedAt, t, locale)}</span>
        </div>
      </Link>

      {/* Меню дій — поверх лінку */}
      <div className="absolute right-3 top-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-60 transition-opacity hover:opacity-100"
              aria-label="Дії"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRename}>
              <Pencil /> Перейменувати
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 /> Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[132px] animate-pulse rounded-xl border bg-muted/40" />
      ))}
    </div>
  )
}
