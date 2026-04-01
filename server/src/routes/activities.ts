import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { ActivityService } from '../services/activity.service.js'

const activities = new Hono()
activities.use('*', requireAuth)

// GET /activities?limit=&aduan_id=
activities.get('/', async (c) => {
  const result = await ActivityService.getActivities(c.req.query())
  return c.json(result)
})

// POST /activities
activities.post('/', async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  await ActivityService.createActivity(body, user)
  return c.json({ ok: true }, 201)
})

export default activities
