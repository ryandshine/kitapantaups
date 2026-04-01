import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { SettingService } from '../services/setting.service.js'

const settings = new Hono()
settings.use('*', requireAuth)

// GET /settings
settings.get('/', async (c) => {
  const result = await SettingService.getAllSettings()
  return c.json(result)
})

// PUT /settings/:key (admin only)
settings.put('/:key', requireAdmin, async (c) => {
  const key = c.req.param('key')
  const user = c.get('user')
  const body = await c.req.json()
  const value = String(body.value ?? '')

  const result = await SettingService.updateSetting(key, value, user.userId)
  return c.json(result)
})

export default settings
