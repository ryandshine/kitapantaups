import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../middleware/auth.js'
import { TindakLanjutService } from '../services/tindak-lanjut.service.js'

const tl = new Hono()
tl.use('*', requireAuth)

const tlSchema = z.object({
  tanggal: z.string(),
  jenis_tl: z.string(),
  keterangan: z.string().optional(),
  file_urls: z.array(z.string()).optional(),
  nomor_surat_output: z.string().optional(),
})

// GET /aduan/:aduanId/tindak-lanjut
tl.get('/', async (c) => {
  const aduanId = c.req.param('aduanId')
  const result = await TindakLanjutService.getByAduanId(aduanId)
  return c.json(result)
})

// POST /aduan/:aduanId/tindak-lanjut
tl.post('/', zValidator('json', tlSchema), async (c) => {
  const aduanId = c.req.param('aduanId')
  const user = c.get('user')
  const data = c.req.valid('json')

  const result = await TindakLanjutService.create(aduanId, data, user)
  return c.json(result, 201)
})

// PUT /tindak-lanjut/:id
export const updateTl = async (c: any) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const dataParse = tlSchema.partial().safeParse(body)
  if (!dataParse.success) {
    return c.json({ error: 'Payload tidak valid', issues: dataParse.error.flatten() }, 400)
  }

  const result = await TindakLanjutService.update(id, dataParse.data)
  
  if (!result) {
    return c.json({ error: 'Tindak lanjut tidak ditemukan' }, 404)
  }

  return c.json(result)
}

// DELETE /tindak-lanjut/:id
export const deleteTl = async (c: any) => {
  const id = c.req.param('id')
  const deleted = await TindakLanjutService.delete(id)
  
  if (!deleted) {
    return c.json({ error: 'Tindak lanjut tidak ditemukan' }, 404)
  }
  
  return c.json({ message: 'Tindak lanjut berhasil dihapus' })
}

export default tl
