import { db } from './db'
import type { Dataroom, TreeNode } from './types'
import * as vault from './crypto'

/**
 * "API-шар". Усі операції зібрані тут як асинхронні функції — так, ніби це
 * клієнт до бекенду. Компоненти НЕ знають, що всередині Dexie: завтра ці ж
 * сигнатури можна підмінити на fetch до NestJS, і UI не зміниться.
 */

const uid = () => crypto.randomUUID()
const now = () => Date.now()

// ─────────────────────────── Datarooms ───────────────────────────

export async function listDatarooms(): Promise<Dataroom[]> {
  const rooms = await db.datarooms.orderBy('createdAt').reverse().toArray()
  return rooms
}

export async function getDataroom(id: string): Promise<Dataroom | undefined> {
  return db.datarooms.get(id)
}

export async function createDataroom(name: string): Promise<Dataroom> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Назва не може бути порожньою')
  const ts = now()
  const room: Dataroom = { id: uid(), name: trimmed, createdAt: ts, updatedAt: ts }
  await db.datarooms.add(room)
  return room
}

export async function renameDataroom(id: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Назва не може бути порожньою')
  await db.datarooms.update(id, { name: trimmed, updatedAt: now() })
}

/** Видаляє сейф разом з усіма вузлами і блобами всередині. */
export async function deleteDataroom(id: string): Promise<void> {
  await db.transaction('rw', db.datarooms, db.nodes, db.blobs, async () => {
    const nodes = await db.nodes.where('dataroomId').equals(id).toArray()
    const blobKeys = nodes.filter((n) => n.blobKey).map((n) => n.blobKey!)
    await db.blobs.bulkDelete(blobKeys)
    await db.nodes.where('dataroomId').equals(id).delete()
    await db.datarooms.delete(id)
  })
}

/** Скільки файлів у сейфі — для карточки на головній. */
export async function countFiles(dataroomId: string): Promise<number> {
  return db.nodes
    .where('dataroomId')
    .equals(dataroomId)
    .filter((n) => n.type === 'file')
    .count()
}

// ─────────────────────────── Nodes (дерево) ───────────────────────────

/** Кореневий "parentId" сейфу = його власний id (див. коментар у TreeNode). */
function rootKey(dataroomId: string, parentId: string | null): string {
  return parentId ?? dataroomId
}

/** Прямі діти папки (parentId=null → корінь сейфу). Папки спершу, потім за назвою. */
export async function listChildren(
  dataroomId: string,
  parentId: string | null,
): Promise<TreeNode[]> {
  const children = await db.nodes
    .where('[dataroomId+parentId]')
    .equals([dataroomId, rootKey(dataroomId, parentId)])
    .toArray()
  return sortNodes(children)
}

export function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name, 'uk', { numeric: true, sensitivity: 'base' })
  })
}

export async function getNode(id: string): Promise<TreeNode | undefined> {
  return db.nodes.get(id)
}

/** Усі папки сейфу — для діалогу «Перемістити». */
export async function listAllFolders(dataroomId: string): Promise<TreeNode[]> {
  return db.nodes
    .where('dataroomId')
    .equals(dataroomId)
    .filter((n) => n.type === 'folder')
    .toArray()
}

/** id-множина піддерева вузла (сам вузол + нащадки) — щоб не переносити в себе. */
export async function subtreeIds(rootId: string): Promise<Set<string>> {
  const nodes = await collectSubtree(rootId)
  return new Set(nodes.map((n) => n.id))
}

/** Ланцюжок предків від кореня до вузла — для breadcrumbs. */
export async function getBreadcrumbs(nodeId: string | null): Promise<TreeNode[]> {
  const chain: TreeNode[] = []
  let current = nodeId ? await db.nodes.get(nodeId) : undefined
  while (current) {
    chain.unshift(current)
    // корінь досягнуто, коли parentId вказує на сам сейф
    current =
      current.parentId !== current.dataroomId
        ? await db.nodes.get(current.parentId)
        : undefined
  }
  return chain
}

// ─────────────────────────── Folders ───────────────────────────

export async function createFolder(
  dataroomId: string,
  parentId: string | null,
  name: string,
): Promise<TreeNode> {
  const pid = rootKey(dataroomId, parentId)
  const finalName = await resolveNameConflict(dataroomId, pid, name.trim() || 'Нова папка')
  const ts = now()
  const node: TreeNode = {
    id: uid(),
    dataroomId,
    parentId: pid,
    type: 'folder',
    name: finalName,
    createdAt: ts,
    updatedAt: ts,
  }
  await db.nodes.add(node)
  return node
}

