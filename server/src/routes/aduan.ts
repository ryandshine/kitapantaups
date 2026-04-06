import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { bodyLimit } from 'hono/body-limit'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { AduanService } from '../services/aduan.service.js'

const aduan = new Hono()
aduan.use('*', requireAuth)

// GET /aduan?status=&search=&page=&limit=&offset=&start_date=&end_date=&provinsi=
aduan.get('/', async (c) => {
  const result = await AduanService.getList(c.req.query())
  return c.json(result)
})

// GET /aduan/provinces
aduan.get('/provinces', async (c) => {
  const result = await AduanService.getProvinces()
  return c.json(result)
})

// POST /aduan/upload — multipart file upload
aduan.post(
  '/upload',
  bodyLimit({ maxSize: 10 * 1024 * 1024, onError: (c) => c.json({ error: 'File terlalu besar (maks 10 MB)' }, 413) }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined
    const rawAduanId = body['aduan_id'] as string
    const category = body['category'] as string || 'dokumen'

    if (!file || !rawAduanId) {
      return c.json({ error: 'File dan aduan_id wajib diisi' }, 400)
    }

    try {
      const result = await AduanService.uploadFile(file, rawAduanId, category)
      return c.json(result)
    } catch (error: any) {
      const status = error.message.includes('tidak ditemukan') ? 404 : 400
      return c.json({ error: error.message || 'Gagal menyimpan file' }, status as any)
    }
  }
)

// GET /aduan/:id
aduan.get('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await AduanService.getDetail(id)
  
  if (!result) return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  return c.json(result)
})

const addDocumentSchema = z.object({
  file_url: z.string().url(),
  file_name: z.string().min(1).max(255),
  file_category: z.string().optional(),
})

// POST /aduan/:id/documents
aduan.post('/:id/documents', zValidator('json', addDocumentSchema), async (c) => {
  const aduanId = c.req.param('id')
  const body = c.req.valid('json')
  const user = c.get('user')
  
  await AduanService.addDocument(aduanId, body, user.userId)
  return c.json({ message: 'Dokumen berhasil ditambahkan' }, 201)
})

// DELETE /aduan/:id/documents/:docId — Admin only
aduan.delete('/:id/documents/:docId', requireAdmin, async (c) => {
  const aduanId = c.req.param('id')
  const docId = c.req.param('docId')
  const user = c.get('user')

  try {
    await AduanService.deleteDocument(aduanId, docId, user)
    return c.json({ success: true })
  } catch (error: any) {
    return c.json({ error: error.message }, 404)
  }
})

const createAduanSchema = z.object({
  surat_nomor: z.string().optional(),
  surat_tanggal: z.string().optional(),
  surat_asal_perihal: z.string().optional(),
  pengadu_nama: z.string().min(1),
  pengadu_telepon: z.string().optional(),
  pengadu_email: z.string().email().optional().nullable(),
  pengadu_instansi: z.string().optional(),
  kategori_masalah: z.string().optional(),
  ringkasan_masalah: z.string().min(1),
  nama_kps: z.array(z.string()).optional(),
  jenis_kps: z.array(z.string()).optional(),
  nomor_sk: z.array(z.string()).optional(),
  id_kps_api: z.array(z.string()).optional(),
  lokasi_prov: z.string().optional(),
  lokasi_kab: z.string().optional(),
  lokasi_kec: z.string().optional(),
  lokasi_desa: z.string().optional(),
  lokasi_luas_ha: z.number().optional(),
  jumlah_kk: z.number().optional(),
  lokasi_lat: z.array(z.string()).optional(),
  lokasi_lng: z.array(z.string()).optional(),
  pic_id: z.string().uuid().optional().nullable(),
  pic_name: z.string().optional(),
})

// POST /aduan
aduan.post('/', zValidator('json', createAduanSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  const result = await AduanService.create(data, user.userId)
  return c.json(result, 201)
})

const updateAduanSchema = z.object({
  surat_nomor: z.string().optional(),
  surat_tanggal: z.string().optional(),
  surat_asal_perihal: z.string().optional(),
  pengadu_nama: z.string().optional(),
  pengadu_telepon: z.string().optional(),
  pengadu_email: z.string().email().optional().nullable(),
  pengadu_instansi: z.string().optional(),
  kategori_masalah: z.string().optional(),
  ringkasan_masalah: z.string().optional(),
  status: z.string().optional(),
  alasan_penolakan: z.string().optional(),
  nama_kps: z.array(z.string()).optional(),
  jenis_kps: z.array(z.string()).optional(),
  nomor_sk: z.array(z.string()).optional(),
  id_kps_api: z.array(z.string()).optional(),
  lokasi_prov: z.string().optional(),
  lokasi_kab: z.string().optional(),
  lokasi_kec: z.string().optional(),
  lokasi_desa: z.string().optional(),
  lokasi_luas_ha: z.number().optional(),
  jumlah_kk: z.number().optional(),
  lokasi_lat: z.array(z.string()).optional(),
  lokasi_lng: z.array(z.string()).optional(),
  surat_file_url: z.string().optional(),
  pic_id: z.string().uuid().optional().nullable(),
  pic_name: z.string().optional(),
})

// PATCH /aduan/:id
aduan.patch('/:id', zValidator('json', updateAduanSchema), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const data = c.req.valid('json')

  if (Object.keys(data).length === 0) {
    return c.json({ error: 'Tidak ada field yang diupdate' }, 400)
  }

  try {
    const result = await AduanService.update(id, data, user)
    if (!result) return c.json({ error: 'Aduan tidak ditemukan' }, 404)
    return c.json(result)
  } catch (error: any) {
    return c.json({ error: error.message }, 403)
  }
})

// DELETE /aduan/:id (admin only)
aduan.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  
  const deleted = await AduanService.delete(id)
  if (!deleted) return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  
  return c.json({ message: 'Aduan berhasil dihapus' })
})

export default aduan
