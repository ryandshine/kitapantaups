import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const settings = new Hono()

settings.use('*', requireAuth)

// GET /settings
settings.get('/', async (c) => {
  const result = await pool.query('SELECT key, value FROM settings')
  const map: Record<string, string> = {}
  for (const row of result.rows) map[row.key] = row.value
  return c.json(map)
})

// PUT /settings/:key (admin only)
settings.put('/:key', requireAdmin, async (c) => {
  const key = c.req.param('key')
  const user = c.get('user')
  const body = await c.req.json()
  const value = String(body.value ?? '')

  await pool.query(
    `INSERT INTO settings (key, value, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()`,
    [key, value, user.userId]
  )

  return c.json({ key, value })
})

export default settings
