import type { Context, Next } from 'hono'

type RateLimitOptions = {
  windowMs: number
  max: number
  keyPrefix: string
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const getClientIp = (c: Context) => {
  const forwardedFor = c.req.header('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return c.req.header('x-real-ip') || 'unknown'
}

const sweepExpiredEntries = (now: number) => {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key)
    }
  }
}

export const createRateLimit = ({ windowMs, max, keyPrefix }: RateLimitOptions) => {
  return async (c: Context, next: Next) => {
    const now = Date.now()
    sweepExpiredEntries(now)

    const key = `${keyPrefix}:${getClientIp(c)}`
    const current = store.get(key)

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      await next()
      return
    }

    if (current.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
      c.header('Retry-After', String(retryAfterSeconds))
      return c.json({
        error: 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
      }, 429)
    }

    current.count += 1
    store.set(key, current)
    await next()
  }
}
