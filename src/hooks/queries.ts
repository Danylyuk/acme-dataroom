import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import * as api from '@/db/api'

/**
 * Хуки поверх API-шару. Компоненти працюють ТІЛЬКИ через них — не чіпають Dexie
 * напряму. Це рівно той шар, який завтра переїде на реальний бекенд без змін в UI.
 */

export const qk = {
  datarooms: ['datarooms'] as const,
  dataroom: (id: string) => ['datarooms', id] as const,
  fileCount: (id: string) => ['datarooms', id, 'fileCount'] as const,
  children: (roomId: string, parentId: string | null) =>
    ['nodes', roomId, parentId ?? 'root'] as const,
  breadcrumbs: (nodeId: string | null) => ['breadcrumbs', nodeId ?? 'root'] as const,
  node: (id: string) => ['node', id] as const,
}

/** Після мутації дерева освіжаємо все, що на нього зав'язане в цьому сейфі. */
function invalidateRoom(qc: QueryClient, roomId: string) {
  qc.invalidateQueries({ queryKey: ['nodes', roomId] })
  qc.invalidateQueries({ queryKey: ['breadcrumbs'] })
  qc.invalidateQueries({ queryKey: qk.fileCount(roomId) })
}

// ─────────────── Datarooms ───────────────

export function useDatarooms() {
  return useQuery({ queryKey: qk.datarooms, queryFn: api.listDatarooms })
}

export function useDataroom(id: string) {
  return useQuery({ queryKey: qk.dataroom(id), queryFn: () => api.getDataroom(id) })
}

export function useFileCount(id: string) {
  return useQuery({ queryKey: qk.fileCount(id), queryFn: () => api.countFiles(id) })
}

export function useCreateDataroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createDataroom(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.datarooms }),
  })
}

export function useRenameDataroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.renameDataroom(id, name),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: qk.datarooms })
      qc.invalidateQueries({ queryKey: qk.dataroom(id) })
    },
  })
}

export function useDeleteDataroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteDataroom(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.datarooms }),
  })
}

// ─────────────── Шифрування (замок) ───────────────

export function useLockDataroom(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (passphrase: string) => api.lockDataroom(roomId, passphrase),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.datarooms })
      qc.invalidateQueries({ queryKey: qk.dataroom(roomId) })
    },
  })
}

export function useRemoveLock(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.removeLock(roomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.datarooms })
      qc.invalidateQueries({ queryKey: qk.dataroom(roomId) })
    },
  })
}

// ─────────────── Nodes ───────────────

export function useChildren(roomId: string, parentId: string | null) {
  return useQuery({
    queryKey: qk.children(roomId, parentId),
    queryFn: () => api.listChildren(roomId, parentId),
  })
}

export function useBreadcrumbs(nodeId: string | null) {
  return useQuery({
    queryKey: qk.breadcrumbs(nodeId),
    queryFn: () => api.getBreadcrumbs(nodeId),
  })
}

export function useCreateFolder(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ parentId, name }: { parentId: string | null; name: string }) =>
      api.createFolder(roomId, parentId, name),
    onSuccess: () => invalidateRoom(qc, roomId),
  })
}

export function useUploadFiles(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      parentId,
      files,
      onProgress,
    }: {
      parentId: string | null
      files: File[]
      onProgress?: (done: number, total: number) => void
    }) => {
      const created = []
      for (let i = 0; i < files.length; i++) {
        created.push(await api.uploadFile(roomId, parentId, files[i]))
        onProgress?.(i + 1, files.length)
      }
      return created
    },
    onSuccess: () => invalidateRoom(qc, roomId),
  })
}

export function useRenameNode(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameNode(id, name),
    onSuccess: () => invalidateRoom(qc, roomId),
  })
}

export function useDeleteNode(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteNode(id),
    onSuccess: () => invalidateRoom(qc, roomId),
  })
}

export function useMoveNode(roomId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newParentId }: { id: string; newParentId: string | null }) =>
      api.moveNode(id, newParentId),
    onSuccess: () => invalidateRoom(qc, roomId),
  })
}
