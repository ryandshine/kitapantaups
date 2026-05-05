import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../middleware/auth.js'
import { createRateLimit } from '../middleware/rate-limit.js'
import {
  clearRefreshTokenCookie,
  readRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from '../lib/auth-session.js'
import { AuthServiceError, authService } from '../lib/auth-service.js'

const auth = new Hono()
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth-login',
})

const refreshRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth-refresh',
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  turnstile_token: z.string().optional(),
})

const respondAuthError = (c: any, error: unknown) => {
  if (error instanceof AuthServiceError) {
    return c.json({ error: error.message }, error.status)
  }

  throw error
}

const verifyTurnstile = async (token?: string) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true; // Skip if not configured
  if (!token) return false;
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`
    });
    
    const data = await response.json() as any;
    return !!data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
};

// POST /auth/login
auth.post('/login', loginRateLimit, zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password, turnstile_token } = c.req.valid('json')

    // Verify Turnstile
    const isHuman = await verifyTurnstile(turnstile_token);
    if (!isHuman) {
      return c.json({ error: 'Verifikasi bot gagal. Silakan coba lagi.' }, 403);
    }

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
auth.post('/refresh', refreshRateLimit, async (c) => {
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

  const result = await authService.updateProfile(user.userId, data)
  
  if (!result) return c.json({ error: 'Tidak ada field yang diupdate' }, 400)

  return c.json(result)
})

export default auth
