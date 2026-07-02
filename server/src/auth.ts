import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  findUserByEmail,
  createUser,
  setUserCode,
  incCodeAttempts,
  markVerified,
  type UserRow,
} from './db.js'
import { verifyTurnstile } from './turnstile.js'
import { sendVerificationCode } from './email.js'

export const authRouter = Router()

const CODE_TTL_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const strongPassword = z
  .string()
  .min(6)
  .refine((p) => /[A-ZА-ЯЄІЇҐ]/.test(p) && /\d/.test(p), 'weak')

const registerSchema = z.object({
  email: z.string().email(),
  password: strongPassword,
  name: z.string().trim().min(1).max(80).optional(),
  turnstileToken: z.string().optional().default(''),
})
const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstileToken: z.string().optional().default(''),
})
const resendSchema = z.object({ email: z.string().email() })

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function issueJwt(user: UserRow): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me'
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, secret, {
    expiresIn: '7d',
  })
}

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name }
}

function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string | undefined {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  return req.ip
}

// ─────────────────────────── POST /register ───────────────────────────
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.message === 'weak' || i.path[0] === 'password')
    return res.status(400).json({ error: weak ? 'weak_password' : 'invalid_input' })
  }
  const { email, password, name, turnstileToken } = parsed.data

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) {
    return res.status(400).json({ error: 'turnstile_failed' })
  }

  const existing = findUserByEmail(email)
  if (existing?.verified) return res.status(409).json({ error: 'email_taken' })

  const code = genCode()
  const codeExpires = Date.now() + CODE_TTL_MS
  const passwordHash = await bcrypt.hash(password, 10)

  if (existing && !existing.verified) {
    // повторна реєстрація непідтвердженого — оновлюємо пароль/ім'я і шлемо новий код
    setUserCode(existing.id, code, codeExpires)
  } else {
    createUser({
      email,
      name: name || email.split('@')[0],
      passwordHash,
      code,
      codeExpires,
    })
  }

  await sendVerificationCode(email, code)
  res.json({ ok: true, next: 'verify' })
})

// ─────────────────────────── POST /verify ───────────────────────────
authRouter.post('/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' })
  const { email, code } = parsed.data

  const user = findUserByEmail(email)
  if (!user || !user.code || !user.code_expires) {
    return res.status(400).json({ error: 'no_pending_code' })
  }
  if (user.code_attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'too_many_attempts' })
  }
  if (Date.now() > user.code_expires) return res.status(400).json({ error: 'code_expired' })
  if (code !== user.code) {
    incCodeAttempts(user.id)
    return res.status(400).json({ error: 'wrong_code' })
  }

  markVerified(user.id)
  const fresh = findUserByEmail(email)!
  res.json({ token: issueJwt(fresh), user: publicUser(fresh) })
})

// ─────────────────────────── POST /login ───────────────────────────
authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' })
  const { email, password, turnstileToken } = parsed.data

  if (!(await verifyTurnstile(turnstileToken, clientIp(req)))) {
    return res.status(400).json({ error: 'turnstile_failed' })
  }

  const user = findUserByEmail(email)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  if (!user.verified) return res.status(403).json({ error: 'not_verified' })

  res.json({ token: issueJwt(user), user: publicUser(user) })
})

// ─────────────────────────── POST /resend ───────────────────────────
authRouter.post('/resend', async (req, res) => {
  const parsed = resendSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' })
  const user = findUserByEmail(parsed.data.email)
  // не розкриваємо, чи існує акаунт
  if (user && !user.verified) {
    const code = genCode()
    setUserCode(user.id, code, Date.now() + CODE_TTL_MS)
    await sendVerificationCode(user.email, code)
  }
  res.json({ ok: true })
})
