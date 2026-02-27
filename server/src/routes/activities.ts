import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const activities = new Hono()

activities.use('*', requireAuth)

// GET /activities?limit=&aduan_id=
activities.get('/', async (c) => {
  const limit = Number(c.req.query('limit')) || 20
  const aduanId = c.req.query('aduan_id')

  const conditions: string[] = []
  const params: any[] = []

  if (aduanId) {
    params.push(aduanId)
    conditions.push(`aduan_id = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit)

  const result = await pool.query(
    `SELECT * FROM app_activities ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  )

  return c.json(result.rows)
})

// POST /activities
activities.post('/', async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  await pool.query(
    `INSERT INTO app_activities (type, description, aduan_id, user_id, user_name, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      body.type,
      body.description,
      body.aduan_id || null,
      body.user_id || user.userId,
      body.user_name || user.email,
      body.metadata || {},
    ]
  )

  return c.json({ ok: true }, 201)
})

export default activities
