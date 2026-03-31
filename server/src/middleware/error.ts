import type { Context } from 'hono'

export function errorHandler(err: Error, c: Context) {
  const status =
    'status' in err && typeof err.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : 500

  if (status >= 500) {
    console.error(err)
  } else {
    console.warn(err.message)
  }

  return c.json({ error: err.message || 'Internal server error' }, status)
}
