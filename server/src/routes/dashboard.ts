import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { DashboardService } from '../services/dashboard.service.js'

const dashboard = new Hono()
dashboard.use('*', requireAuth)

// GET /dashboard/stats
dashboard.get('/stats', async (c) => {
  const result = await DashboardService.getStats()
  return c.json(result)
})

export default dashboard
