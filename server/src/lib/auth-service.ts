import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import {
  createAccessToken,
  createRefreshSession,
  hashRefreshToken,
  verifyRefreshToken,
} from './auth-session.js'

type QueryResultLike<TRow> = {
  rows: TRow[]
}

type AuthDbClient = {
  query: <TRow = Record<string, unknown>>(text: string, values?: unknown[]) => Promise<QueryResultLike<TRow>>
  release: (destroy?: boolean) => void
}

type AuthDbPool = {
  connect: () => Promise<AuthDbClient>
}

type AuthUserRow = {
  id: string
  email: string
  password_hash: string
  display_name: string | null
  role: string
  phone: string | null
  photo_url: string | null
}

type AuthUserProfileRow = {
  id: string
  email: string
  display_name: string | null
  role: string
  phone: string | null
  photo_url: string | null
  is_active: boolean
  created_at: string | Date | null
  updated_at: string | Date | null
}

type RefreshSessionRow = {
  session_id: string
  user_id: string
  email: string
  role: string
}

type AuthenticatedUser = {
  id: string
  email: string
  display_name: string | null
  role: string
  phone: string | null
  photo_url: string | null
}

type LoginParams = {
  email: string
  password: string
}

type LoginResult = {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: Date
  user: AuthenticatedUser
}

type RefreshResult = {
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: Date
}

type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'REFRESH_TOKEN_INVALID'
  | 'USER_NOT_FOUND'
  | 'DATABASE_UNAVAILABLE'

type AuthServiceErrorOptions = {
  status: number
  code: AuthErrorCode
  cause?: unknown
}

const TRANSIENT_DB_ERROR_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '57P01',
  '57P02',
  '57P03',
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
])

const MAX_DB_ATTEMPTS = 2
const DB_RETRY_DELAY_MS = 250

export class AuthServiceError extends Error {
  status: number
  code: AuthErrorCode

  constructor(message: string, options: AuthServiceErrorOptions) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AuthServiceError'
    this.status = options.status
    this.code = options.code
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isAuthServiceError = (error: unknown): error is AuthServiceError => {
  return error instanceof AuthServiceError
}

const getNestedMessage = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('message' in value)) return ''
  return String(value.message || '')
}

const isTransientDatabaseError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? String(error.code || '') : ''
  const message = 'message' in error ? String(error.message || '').toLowerCase() : ''
  const causeMessage = getNestedMessage('cause' in error ? error.cause : undefined).toLowerCase()

  if (code && TRANSIENT_DB_ERROR_CODES.has(code)) return true

  return (
    message.includes('connection terminated due to connection timeout') ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('timeout exceeded when trying to connect') ||
    causeMessage.includes('connection terminated unexpectedly') ||
    causeMessage.includes('connection timeout')
  )
}

const toDatabaseUnavailableError = (operation: string, error: unknown) => {
  return new AuthServiceError('Layanan login sedang bermasalah. Coba lagi beberapa saat.', {
    status: 503,
    code: 'DATABASE_UNAVAILABLE',
    cause: error,
  })
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const serializeError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return { message: String(error || 'Unknown error') }
  }

  return {
    message: 'message' in error ? error.message : 'Unknown error',
    code: 'code' in error ? error.code : undefined,
    cause: 'cause' in error ? getNestedMessage(error.cause) : undefined,
  }
}

