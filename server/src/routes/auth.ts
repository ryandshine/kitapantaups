import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { bodyLimit } from 'hono/body-limit'
import { randomUUID } from 'crypto'
import { mkdir } from 'fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import path from 'path'
import { fileURLToPath } from 'node:url'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  )
  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Email atau password salah' }, 401)
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  )

  // Simpan refresh token di DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  )

  return c.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      phone: user.phone,
      photo_url: user.photo_url,
    },
  })
})

// POST /auth/logout
auth.post('/logout', requireAuth, async (c) => {
  const user = c.get('user')
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.userId])
  return c.json({ message: 'Logout berhasil' })
})

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const refreshToken = body.refresh_token

  if (!refreshToken) {
    return c.json({ error: 'Refresh token diperlukan' }, 400)
  }

  let payload: { userId: string }
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
  } catch {
    return c.json({ error: 'Refresh token tidak valid' }, 401)
  }

  // Cek di DB
  const sessionResult = await pool.query(
    'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > now()',
    [refreshToken]
  )
  if (sessionResult.rows.length === 0) {
    return c.json({ error: 'Session tidak ditemukan atau kadaluarsa' }, 401)
  }

  const userResult = await pool.query(
    'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
    [payload.userId]
  )
  const user = userResult.rows[0]
  if (!user) return c.json({ error: 'User tidak ditemukan' }, 401)

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )

  return c.json({ access_token: accessToken })
})

// GET /auth/me
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const result = await pool.query(
    'SELECT id, email, display_name, role, phone, photo_url, is_active FROM users WHERE id = $1',
    [user.userId]
  )
  if (result.rows.length === 0) return c.json({ error: 'User tidak ditemukan' }, 404)
  return c.json(result.rows[0])
})

const updateProfileSchema = z.object({
  display_name: z.string().min(1).optional(),
  phone: z.string().optional(),
})

// PATCH /auth/profile
auth.patch('/profile', requireAuth, zValidator('json', updateProfileSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const sets: string[] = []
  const params: any[] = []

  if (data.display_name !== undefined) { params.push(data.display_name); sets.push(`display_name = $${params.length}`) }
  if (data.phone !== undefined) { params.push(data.phone); sets.push(`phone = $${params.length}`) }

  if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400)

  params.push(user.userId)
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, email, display_name, role, phone, photo_url, is_active`,
    params
  )

  return c.json(result.rows[0])
})

// POST /auth/photo — upload profile photo
auth.post(
  '/photo',
  requireAuth,
  bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: 'File terlalu besar (maks 2 MB)' }, 413) }),
  async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined

    if (!file || typeof file === 'string') {
      return c.json({ error: 'File tidak ditemukan' }, 400)
    }

    const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return c.json({ error: 'Tipe file tidak diizinkan. Gunakan: jpg, png' }, 400)
    }

    const fileName = `profile_${randomUUID()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'uploads/profiles', user.userId)

    await mkdir(uploadDir, { recursive: true })
    
    const writePath = path.join(uploadDir, fileName)
    const writeStream = createWriteStream(writePath)
    await pipeline(file.stream() as any, writeStream)

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    const photoUrl = `${baseUrl}/uploads/profiles/${user.userId}/${fileName}`

    await pool.query(
      'UPDATE users SET photo_url = $1 WHERE id = $2',
      [photoUrl, user.userId]
    )

    return c.json({ photo_url: photoUrl })
  }
)

export default auth
