import type { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
  email: string
  role: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Token tidak valid atau kadaluarsa' }, 401)
  }
}

export async function requireAdmin(c: Context, next: Next) {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Akses ditolak: hanya admin' }, 403)
  }
  await next()
}
