import { describe, it, expect } from 'vitest'
import {
  createCrypto,
  unwrapDek,
  encryptBytes,
  decryptBytes,
} from './crypto'

const enc = new TextEncoder()
const dec = new TextDecoder()

describe('crypto (DEK/KEK at-rest)', () => {
  it('шифрує і розшифровує байти з тим самим DEK (раунд-тріп)', async () => {
    const { dek } = await createCrypto('CorrectHorse1')
    const plaintext = enc.encode('таємний PDF-вміст 🔐')
    const { iv, cipher } = await encryptBytes(dek, plaintext.buffer as ArrayBuffer)

    // шифротекст не збігається з відкритим текстом
    expect(new Uint8Array(cipher)).not.toEqual(plaintext)

    const back = await decryptBytes(dek, iv, cipher)
    expect(dec.decode(back)).toBe('таємний PDF-вміст 🔐')
  })

  it('розгортає DEK правильним паролем і він розшифровує дані', async () => {
    const { params, dek } = await createCrypto('S3cretPass')
    const data = enc.encode('hello')
    const { iv, cipher } = await encryptBytes(dek, data.buffer as ArrayBuffer)

    const dek2 = await unwrapDek('S3cretPass', params)
    const back = await decryptBytes(dek2, iv, cipher)
    expect(dec.decode(back)).toBe('hello')
  })

  it('невірний пароль кидає при розгортанні DEK (AES-GCM auth fail)', async () => {
    const { params } = await createCrypto('RightPass9')
    await expect(unwrapDek('WrongPass9', params)).rejects.toThrow()
  })

  it('кожен виклик createCrypto дає інший salt і wrappedDek', async () => {
    const a = await createCrypto('SamePass1')
    const b = await createCrypto('SamePass1')
    expect(a.params.salt).not.toEqual(b.params.salt)
    expect(a.params.wrappedDek).not.toEqual(b.params.wrappedDek)
  })
})