export const createAuthService = (dbPool: AuthDbPool = pool) => {
  const withAuthClient = async <T>(operation: string, run: (client: AuthDbClient) => Promise<T>): Promise<T> => {
    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt += 1) {
      let client: AuthDbClient | null = null
      let destroyClient = false

      try {
        client = await dbPool.connect()
        return await run(client)
      } catch (error) {
        if (isAuthServiceError(error)) {
          throw error
        }

        lastError = error
        destroyClient = client !== null && isTransientDatabaseError(error)
        const shouldRetry = destroyClient && attempt < MAX_DB_ATTEMPTS

        console.error(`[auth] ${operation} failed`, {
          attempt,
          ...serializeError(error),
        })

        if (!shouldRetry) {
          throw toDatabaseUnavailableError(operation, error)
        }

        await sleep(DB_RETRY_DELAY_MS * attempt)
      } finally {
        client?.release(destroyClient)
      }
    }

    throw toDatabaseUnavailableError(operation, lastError)
  }

  return {
    login: async ({ email, password }: LoginParams): Promise<LoginResult> => {
      return withAuthClient('login', async (client) => {
        const result = await client.query<AuthUserRow>(
          `SELECT id, email, password_hash, display_name, role, phone, photo_url
           FROM users
           WHERE email = $1 AND is_active = true
           LIMIT 1`,
          [normalizeEmail(email)]
        )

        const user = result.rows[0]
        if (!user) {
          throw new AuthServiceError('Email atau password salah', {
            status: 401,
            code: 'INVALID_CREDENTIALS',
          })
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
          throw new AuthServiceError('Email atau password salah', {
            status: 401,
            code: 'INVALID_CREDENTIALS',
          })
        }

        const accessToken = createAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        })
        const refreshSession = createRefreshSession(user.id)

        await client.query(
          'INSERT INTO sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)',
          [user.id, refreshSession.refreshTokenHash, refreshSession.expiresAt]
        )

        return {
          accessToken,
          refreshToken: refreshSession.refreshToken,
          refreshTokenExpiresAt: refreshSession.expiresAt,
          user: {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
            phone: user.phone,
            photo_url: user.photo_url,
          },
        }
      })
    },

    refresh: async (refreshToken: string): Promise<RefreshResult> => {
      let payload: { userId: string }

      try {
        payload = verifyRefreshToken(refreshToken)
      } catch (error) {
        throw new AuthServiceError('Refresh token tidak valid', {
          status: 401,
          code: 'REFRESH_TOKEN_INVALID',
          cause: error,
        })
      }

      return withAuthClient('refresh', async (client) => {
        const currentTokenHash = hashRefreshToken(refreshToken)
        const sessionResult = await client.query<RefreshSessionRow>(
          `SELECT s.id AS session_id, u.id AS user_id, u.email, u.role
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.refresh_token_hash = $1
             AND s.expires_at > now()
             AND u.is_active = true
           LIMIT 1`,
          [currentTokenHash]
        )

        const session = sessionResult.rows[0]
        if (!session || session.user_id !== payload.userId) {
          throw new AuthServiceError('Session tidak ditemukan atau kadaluarsa', {
            status: 401,
            code: 'REFRESH_TOKEN_INVALID',
          })
        }

        const accessToken = createAccessToken({
          userId: session.user_id,
          email: session.email,
          role: session.role,
        })
        const nextSession = createRefreshSession(session.user_id)

        await client.query(
          `UPDATE sessions
           SET refresh_token_hash = $1, expires_at = $2, created_at = now()
           WHERE id = $3`,
          [nextSession.refreshTokenHash, nextSession.expiresAt, session.session_id]
        )

        return {
          accessToken,
          refreshToken: nextSession.refreshToken,
          refreshTokenExpiresAt: nextSession.expiresAt,
        }
      })
    },

    logout: async (userId: string, refreshToken?: string | null) => {
      return withAuthClient('logout', async (client) => {
        if (refreshToken) {
          await client.query('DELETE FROM sessions WHERE refresh_token_hash = $1', [
            hashRefreshToken(refreshToken),
          ])
          return
        }

        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId])
      })
    },

    getCurrentUser: async (userId: string): Promise<AuthUserProfileRow> => {
      return withAuthClient('load-current-user', async (client) => {
        const result = await client.query<AuthUserProfileRow>(
          `SELECT id, email, display_name, role, phone, photo_url, is_active, created_at, updated_at
           FROM users
           WHERE id = $1
           LIMIT 1`,
          [userId]
        )

        const user = result.rows[0]
        if (!user) {
          throw new AuthServiceError('User tidak ditemukan', {
            status: 404,
            code: 'USER_NOT_FOUND',
          })
        }

        return user
      })
    },

    updateProfile: async (userId: string, data: { display_name?: string; phone?: string }) => {
      return withAuthClient('update-profile', async (client) => {
        const sets: string[] = []
        const params: any[] = []

        if (data.display_name !== undefined) { params.push(data.display_name); sets.push(`display_name = $${params.length}`) }
        if (data.phone !== undefined) { params.push(data.phone); sets.push(`phone = $${params.length}`) }

        if (sets.length === 0) return null

        params.push(userId)
        const result = await client.query(
          `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
           RETURNING id, email, display_name, role, phone, photo_url, is_active`,
          params
        )

        return result.rows[0]
      })
    },

  }
}

export const authService = createAuthService()
