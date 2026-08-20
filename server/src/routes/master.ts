import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { MasterService } from '../services/master.service.js'
import { getKpsSyncJobState, startGokupsKpsSyncJob } from '../services/kps-sync.service.js'

const master = new Hono()
master.use('*', requireAuth)

const KPS_SKEMA_OPTIONS = [
  'HUTAN DESA',
  'HUTAN KEMASYARAKATAN',
  'HUTAN TANAMAN RAKYAT',
  'KEMITRAAN KEHUTANAN',
  'HUTAN ADAT',
  'HUTAN RAKYAT',
  'LAINNYA',
] as const

const createKpsSchema = z.object({
  nama_lembaga: z.string().trim().min(1),
  skema: z.enum(KPS_SKEMA_OPTIONS),
  surat_keputusan: z.string().trim().optional(),
  tanggal: z.string().optional(),
  provinsi: z.string().trim().min(1),
  kabupaten: z.string().trim().min(1),
  kecamatan: z.string().trim().optional(),
  desa: z.string().trim().optional(),
  luas_total: z.number().min(0).optional(),
  anggota_pria: z.number().int().min(0).optional(),
  anggota_wanita: z.number().int().min(0).optional(),
})

// Data GoKUPS lama dapat memiliki label skema di luar daftar pilihan lokal.
// Admin tetap boleh mempertahankan atau membetulkan nilai tersebut.
const updateKpsSchema = createKpsSchema.extend({
  skema: z.string().trim().min(1),
})

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

// GET /master/kps/sync
master.get('/kps/sync', requireAdmin, async (c) => {
  return c.json(getKpsSyncJobState())
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

// POST /master/kps
master.post('/kps', zValidator('json', createKpsSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const result = await MasterService.createKps({ ...data, created_by: user.userId })
  return c.json(result, 201)
})

// PATCH /master/kps/:id — hanya admin, untuk koreksi data master
master.patch('/kps/:id', requireAdmin, zValidator('json', updateKpsSchema), async (c) => {
  const data = c.req.valid('json')
  const result = await MasterService.updateKps(c.req.param('id'), data)
  if (!result) return c.json({ error: 'KPS tidak ditemukan' }, 404)
  return c.json(result)
})

// POST /master/kps/sync
master.post('/kps/sync', requireAdmin, async (c) => {
  const { started, state } = startGokupsKpsSyncJob()
  return c.json({
    message: started ? 'Sinkronisasi KPS dimulai' : 'Sinkronisasi KPS sedang berjalan',
    started,
    ...state,
  })
})

export default master
