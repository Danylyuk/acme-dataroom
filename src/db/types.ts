/**
 * Доменні типи Data Room.
 *
 * Дерево зберігаємо ПЛОСКИМ списком вузлів (parentId), а не вкладеним JSON:
 * так move/rename/delete — це зміна одного поля, а дерево збираємо в памʼяті.
 */

export type NodeType = 'folder' | 'file'

/** Сейф верхнього рівня (диск). У ТЗ — «Datarooms», множина. */
export interface Dataroom {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  /** true → вміст зашифровано паролем (AES-256-GCM at-rest) */
  encrypted?: boolean
  /** криптопараметри (salt, wrappedDEK…); присутні коли encrypted */
  crypto?: import('./crypto').DataroomCrypto
}

/** Вузол дерева — папка або файл. */
export interface TreeNode {
  id: string
  dataroomId: string
  /**
   * Батьківська папка. Для кореневих вузлів parentId === dataroomId.
   * (IndexedDB не індексує null як ключ, тож корінь позначаємо id сейфу,
   *  а не null — так складений індекс [dataroomId+parentId] завжди валідний.)
   */
  parentId: string
  type: NodeType
  name: string
  createdAt: number
  updatedAt: number

  // --- тільки для type === 'file' ---
  /** байти */
  size?: number
  mime?: string
  /** ключ у таблиці blobs (= node.id) */
  blobKey?: string
}

/** Сам бінарник PDF, зберігається окремо від метаданих. */
export interface FileBlob {
  key: string
  /** plaintext-Blob, або шифротекст коли iv присутній */
  data: Blob
  /** IV шифрування; присутній → data зашифровано DEK-ом сейфу */
  iv?: number[]
}
