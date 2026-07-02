import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { authRouter } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json({ limit: '1mb' }))

const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
app.use(cors({ origin: origins }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)

// Serve the built SPA (dist/) so the whole app runs from this one process/port.
// STATIC_DIR overrides; default is ../../dist relative to server/src.
const staticDir = process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'dist')
app.use(express.static(staticDir))
// SPA fallback: any non-/api GET returns index.html for client-side routing.
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'))
})

const port = Number(process.env.PORT || 8787)
app.listen(port, () => {
  console.log(`[server] Acme Data Room auth API → http://localhost:${port}`)
  if (!process.env.RESEND_API_KEY)
    console.log('[server] RESEND_API_KEY не заданий — коди друкуються в консоль')
})
