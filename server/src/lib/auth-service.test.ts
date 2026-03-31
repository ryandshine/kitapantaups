import test from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { AuthServiceError, createAuthService } from './auth-service.js'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret'

type QueryPlan = (text: string, values?: unknown[]) => Promise<{ rows: any[] }> | { rows: any[] }

function createFakePool(connectionPlans: QueryPlan[][]) {
  const releaseCalls: boolean[] = []
  let connectionIndex = 0

  return {
    releaseCalls,
    pool: {
      connect: async () => {
        const plans = connectionPlans[connectionIndex]
        assert.ok(plans, `Unexpected connection #${connectionIndex + 1}`)
        connectionIndex += 1

        let queryIndex = 0

        return {
          query: async <TRow>(text: string, values?: unknown[]) => {
            const plan = plans[queryIndex]
            assert.ok(plan, `Unexpected query #${queryIndex + 1}: ${text}`)
            queryIndex += 1
            return plan(text, values) as Promise<{ rows: TRow[] }>
          },
          release: (destroy?: boolean) => {
            releaseCalls.push(Boolean(destroy))
          },
        }
      },
    },
  }
}

test('auth service login returns access token, refresh token, and user payload', async () => {
  const passwordHash = bcrypt.hashSync('Secret123!', 10)
  const { pool, releaseCalls } = createFakePool([
    [
      (_text, values) => {
        assert.equal(values?.[0], 'admin@example.com')
        return {
          rows: [
            {
              id: 'user-1',
              email: 'admin@example.com',
              password_hash: passwordHash,
              display_name: 'Administrator',
              role: 'admin',
              phone: '08123456789',
              photo_url: null,
            },
          ],
        }
      },
      (text, values) => {
        assert.match(text, /INSERT INTO sessions/i)
        assert.equal(values?.[0], 'user-1')
        assert.equal(typeof values?.[1], 'string')
        assert.ok(values?.[2] instanceof Date)
        return { rows: [] }
      },
    ],
  ])

  const authService = createAuthService(pool as any)
  const result = await authService.login({
    email: ' Admin@Example.com ',
    password: 'Secret123!',
  })

  assert.equal(result.user.id, 'user-1')
  assert.equal(result.user.email, 'admin@example.com')
  assert.equal(result.user.display_name, 'Administrator')
  assert.match(result.accessToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  assert.match(result.refreshToken, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  assert.ok(result.refreshTokenExpiresAt instanceof Date)
  assert.deepEqual(releaseCalls, [false])
})

test('auth service login retries once when postgres connection is dropped', async () => {
  const passwordHash = bcrypt.hashSync('Retry123!', 10)
  const transientError = Object.assign(
    new Error('Connection terminated due to connection timeout'),
    {
      code: 'ETIMEDOUT',
      cause: new Error('Connection terminated unexpectedly'),
    }
  )

  const { pool, releaseCalls } = createFakePool([
    [
      () => {
        throw transientError
      },
    ],
    [
      (_text, values) => {
        assert.equal(values?.[0], 'retry@example.com')
        return {
          rows: [
            {
              id: 'user-2',
              email: 'retry@example.com',
              password_hash: passwordHash,
              display_name: 'Retry User',
              role: 'admin',
              phone: null,
              photo_url: null,
            },
          ],
        }
      },
      () => ({ rows: [] }),
    ],
  ])

  const authService = createAuthService(pool as any)
  const result = await authService.login({
    email: 'retry@example.com',
    password: 'Retry123!',
  })

  assert.equal(result.user.id, 'user-2')
  assert.deepEqual(releaseCalls, [true, false])
})

test('auth service login rejects invalid password with 401', async () => {
  const passwordHash = bcrypt.hashSync('Correct123!', 10)
  const { pool, releaseCalls } = createFakePool([
    [
      () => ({
        rows: [
          {
            id: 'user-3',
            email: 'user@example.com',
            password_hash: passwordHash,
            display_name: 'Regular User',
            role: 'staf',
            phone: null,
            photo_url: null,
          },
        ],
      }),
    ],
  ])

  const authService = createAuthService(pool as any)

  await assert.rejects(
    () =>
      authService.login({
        email: 'user@example.com',
        password: 'WrongPassword!',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AuthServiceError)
      assert.equal(error.status, 401)
      assert.equal(error.code, 'INVALID_CREDENTIALS')
      return true
    }
  )

  assert.deepEqual(releaseCalls, [false])
})