// ─────────────────────────── Files ───────────────────────────

export async function uploadFile(
  dataroomId: string,
  parentId: string | null,
  file: File,
): Promise<TreeNode> {
  const pid = rootKey(dataroomId, parentId)
  const finalName = await resolveNameConflict(dataroomId, pid, file.name)
  const ts = now()
  const id = uid()
  const node: TreeNode = {
    id,
    dataroomId,
    parentId: pid,
    type: 'file',
    name: finalName,
    createdAt: ts,
    updatedAt: ts,
    size: file.size,
    mime: file.type || 'application/pdf',
    blobKey: id,
  }

  // Якщо сейф зашифрований — шифруємо байти перед записом (потрібен розблокований DEK).
  const room = await db.datarooms.get(dataroomId)
  let blobRec: { key: string; data: Blob; iv?: number[] } = { key: id, data: file }
  if (room?.encrypted) {
    const dek = vault.getSessionKey(dataroomId)
    if (!dek) throw new Error('Data Room заблоковано')
    const { iv, cipher } = await vault.encryptBytes(dek, await file.arrayBuffer())
    blobRec = { key: id, data: new Blob([cipher]), iv }
  }

  await db.transaction('rw', db.nodes, db.blobs, async () => {
    await db.blobs.add(blobRec)
    await db.nodes.add(node)
  })
  return node
}

/** Повертає Blob файлу (для перегляду / завантаження); прозоро розшифровує. */
export async function getFileBlob(nodeId: string): Promise<Blob | undefined> {
  const rec = await db.blobs.get(nodeId)
  if (!rec) return undefined
  if (!rec.iv) return rec.data
  // зашифрований — потрібен розблокований DEK сейфу
  const node = await db.nodes.get(nodeId)
  const dek = node && vault.getSessionKey(node.dataroomId)
  if (!dek) throw new Error('Data Room заблоковано')
  const plain = await vault.decryptBytes(dek, rec.iv, await rec.data.arrayBuffer())
  return new Blob([plain], { type: node?.mime || 'application/pdf' })
}

// ─────────────────────────── Шифрування (замок на Data Room) ───────────────────────────

export const isUnlocked = vault.isUnlocked

/** Ставить пароль на сейф: генерує ключ, шифрує всі наявні файли. */
export async function lockDataroom(roomId: string, passphrase: string): Promise<void> {
  const room = await db.datarooms.get(roomId)
  if (!room) throw new Error('Data Room не знайдено')
  if (room.encrypted) throw new Error('Вже зашифровано')
  const { params, dek } = await vault.createCrypto(passphrase)

  // шифруємо всі наявні блоби сейфу
  const fileNodes = await db.nodes
    .where('dataroomId')
    .equals(roomId)
    .filter((n) => n.type === 'file' && !!n.blobKey)
    .toArray()
  for (const n of fileNodes) {
    const rec = await db.blobs.get(n.blobKey!)
    if (!rec || rec.iv) continue
    const { iv, cipher } = await vault.encryptBytes(dek, await rec.data.arrayBuffer())
    await db.blobs.put({ key: rec.key, data: new Blob([cipher]), iv })
  }

  await db.datarooms.update(roomId, { encrypted: true, crypto: params, updatedAt: now() })
  vault.setSessionKey(roomId, dek)
}

/** Розблоковує сейф на час сесії. Повертає false при невірному паролі. */
export async function unlockDataroom(roomId: string, passphrase: string): Promise<boolean> {
  const room = await db.datarooms.get(roomId)
  if (!room?.crypto) return true // не зашифрований
  try {
    const dek = await vault.unwrapDek(passphrase, room.crypto)
    vault.setSessionKey(roomId, dek)
    return true
  } catch {
    return false
  }
}

/** Знімає захист: розшифровує всі файли назад у plaintext (потрібен розблокований сейф). */
export async function removeLock(roomId: string): Promise<void> {
  const room = await db.datarooms.get(roomId)
  if (!room?.encrypted) return
  const dek = vault.getSessionKey(roomId)
  if (!dek) throw new Error('Спершу розблокуйте Data Room')

  const fileNodes = await db.nodes
    .where('dataroomId')
    .equals(roomId)
    .filter((n) => n.type === 'file' && !!n.blobKey)
    .toArray()
  for (const n of fileNodes) {
    const rec = await db.blobs.get(n.blobKey!)
    if (!rec || !rec.iv) continue
    const plain = await vault.decryptBytes(dek, rec.iv, await rec.data.arrayBuffer())
    await db.blobs.put({ key: rec.key, data: new Blob([plain], { type: n.mime }) })
  }

  await db.datarooms.update(roomId, {
    encrypted: false,
    crypto: undefined,
    updatedAt: now(),
  })
  vault.clearSessionKey(roomId)
}

