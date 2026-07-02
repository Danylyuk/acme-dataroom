import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { FolderLock, LayoutGrid, LogOut, Pencil, ShieldCheck, Folders } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useI18n } from '@/i18n/LanguageContext'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { PromptDialog } from '@/components/PromptDialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Загальний каркас авторизованої частини: графітовий сайдбар + контент. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}

function Sidebar() {
  const { t } = useI18n()
  return (
    <aside className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:h-svh md:w-64 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-3 md:py-5">
      {/* Бренд */}
      <Link to="/" className="flex items-center gap-2.5 md:px-2 md:pb-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FolderLock className="size-4.5" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">{t('brand')}</span>
      </Link>

      {/* Навігація — на мобілці ховаємо, лишаємо бренд + профіль */}
      <nav className="hidden flex-1 space-y-1 md:block">
        <SidebarLink filter={undefined} icon={<LayoutGrid className="size-4" />}>
          {t('shell.allRooms')}
        </SidebarLink>
        <SidebarLink filter="plain" icon={<Folders className="size-4" />}>
          {t('shell.roomsPlain')}
        </SidebarLink>
        <SidebarLink filter="encrypted" icon={<ShieldCheck className="size-4" />}>
          {t('shell.roomsEncrypted')}
        </SidebarLink>
      </nav>

      {/* перемикач мови — desktop */}
      <div className="mt-auto hidden px-2 pb-3 md:block">
        <LanguageSwitch variant="dark" />
      </div>

      <UserMenu />
    </aside>
  )
}

function SidebarLink({
  filter,
  icon,
  children,
}: {
  filter: 'plain' | 'encrypted' | undefined
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const search = useSearch({ strict: false }) as { filter?: string }
  const active = (search.filter ?? undefined) === filter
  return (
    <Link
      to="/"
      search={{ filter }}
      className={
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')
      }
    >
      {icon}
      {children}
    </Link>
  )
}

function UserMenu() {
  const { user, signOut, updateProfile } = useAuth()
  const { t } = useI18n()
  const [renameOpen, setRenameOpen] = React.useState(false)
  if (!user) return null
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring md:mt-auto md:w-full">
          <Avatar>
            {user.picture && <AvatarImage src={user.picture} alt={user.name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 md:block">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-sidebar-foreground/50">{user.email}</div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-popover-foreground">{user.name}</span>
            <span className="truncate font-normal">{user.email || t('shell.demoAccount')}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil /> {t('shell.rename')}
          </DropdownMenuItem>
          {/* перемикач мови в меню — ТІЛЬКИ мобілка (на десктопі він у сайдбарі) */}
          <div className="flex items-center justify-between px-2.5 py-1.5 md:hidden">
            <span className="text-sm text-muted-foreground">{t('shell.language')}</span>
            <LanguageSwitch />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={signOut}>
            <LogOut /> {t('shell.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PromptDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={t('shell.renameTitle')}
        label={t('shell.nameLabel')}
        initialValue={user.name}
        confirmText={t('common.save')}
        onSubmit={(name) => {
          updateProfile({ name })
          toast.success(t('shell.nameUpdated'))
        }}
      />
    </>
  )
}
