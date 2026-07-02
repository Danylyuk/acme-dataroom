import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './auth.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
app.use(cors({ origin: origins }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`[server] Acme Data Room auth API → http://localhost:${port}`)
  if (!process.env.RESEND_API_KEY)
    console.log('[server] RESEND_API_KEY не заданий — коди друкуються в консоль')
})
