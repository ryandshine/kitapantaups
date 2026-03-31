import test from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'
import {
  createAccessToken,
  createRefreshSession,
  getRefreshCookieName,
  hashRefreshToken,
  readRefreshTokenFromRequest,
  setRefreshTokenCookie,
  verifyRefreshToken,
} from './auth-session.js'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret'

test('createAccessToken encodes user payload', () => {
  const token = createAccessToken({
    userId: 'user-1',
    email: 'user@example.com',
    role: 'admin',
  })

  const [, payloadSegment] = token.split('.')
  const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'))

  assert.equal(payload.userId, 'user-1')
  assert.equal(payload.email, 'user@example.com')
  assert.equal(payload.role, 'admin')
})

test('createRefreshSession returns verifiable token and hashed persistence key', () => {
  const session = createRefreshSession('user-42')
  const payload = verifyRefreshToken(session.refreshToken)

  assert.equal(payload.userId, 'user-42')
  assert.equal(session.refreshTokenHash, hashRefreshToken(session.refreshToken))
  assert.ok(session.expiresAt instanceof Date)
})

test('refresh token cookie can be set and read from request', async () => {
  const app = new Hono()
  const session = createRefreshSession('user-cookie')

  app.get('/issue', (c) => {
    setRefreshTokenCookie(c, session.refreshToken, session.expiresAt)
    return c.json({ ok: true })
  })

  app.get('/read', (c) => {
    return c.json({ token: readRefreshTokenFromRequest(c) })
  })

  const issueRes = await app.request('http://localhost/issue')
  const cookie = issueRes.headers.get('set-cookie')

  assert.ok(cookie?.includes(`${getRefreshCookieName()}=`))

  const readRes = await app.request('http://localhost/read', {
    headers: {
      cookie: cookie!,
    },
  })
  const body = await readRes.json()

  assert.equal(body.token, session.refreshToken)
})
