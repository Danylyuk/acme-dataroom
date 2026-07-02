import Dexie, { type EntityTable } from 'dexie'
import type { Dataroom, TreeNode, FileBlob } from './types'

/**
 * IndexedDB через Dexie — єдине джерело правди на клієнті.
 * Три таблиці: сейфи, вузли дерева, блоби файлів (окремо, щоб не тягати
 * важкі бінарники разом з метаданими при кожному лістингу).
 *
 * База НЕЙМИТЬСЯ по e-mail активного юзера, тож різні акаунти в одному
 * браузері ніколи не бачать даних одне одного. Ключ читаємо один раз при
 * завантаженні модуля; вхід/вихід роблять reload (див. AuthContext), і
 * модуль переініціалізується вже під правильного користувача.
 */
function activeUserKey(): string {
  try {
    // той самий ключ, що AuthContext STORAGE_KEY
    const raw = localStorage.getItem('acme_dataroom_user')
    if (!raw) return 'guest'
    const u = JSON.parse(raw) as { email?: string }
    return u.email ? u.email.trim().toLowerCase() : 'guest'
  } catch {
    return 'guest'
  }
}

export const db = new Dexie(`acme-dataroom::${activeUserKey()}`) as Dexie & {
  datarooms: EntityTable<Dataroom, 'id'>
  nodes: EntityTable<TreeNode, 'id'>
  blobs: EntityTable<FileBlob, 'key'>
}

db.version(1).stores({
  datarooms: 'id, name, createdAt',
  // складені індекси під основні запити: «діти папки X у сейфі Y»
  nodes: 'id, dataroomId, parentId, [dataroomId+parentId], name, type',
  blobs: 'key',
})
