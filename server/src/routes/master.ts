import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth.js'
import { MasterService } from '../services/master.service.js'

const master = new Hono()
master.use('*', requireAuth)

// GET /master/status
master.get('/status', async (c) => {
  const result = await MasterService.getStatus()
  return c.json(result)
})

// GET /master/kategori
master.get('/kategori', async (c) => {
  const result = await MasterService.getKategori()
  return c.json(result)
})

// GET /master/jenis-tl
master.get('/jenis-tl', async (c) => {
  const result = await MasterService.getJenisTl()
  return c.json(result)
})

// GET /master/kps/:id
master.get('/kps/:id', async (c) => {
  const result = await MasterService.getKpsById(c.req.param('id'))
  if (!result) return c.json({ error: 'KPS tidak ditemukan' }, 404)
  return c.json(result)
})

// GET /master/kps?search=&page=&limit=
master.get('/kps', async (c) => {
  const result = await MasterService.getKps(c.req.query())
  return c.json(result)
})

export default master
