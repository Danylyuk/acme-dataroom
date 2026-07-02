/**
 * Справжнє шифрування at-rest через Web Crypto (SubtleCrypto).
 *
 * Схема DEK/KEK (як у дорослих сховищах):
 *   passphrase --PBKDF2--> KEK  --(AES-GCM)--> розгортає wrappedDEK --> DEK
 *   DEK --(AES-GCM)--> шифрує/розшифровує самі файли
 *
 * Ключі (DEK) НІДЕ не зберігаються у відкритому вигляді. У IndexedDB лежить лише
 * wrappedDEK (зашифрований паролем) + salt. Розгорнутий DEK живе тільки в памʼяті
 * сесії (Map нижче) і зникає при перезавантаженні — тоді потрібен пароль знову.
 */

export const PBKDF2_ITERATIONS = 210_000

const enc = new TextEncoder()

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n))
}

/** passphrase → ключ шифрування ключа (KEK). */
async function deriveKek(
  passphrase: string,
  salt: number[],
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Випадковий Data Encryption Key. */
export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export interface DataroomCrypto {
  salt: number[]
  iterations: number
  wrapIv: number[]
  wrappedDek: number[]
}

/** Створює криптопараметри сейфу для заданого пароля (+ повертає готовий DEK). */
export async function createCrypto(
  passphrase: string,
): Promise<{ params: DataroomCrypto; dek: CryptoKey }> {
  const salt = Array.from(randomBytes(16))
  const kek = await deriveKek(passphrase, salt, PBKDF2_ITERATIONS)
  const dek = await generateDek()
  const raw = await crypto.subtle.exportKey('raw', dek)
  const wrapIv = randomBytes(12)
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv as BufferSource },
    kek,
    raw,
  )
  return {
    params: {
      salt,
      iterations: PBKDF2_ITERATIONS,
      wrapIv: Array.from(wrapIv),
      wrappedDek: Array.from(new Uint8Array(wrapped)),
    },
    dek,
  }
}

/** Розгортає DEK за паролем. Кидає, якщо пароль невірний (AES-GCM auth fail). */
export async function unwrapDek(
  passphrase: string,
  params: DataroomCrypto,
): Promise<CryptoKey> {
  const kek = await deriveKek(passphrase, params.salt, params.iterations)
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(params.wrapIv) },
    kek,
    new Uint8Array(params.wrappedDek),
  )
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

/** Шифрує довільні байти → { iv, cipher }. */
export async function encryptBytes(
  dek: CryptoKey,
  data: ArrayBuffer,
): Promise<{ iv: number[]; cipher: ArrayBuffer }> {
  const iv = randomBytes(12)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    dek,
    data,
  )
  return { iv: Array.from(iv), cipher }
}

export async function decryptBytes(
  dek: CryptoKey,
  iv: number[],
  cipher: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, dek, cipher)
}

// ─────────── Сесійне сховище розгорнутих ключів (тільки в памʼяті) ───────────

const sessionKeys = new Map<string, CryptoKey>()

export function setSessionKey(roomId: string, dek: CryptoKey) {
  sessionKeys.set(roomId, dek)
}
export function getSessionKey(roomId: string): CryptoKey | undefined {
  return sessionKeys.get(roomId)
}
export function clearSessionKey(roomId: string) {
  sessionKeys.delete(roomId)
}
/** Скидає всі розблоковані ключі (напр. при виході з акаунта). */
export function clearAllSessionKeys() {
  sessionKeys.clear()
}
export function isUnlocked(roomId: string): boolean {
  return sessionKeys.has(roomId)
}
