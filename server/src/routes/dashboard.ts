import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const dashboard = new Hono()

dashboard.use('*', requireAuth)

// GET /dashboard/stats
dashboard.get('/stats', async (c) => {
  const [total, byStatus, recent] = await Promise.all([
    pool.query('SELECT COUNT(*) as total FROM aduan'),
    pool.query('SELECT status, COUNT(*) as count FROM aduan GROUP BY status'),
    pool.query("SELECT COUNT(*) as count FROM aduan WHERE created_at > now() - interval '30 days'"),
  ])

  const statusMap: Record<string, number> = {}
  for (const row of byStatus.rows) {
    statusMap[row.status] = Number(row.count)
  }

  return c.json({
    total: Number(total.rows[0].total),
    by_status: statusMap,
    last_30_days: Number(recent.rows[0].count),
  })
})

export default dashboard
