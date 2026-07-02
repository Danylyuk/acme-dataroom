import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    verified      INTEGER NOT NULL DEFAULT 0,
    code          TEXT,
    code_expires  INTEGER,
    code_attempts INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  );
`)

export interface UserRow {
  id: string
  email: string
  name: string
  password_hash: string
  verified: number
  code: string | null
  code_expires: number | null
  code_attempts: number
  created_at: number
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
    | UserRow
    | undefined
}

export function createUser(data: {
  email: string
  name: string
  passwordHash: string
  code: string
  codeExpires: number
}): UserRow {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, verified, code, code_expires, code_attempts, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?)`,
  ).run(
    id,
    data.email.toLowerCase(),
    data.name,
    data.passwordHash,
    data.code,
    data.codeExpires,
    Date.now(),
  )
  return findUserByEmail(data.email)!
}

export function setUserCode(id: string, code: string, codeExpires: number) {
  db.prepare('UPDATE users SET code = ?, code_expires = ?, code_attempts = 0 WHERE id = ?').run(
    code,
    codeExpires,
    id,
  )
}

export function incCodeAttempts(id: string) {
  db.prepare('UPDATE users SET code_attempts = code_attempts + 1 WHERE id = ?').run(id)
}

export function markVerified(id: string) {
  db.prepare(
    'UPDATE users SET verified = 1, code = NULL, code_expires = NULL, code_attempts = 0 WHERE id = ?',
  ).run(id)
}
