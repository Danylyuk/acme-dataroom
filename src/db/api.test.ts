import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import {
  createDataroom,
  createFolder,
  uploadFile,
  listChildren,
  subtreeIds,
  moveNode,
  renameNode,
} from './api'

function pdf(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' })
}

beforeEach(async () => {
  await db.datarooms.clear()
  await db.nodes.clear()
  await db.blobs.clear()
})

describe('api — конфлікт імен', () => {
  it('другий файл з тим самим іменем стає "report (1).pdf"', async () => {
    const room = await createDataroom('Room')
    await uploadFile(room.id, null, pdf('report.pdf'))
    const second = await uploadFile(room.id, null, pdf('report.pdf'))
    const third = await uploadFile(room.id, null, pdf('report.pdf'))
    expect(second.name).toBe('report (1).pdf')
    expect(third.name).toBe('report (2).pdf')
  })

  it('конфлікт нечутливий до регістру', async () => {
    const room = await createDataroom('Room')
    await createFolder(room.id, null, 'Docs')
    const dup = await createFolder(room.id, null, 'docs')
    expect(dup.name).toBe('docs (1)')
  })

  it('rename у зайняте ім’я теж отримує суфікс', async () => {
    const room = await createDataroom('Room')
    await uploadFile(room.id, null, pdf('a.pdf'))
    const b = await uploadFile(room.id, null, pdf('b.pdf'))
    await renameNode(b.id, 'a.pdf')
    const renamed = await db.nodes.get(b.id)
    expect(renamed?.name).toBe('a (1).pdf')
  })
})

describe('api — сортування дітей', () => {
  it('папки йдуть перед файлами, далі за назвою (natural)', async () => {
    const room = await createDataroom('Room')
    await uploadFile(room.id, null, pdf('file10.pdf'))
    await uploadFile(room.id, null, pdf('file2.pdf'))
    await createFolder(room.id, null, 'Zeta')
    await createFolder(room.id, null, 'Alpha')
    const kids = await listChildren(room.id, null)
    expect(kids.map((n) => n.name)).toEqual([
      'Alpha',
      'Zeta',
      'file2.pdf',
      'file10.pdf',
    ])
  })
})

describe('api — піддерево', () => {
  it('subtreeIds містить сам вузол і всіх нащадків, але не сусідів', async () => {
    const room = await createDataroom('Room')
    const parent = await createFolder(room.id, null, 'Parent')
    const child = await createFolder(room.id, parent.id, 'Child')
    const grand = await uploadFile(room.id, child.id, pdf('deep.pdf'))
    const sibling = await createFolder(room.id, null, 'Sibling')

    const ids = await subtreeIds(parent.id)
    expect(ids.has(parent.id)).toBe(true)
    expect(ids.has(child.id)).toBe(true)
    expect(ids.has(grand.id)).toBe(true)
    expect(ids.has(sibling.id)).toBe(false)
  })
})

describe('api — move', () => {
  it('не дає перенести папку саму в себе', async () => {
    const room = await createDataroom('Room')
    const folder = await createFolder(room.id, null, 'F')
    await expect(moveNode(folder.id, folder.id)).rejects.toThrow()
  })

  it('не дає перенести папку у власного нащадка', async () => {
    const room = await createDataroom('Room')
    const parent = await createFolder(room.id, null, 'Parent')
    const child = await createFolder(room.id, parent.id, 'Child')
    await expect(moveNode(parent.id, child.id)).rejects.toThrow()
  })

  it('переносить файл в іншу папку', async () => {
    const room = await createDataroom('Room')
    const folder = await createFolder(room.id, null, 'Target')
    const file = await uploadFile(room.id, null, pdf('x.pdf'))
    await moveNode(file.id, folder.id)
    const inRoot = await listChildren(room.id, null)
    const inFolder = await listChildren(room.id, folder.id)
    expect(inRoot.find((n) => n.id === file.id)).toBeUndefined()
    expect(inFolder.find((n) => n.id === file.id)).toBeDefined()
  })
})
