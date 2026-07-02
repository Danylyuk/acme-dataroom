import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/auth/LoginPage'
import { useAuth } from '@/auth/AuthContext'
import { DataroomsPage } from '@/pages/DataroomsPage'
import { DataroomPage } from '@/pages/DataroomPage'

/** Корінь: гейт автентифікації. Немає юзера → екран входу. */
function RootComponent() {
  const { user } = useAuth()
  if (!user) return <LoginPage />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

const rootRoute = createRootRoute({ component: RootComponent })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DataroomsPage,
})

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/r/$roomId',
  // поточна папка живе в URL (?folder=...), тож посилання шеряться і працює back/forward
  validateSearch: (search: Record<string, unknown>): { folder?: string } => ({
    folder: typeof search.folder === 'string' ? search.folder : undefined,
  }),
  component: DataroomPage,
})

const routeTree = rootRoute.addChildren([indexRoute, roomRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
