import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.json')

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

interface DbShape {
  users: UserRow[]
}

function load(): DbShape {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<DbShape>
    return { users: Array.isArray(parsed.users) ? parsed.users : [] }
  } catch {
    return { users: [] }
  }
}

const data: DbShape = load()

function persist() {
  const tmp = `${DB_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

export function findUserByEmail(email: string): UserRow | undefined {
  const target = email.toLowerCase()
  return data.users.find((u) => u.email === target)
}

export function createUser(input: {
  email: string
  name: string
  passwordHash: string
  code: string
  codeExpires: number
}): UserRow {
  const user: UserRow = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name,
    password_hash: input.passwordHash,
    verified: 0,
    code: input.code,
    code_expires: input.codeExpires,
    code_attempts: 0,
    created_at: Date.now(),
  }
  data.users.push(user)
  persist()
  return user
}

export function setUserCode(id: string, code: string, codeExpires: number) {
  const user = data.users.find((u) => u.id === id)
  if (!user) return
  user.code = code
  user.code_expires = codeExpires
  user.code_attempts = 0
  persist()
}

export function incCodeAttempts(id: string) {
  const user = data.users.find((u) => u.id === id)
  if (!user) return
  user.code_attempts += 1
  persist()
}

export function markVerified(id: string) {
  const user = data.users.find((u) => u.id === id)
  if (!user) return
  user.verified = 1
  user.code = null
  user.code_expires = null
  user.code_attempts = 0
  persist()
}
