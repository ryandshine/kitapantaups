import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { bodyLimit } from 'hono/body-limit'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { randomUUID } from 'crypto'

const aduan = new Hono()

aduan.use('*', requireAuth)

// GET /aduan?status=&search=&page=&limit=&offset=&start_date=&end_date=&provinsi=
aduan.get('/', async (c) => {
  const status = c.req.query('status')
  const search = c.req.query('search')
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 20
  const reqOffset = c.req.query('offset')
  const offset = reqOffset ? Number(reqOffset) : (page - 1) * limit

  const startDate = c.req.query('start_date')
  const endDate = c.req.query('end_date')
  const provinsi = c.req.query('provinsi')

  const conditions: string[] = []
  const params: any[] = []

  if (status) {
    params.push(status)
    conditions.push(`a.status = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(a.pengadu_nama ILIKE $${params.length} OR a.ringkasan_masalah ILIKE $${params.length} OR a.nomor_tiket ILIKE $${params.length} OR a.surat_asal_perihal ILIKE $${params.length})`)
  }

  const nomorTiket = c.req.query('nomor_tiket')
  if (nomorTiket) {
    params.push(nomorTiket)
    conditions.push(`a.nomor_tiket = $${params.length}`)
  }

  if (startDate) {
    params.push(startDate)
    conditions.push(`a.created_at >= $${params.length}::timestamp`)
  }
  if (endDate) {
    params.push(endDate + ' 23:59:59')
    conditions.push(`a.created_at <= $${params.length}::timestamp`)
  }
  if (provinsi && provinsi !== 'all') {
    params.push(provinsi)
    conditions.push(`a.lokasi_prov = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows, countResult] = await Promise.all([
    pool.query(
      `SELECT a.*, u.display_name as creator_name, COUNT(tl.id) as jumlah_tl
       FROM aduan a
       LEFT JOIN users u ON u.id = a.created_by
       LEFT JOIN tindak_lanjut tl ON tl.aduan_id = a.id
       ${where} 
       GROUP BY a.id, u.display_name
       ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) as total FROM aduan a ${where}`, params),
  ])

  return c.json({
    data: rows.rows,
    total: Number(countResult.rows[0].total),
    page,
    limit,
  })
})

// GET /aduan/provinces
aduan.get('/provinces', async (c) => {
  const result = await pool.query(`SELECT DISTINCT lokasi_prov FROM aduan WHERE lokasi_prov IS NOT NULL AND lokasi_prov != '' ORDER BY lokasi_prov ASC`)
  return c.json(result.rows.map(r => r.lokasi_prov))
})

// POST /aduan/upload — multipart file upload
aduan.post(
  '/upload',
  bodyLimit({ maxSize: 10 * 1024 * 1024, onError: (c) => c.json({ error: 'File terlalu besar (maks 10 MB)' }, 413) }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined
    const rawAduanId = body['aduan_id']

    if (!file || typeof file === 'string') {
      return c.json({ error: 'File tidak ditemukan' }, 400)
    }
    if (!rawAduanId || typeof rawAduanId !== 'string') {
      return c.json({ error: 'aduan_id wajib diisi' }, 400)
    }

    const aduanCheck = await pool.query('SELECT id, nomor_tiket FROM aduan WHERE id = $1 LIMIT 1', [rawAduanId])
    if (aduanCheck.rows.length === 0) {
      return c.json({ error: 'Aduan tidak ditemukan' }, 404)
    }

    const safeAduanId = rawAduanId.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeAduanId) {
      return c.json({ error: 'aduan_id tidak valid' }, 400)
    }

    const nomorTiketFolder = (aduanCheck.rows[0].nomor_tiket as string).replace(/[^a-zA-Z0-9_-]/g, '')

    const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'shp', 'dbf', 'prj', 'shx', 'mp3', 'm4a', 'wav', 'ogg', 'aac'])
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return c.json({ error: 'Tipe file tidak diizinkan. Gunakan: pdf, jpg, png, doc, docx, xls, xlsx, zip, shp, dbf, prj, shx, mp3, m4a, wav, ogg, aac' }, 400)
    }

    const safeCategory = ((body['category'] as string) || 'dokumen').replace(/[^a-zA-Z0-9_-]/g, '')
    const fileName = `${safeCategory}_${randomUUID()}.${ext}`

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const uploadDir = path.join(__dirname, '../uploads', nomorTiketFolder)

    await mkdir(uploadDir, { recursive: true })
    
    // Streaming upload to save memory
    const writePath = path.join(uploadDir, fileName)
    const writeStream = createWriteStream(writePath)

    // Convert Web Stream to Node Stream and pipe
    // Note: file.stream() returns a ReadableStream (Web API)
    try {
      await pipeline(file.stream() as any, writeStream)
    } catch (err) {
      // Hapus file parsial jika pipeline gagal
      await unlink(writePath).catch(() => {})
      return c.json({ error: 'Gagal menyimpan file. Silakan coba lagi.' }, 500)
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
    return c.json({ url: `${baseUrl}/uploads/${nomorTiketFolder}/${fileName}` })
  }
)

// GET /aduan/provinces
aduan.get('/provinces', async (c) => {
  const result = await pool.query(
    `SELECT DISTINCT lokasi_prov FROM aduan WHERE lokasi_prov IS NOT NULL ORDER BY lokasi_prov`
  )
  return c.json(result.rows.map((r: any) => r.lokasi_prov))
})

// GET /aduan/:id
aduan.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [aduanResult, tlResult, docsResult] = await Promise.all([
    pool.query(
      `SELECT a.*, u.display_name as creator_name
       FROM aduan a LEFT JOIN users u ON u.id = a.created_by
       WHERE a.id = $1`,
      [id]
    ),
    pool.query('SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC', [id]),
    pool.query('SELECT * FROM aduan_documents WHERE aduan_id = $1 ORDER BY created_at DESC', [id]),
  ])

  if (aduanResult.rows.length === 0) return c.json({ error: 'Aduan tidak ditemukan' }, 404)

  return c.json({
    ...aduanResult.rows[0],
    tindak_lanjut: tlResult.rows,
    documents: docsResult.rows,
  })
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
  await pool.query(
    `INSERT INTO aduan_documents (aduan_id, file_url, file_name, file_category) VALUES ($1, $2, $3, $4)`,
    [aduanId, body.file_url, body.file_name, body.file_category || 'dokumen']
  )
  return c.json({ message: 'Dokumen berhasil ditambahkan' }, 201)
})

// DELETE /aduan/:id/documents/:docId — Admin only
aduan.delete('/:id/documents/:docId', requireAdmin, async (c) => {
  const aduanId = c.req.param('id')
  const docId = c.req.param('docId')

  // Cek dokumen ada dan milik aduan ini
  const docResult = await pool.query(
    'SELECT * FROM aduan_documents WHERE id = $1 AND aduan_id = $2',
    [docId, aduanId]
  )
  if (docResult.rows.length === 0) {
    return c.json({ error: 'Dokumen tidak ditemukan' }, 404)
  }

  const doc = docResult.rows[0]

  // Hapus file fisik dari disk
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    // file_url format: http://host/uploads/aduanId/filename
    const urlPath = new URL(doc.file_url).pathname // /uploads/aduanId/filename
    const filePath = path.join(__dirname, '..', urlPath)
    await unlink(filePath).catch(() => {}) // tidak error kalau file sudah tidak ada
  } catch {
    // URL tidak valid atau path tidak bisa diparsing — tetap lanjut hapus dari DB
  }

  // Hapus dari DB
  await pool.query('DELETE FROM aduan_documents WHERE id = $1', [docId])

  // Log activity
  const user = c.get('user')
  await pool.query(
    `INSERT INTO app_activities (type, description, user_id, user_name, aduan_id, metadata)
     VALUES ('delete_document', $1, $2, $3, $4, $5)`,
    [
      `Menghapus dokumen: ${doc.file_name}`,
      user.userId,
      user.email,
      aduanId,
      JSON.stringify({ file_name: doc.file_name, file_url: doc.file_url })
    ]
  )

  return c.json({ success: true })
})

const createAduanSchema = z.object({
  surat_nomor: z.string().optional(),
  surat_tanggal: z.string().optional(),
  surat_asal_perihal: z.string().optional(),
  pengadu_nama: z.string().min(1),
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
})

// POST /aduan
aduan.post('/', zValidator('json', createAduanSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  // Generate nomor tiket
  const year = new Date().getFullYear()
  const countResult = await pool.query(
    "SELECT COUNT(*) as count FROM aduan WHERE EXTRACT(YEAR FROM created_at) = $1",
    [year]
  )
  const count = Number(countResult.rows[0].count) + 1
  const nomorTiket = `ADU${year.toString().slice(2)}${String(count).padStart(6, '0')}`

  const result = await pool.query(
    `INSERT INTO aduan (
      nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal,
      pengadu_nama, pengadu_instansi, kategori_masalah, ringkasan_masalah,
      nama_kps, jenis_kps, nomor_sk, id_kps_api,
      lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa, lokasi_luas_ha,
      jumlah_kk, lokasi_lat, lokasi_lng, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING *`,
    [
      nomorTiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal,
      data.pengadu_nama, data.pengadu_instansi, data.kategori_masalah, data.ringkasan_masalah,
      data.nama_kps, data.jenis_kps, data.nomor_sk, data.id_kps_api,
      data.lokasi_prov, data.lokasi_kab, data.lokasi_kec, data.lokasi_desa, data.lokasi_luas_ha,
      data.jumlah_kk, data.lokasi_lat, data.lokasi_lng, user.userId,
    ]
  )

  return c.json(result.rows[0], 201)
})

const updateAduanSchema = z.object({
  surat_nomor: z.string().optional(),
  surat_tanggal: z.string().optional(),
  surat_asal_perihal: z.string().optional(),
  pengadu_nama: z.string().optional(),
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
  drive_folder_id: z.string().optional(),
})

// PATCH /aduan/:id
aduan.patch('/:id', zValidator('json', updateAduanSchema), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const data = c.req.valid('json')

  const sets: string[] = []
  const params: any[] = []

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      params.push(value)
      sets.push(`${key} = $${params.length}`)
    }
  }

  if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400)

  params.push(user.userId)
  sets.push(`updated_by = $${params.length}`)
  params.push(id)

  const result = await pool.query(
    `UPDATE aduan SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  )

  if (result.rowCount === 0) return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  return c.json(result.rows[0])
})

// DELETE /aduan/:id (admin only)
aduan.delete('/:id', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const result = await pool.query('DELETE FROM aduan WHERE id = $1', [id])
  if (result.rowCount === 0) return c.json({ error: 'Aduan tidak ditemukan' }, 404)
  return c.json({ message: 'Aduan berhasil dihapus' })
})

export default aduan
