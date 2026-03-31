import jwt from 'jsonwebtoken'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { createHash } from 'node:crypto'

const REFRESH_COOKIE_NAME = 'kitapantaups_refresh_token'
const FIFTEEN_MINUTES = 15 * 60
const SEVEN_DAYS = 7 * 24 * 60 * 60

type AccessTokenPayload = {
  userId: string
  email: string
  role: string
}

type RefreshTokenPayload = {
  userId: string
}

const isSecureRequest = (c: Context) => {
  const forwardedProto = c.req.header('x-forwarded-proto')
  return c.req.url.startsWith('https://') || forwardedProto === 'https'
}

export type { AccessTokenPayload, RefreshTokenPayload }

export const getRefreshCookieName = () => REFRESH_COOKIE_NAME

export const hashRefreshToken = (token: string) => {
  return createHash('sha256').update(token).digest('hex')
}

export const createAccessToken = (payload: AccessTokenPayload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on the server.')
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: FIFTEEN_MINUTES })
}

export const createRefreshToken = (payload: RefreshTokenPayload) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured on the server.')
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: SEVEN_DAYS })
}

export const verifyRefreshToken = (token: string) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured on the server.')
  }
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

export const createRefreshSession = (userId: string) => {
  const refreshToken = createRefreshToken({ userId })
  const expiresAt = new Date(Date.now() + SEVEN_DAYS * 1000)

  return {
    refreshToken,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  }
}

export const setRefreshTokenCookie = (c: Context, refreshToken: string, expiresAt: Date) => {
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
  })
}

export const clearRefreshTokenCookie = (c: Context) => {
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' })
}

export const readRefreshTokenFromRequest = (c: Context, fallbackToken?: string) => {
  return getCookie(c, REFRESH_COOKIE_NAME) || fallbackToken || null
}
