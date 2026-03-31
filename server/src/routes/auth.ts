import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { bodyLimit } from 'hono/body-limit'
import { randomUUID } from 'crypto'
import { mkdir } from 'fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import path from 'path'
import {
  clearRefreshTokenCookie,
  readRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../lib/auth-session.js'
import {
  buildUploadPublicUrl,
  getUploadsRoot,
  isAllowedUploadExtension,
} from '../lib/upload.js'
import { AuthServiceError, authService } from '../lib/auth-service.js'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const respondAuthError = (c: any, error: unknown) => {
  if (error instanceof AuthServiceError) {
    return c.json({ error: error.message }, error.status)
  }

  throw error
}

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')
    const session = await authService.login({ email, password })

    setRefreshTokenCookie(c, session.refreshToken, session.refreshTokenExpiresAt)

    return c.json({
      access_token: session.accessToken,
      user: session.user,
    })
  } catch (error) {
    return respondAuthError(c, error)
  }
})

// POST /auth/logout
auth.post('/logout', requireAuth, async (c) => {
  clearRefreshTokenCookie(c)

  try {
    const user = c.get('user')
    const refreshToken = readRefreshTokenFromRequest(c)

    await authService.logout(user.userId, refreshToken)

    return c.json({ message: 'Logout berhasil' })
  } catch (error) {
    return respondAuthError(c, error)
  }
})

// POST /auth/refresh
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const refreshToken = readRefreshTokenFromRequest(c, body.refresh_token)

    if (!refreshToken) {
      clearRefreshTokenCookie(c)
      return c.json({ error: 'Refresh token diperlukan' }, 400)
    }

    const session = await authService.refresh(refreshToken)
    setRefreshTokenCookie(c, session.refreshToken, session.refreshTokenExpiresAt)

    return c.json({ access_token: session.accessToken })
  } catch (error) {
    if (error instanceof AuthServiceError && error.code === 'REFRESH_TOKEN_INVALID') {
      clearRefreshTokenCookie(c)
    }
    return respondAuthError(c, error)
  }
})

// GET /auth/me
auth.get('/me', requireAuth, async (c) => {
  try {
    const user = c.get('user')
    const currentUser = await authService.getCurrentUser(user.userId)
    return c.json(currentUser)
  } catch (error) {
    return respondAuthError(c, error)
  }
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

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!['jpg', 'jpeg', 'png'].includes(ext) || !isAllowedUploadExtension(ext)) {
      return c.json({ error: 'Tipe file tidak diizinkan. Gunakan: jpg, png' }, 400)
    }

    const fileName = `profile_${randomUUID()}.${ext}`
    const uploadDir = path.join(getUploadsRoot(), 'profiles', user.userId)

    await mkdir(uploadDir, { recursive: true })
    
    const writePath = path.join(uploadDir, fileName)
    const writeStream = createWriteStream(writePath)
    await pipeline(file.stream() as any, writeStream)

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    const photoUrl = buildUploadPublicUrl(baseUrl, 'profiles', user.userId, fileName)

    await pool.query(
      'UPDATE users SET photo_url = $1 WHERE id = $2',
      [photoUrl, user.userId]
    )

    return c.json({ photo_url: photoUrl })
  }
)

export default auth
