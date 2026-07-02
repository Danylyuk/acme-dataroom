import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FolderLock, LayoutGrid, LogOut, HardDrive } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
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
  return (
    <aside className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:h-svh md:w-64 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-3 md:py-5">
      {/* Бренд */}
      <Link to="/" className="flex items-center gap-2.5 md:px-2 md:pb-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FolderLock className="size-4.5" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Acme Data Room</span>
      </Link>

      {/* Навігація — на мобілці ховаємо, лишаємо бренд + профіль */}
      <nav className="hidden flex-1 md:block">
        <SidebarLink to="/" icon={<LayoutGrid className="size-4" />}>
          Усі Data Room-и
        </SidebarLink>
        <div className="mt-6 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/40">
          Сховище
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60">
          <HardDrive className="size-4" /> Локальне (IndexedDB)
        </div>
      </nav>

      <UserMenu />
    </aside>
  )
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
      activeOptions={{ exact: true }}
    >
      {icon}
      {children}
    </Link>
  )
}

function UserMenu() {
  const { user, signOut } = useAuth()
  if (!user) return null
  const initials = user.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email || 'Демо-акаунт'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={signOut}>
          <LogOut /> Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
