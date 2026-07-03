import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Ізольована тимчасова БД + dev-режим (нема TURNSTILE_SECRET / RESEND_API_KEY,
// тож Turnstile пропускається, а код "надсилається" в консоль).
const DB_PATH = path.join(os.tmpdir(), `acme-auth-test-${process.pid}.json`)
process.env.DB_PATH = DB_PATH
delete process.env.TURNSTILE_SECRET
delete process.env.RESEND_API_KEY
process.env.JWT_SECRET = 'test-secret'

// Динамічні імпорти — після виставлення env, щоб db.ts прочитав правильний DB_PATH.
let request: typeof import('supertest').default
let express: typeof import('express').default
let authRouter: import('express').Router

beforeAll(async () => {
  try {
    fs.rmSync(DB_PATH, { force: true })
  } catch {
    /* ignore */
  }
  request = (await import('supertest')).default
  express = (await import('express')).default
  authRouter = (await import('./auth.js')).authRouter
})

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)
  return app
}

/** Дістає останній код підтвердження з файлу БД. */
function codeFor(email: string): string {
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as {
    users: { email: string; code: string | null }[]
  }
  const user = data.users.find((u) => u.email === email.toLowerCase())
  return user?.code ?? ''
}

describe('auth happy-path: register → verify → login', () => {
  const app = () => makeApp()
  const email = 'jane@acme.test'
  const password = 'Str0ngPass'

  it('реєстрація приймає валідні дані і ставить статус verify', async () => {
    const res = await request(app()).post('/api/auth/register').send({ email, password, name: 'Jane' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, next: 'verify' })
  })

  it('відхиляє слабкий пароль', async () => {
    const res = await request(app())
      .post('/api/auth/register')
      .send({ email: 'weak@acme.test', password: 'abc' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('weak_password')
  })

  it('невірний код не підтверджує', async () => {
    const res = await request(app()).post('/api/auth/verify').send({ email, code: '000000' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('wrong_code')
  })

  it('правильний код видає JWT і публічного юзера', async () => {
    const res = await request(app())
      .post('/api/auth/verify')
      .send({ email, code: codeFor(email) })
    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
    expect(res.body.user).toMatchObject({ email: email.toLowerCase(), name: 'Jane' })
  })

  it('логін підтвердженого юзера повертає токен', async () => {
    const res = await request(app()).post('/api/auth/login').send({ email, password })
    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
  })

  it('логін з невірним паролем — 401', async () => {
    const res = await request(app()).post('/api/auth/login').send({ email, password: 'Wr0ngPass' })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_credentials')
  })
})