export function lockSession(roomId: string) {
  vault.clearSessionKey(roomId)
}

// ─────────────────────────── Спільне: rename / delete / move ───────────────────────────

export async function renameNode(id: string, name: string): Promise<void> {
  const node = await db.nodes.get(id)
  if (!node) throw new Error('Обʼєкт не знайдено')
  const desired = name.trim()
  if (!desired) throw new Error('Назва не може бути порожньою')
  if (desired === node.name) return
  const finalName = await resolveNameConflict(node.dataroomId, node.parentId, desired, id)
  await db.nodes.update(id, { name: finalName, updatedAt: now() })
}

/** Видаляє вузол; для папки — рекурсивно всіх нащадків + їхні блоби. */
export async function deleteNode(id: string): Promise<void> {
  await db.transaction('rw', db.nodes, db.blobs, async () => {
    const toDelete = await collectSubtree(id)
    const blobKeys = toDelete.filter((n) => n.blobKey).map((n) => n.blobKey!)
    await db.blobs.bulkDelete(blobKeys)
    await db.nodes.bulkDelete(toDelete.map((n) => n.id))
  })
}

/** Переміщення вузла в іншу папку (для drag-and-drop). */
export async function moveNode(id: string, newParentId: string | null): Promise<void> {
  const node = await db.nodes.get(id)
  if (!node) throw new Error('Обʼєкт не знайдено')
  const target = rootKey(node.dataroomId, newParentId)
  if (node.parentId === target) return
  // не даємо перенести папку саму в себе / у свого нащадка
  if (node.type === 'folder') {
    const subtreeIds = new Set((await collectSubtree(id)).map((n) => n.id))
    if (subtreeIds.has(target)) {
      throw new Error('Не можна перенести папку саму в себе')
    }
  }
  const finalName = await resolveNameConflict(node.dataroomId, target, node.name, id)
  await db.nodes.update(id, { parentId: target, name: finalName, updatedAt: now() })
}

// ─────────────────────────── Внутрішні хелпери ───────────────────────────

/** Плоский список: сам вузол + усі нащадки (BFS по parentId). */
async function collectSubtree(rootId: string): Promise<TreeNode[]> {
  const root = await db.nodes.get(rootId)
  if (!root) return []
  const result: TreeNode[] = [root]
  const queue: string[] = [rootId]
  while (queue.length) {
    const parentId = queue.shift()!
    const children = await db.nodes.where('parentId').equals(parentId).toArray()
    for (const child of children) {
      result.push(child)
      if (child.type === 'folder') queue.push(child.id)
    }
  }
  return result
}

/** Скільки файлів усередині піддерева — для попередження перед видаленням папки. */
export async function countSubtree(
  rootId: string,
): Promise<{ folders: number; files: number }> {
  const nodes = await collectSubtree(rootId)
  // сам корінь не рахуємо
  const inner = nodes.slice(1)
  return {
    folders: inner.filter((n) => n.type === 'folder').length,
    files: inner.filter((n) => n.type === 'file').length,
  }
}

/**
 * Розвʼязує конфлікт імен у межах папки: "file.pdf" → "file (1).pdf" → "file (2).pdf".
 * excludeId — щоб при rename не конфліктувати сам із собою.
 */
async function resolveNameConflict(
  dataroomId: string,
  parentId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const siblings = await db.nodes
    .where('[dataroomId+parentId]')
    .equals([dataroomId, parentId])
    .toArray()
  const taken = new Set(
    siblings.filter((n) => n.id !== excludeId).map((n) => n.name.toLowerCase()),
  )
  if (!taken.has(name.toLowerCase())) return name

  const { base, ext } = splitExt(name)
  let i = 1
  let candidate = `${base} (${i})${ext}`
  while (taken.has(candidate.toLowerCase())) {
    i += 1
    candidate = `${base} (${i})${ext}`
  }
  return candidate
}

/** "report.pdf" → { base: "report", ext: ".pdf" }; папки — без розширення. */
function splitExt(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
}
