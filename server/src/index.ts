import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { readdir, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

import { requireAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error.js'
import { canAccessUpload } from './lib/file-access.js'
import { getUploadsRoot } from './lib/upload.js'

import authRoute from './routes/auth.js'
import aduanRoute from './routes/aduan.js'
import tlRoute, { deleteTl, updateTl } from './routes/tindak-lanjut.js'
import masterRoute from './routes/master.js'
import usersRoute from './routes/users.js'
import dashboardRoute from './routes/dashboard.js'
import activitiesRoute from './routes/activities.js'
import settingsRoute from './routes/settings.js'

const app = new Hono()
const allowedCorsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Middleware global
app.use('*', logger())
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
})

// CORS (Hono built-in middleware)
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return allowedCorsOrigins[0] || 'http://localhost:5173'
    return allowedCorsOrigins.includes(origin) ? origin : ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
  credentials: true,
  maxAge: 86400,
}))

// Static files (uploaded documents)
app.use('/uploads/*', requireAuth)
app.get('/uploads/*', async (c) => {
  const relativePath = decodeURIComponent(c.req.path.replace(/^\/uploads\//, ''))
  if (!relativePath || relativePath.includes('..')) {
    return c.json({ error: 'Path file tidak valid' }, 400)
  }

  const user = c.get('user')
  const allowed = await canAccessUpload(relativePath, user)
  if (!allowed) {
    return c.json({ error: 'Akses file ditolak' }, 403)
  }

  const uploadsRoot = getUploadsRoot()
  let absolutePath = path.join(uploadsRoot, relativePath)

  // Backward compatibility: legacy URLs used /uploads/<filename> (no aduan folder).
  if (!relativePath.includes('/')) {
    const legacyFileName = path.basename(relativePath)
    const entries = await readdir(uploadsRoot, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const candidate = path.join(uploadsRoot, entry.name, legacyFileName)
      try {
        await stat(candidate)
        absolutePath = candidate
        break
      } catch {
        // continue searching other aduan folders
      }
    }
  }

  try {
    const fileStat = await stat(absolutePath)
    const nodeStream = createReadStream(absolutePath)
    const webStream = Readable.toWeb(nodeStream)

    const ext = path.extname(absolutePath).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.shp': 'application/octet-stream',
      '.dbf': 'application/octet-stream',
      '.shx': 'application/octet-stream',
      '.prj': 'text/plain',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
    }

    return new Response(webStream as any, {
      headers: {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return c.json({ error: 'File tidak ditemukan' }, 404)
  }
})

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'KITAPANTAUPS API' }))

// Routes
app.route('/auth', authRoute)
app.route('/aduan', aduanRoute)
app.route('/aduan/:aduanId/tindak-lanjut', tlRoute)
app.delete('/tindak-lanjut/:id', requireAuth, deleteTl)
app.put('/tindak-lanjut/:id', requireAuth, updateTl)
app.route('/master', masterRoute)
app.route('/users', usersRoute)
app.route('/dashboard', dashboardRoute)
app.route('/activities', activitiesRoute)
app.route('/settings', settingsRoute)

// Error & not found handler
app.onError((err, c) => errorHandler(err, c))
app.notFound((c) => c.json({ error: 'Route tidak ditemukan' }, 404))

const port = Number(process.env.PORT) || 3001
console.log(`KITAPANTAUPS API running on port ${port}`)

serve({ fetch: app.fetch, port })
