import Dexie, { type EntityTable } from 'dexie'
import type { Dataroom, TreeNode, FileBlob } from './types'

/**
 * IndexedDB через Dexie — єдине джерело правди на клієнті.
 * Три таблиці: сейфи, вузли дерева, блоби файлів (окремо, щоб не тягати
 * важкі бінарники разом з метаданими при кожному лістингу).
 */
export const db = new Dexie('acme-dataroom') as Dexie & {
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
