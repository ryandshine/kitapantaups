import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const tl = new Hono()

tl.use('*', requireAuth)

const tlSchema = z.object({
  tanggal: z.string(),
  jenis_tl: z.string(),
  keterangan: z.string().optional(),
  file_urls: z.array(z.string()).optional(),
  nomor_surat_output: z.string().optional(),
  link_drive: z.string().optional(),
})

// GET /aduan/:aduanId/tindak-lanjut
tl.get('/', async (c) => {
  const aduanId = c.req.param('aduanId')
  const result = await pool.query(
    'SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC',
    [aduanId]
  )
  return c.json(result.rows)
})

// PUT /tindak-lanjut/:id
export const updateTl = async (c: any) => {
  const id = c.req.param('id')
  const body = await c.req.json()

  const dataParse = tlSchema.partial().safeParse(body)
  if (!dataParse.success) {
    return c.json({ error: 'Payload tidak valid', issues: dataParse.error.flatten() }, 400)
  }

  const data = dataParse.data

  const result = await pool.query(
    `UPDATE tindak_lanjut
     SET tanggal = COALESCE($1, tanggal),
         jenis_tl = COALESCE($2, jenis_tl),
         keterangan = COALESCE($3, keterangan),
         file_urls = COALESCE($4, file_urls),
         nomor_surat_output = COALESCE($5, nomor_surat_output),
         link_drive = COALESCE($6, link_drive)
     WHERE id = $7
     RETURNING *`,
    [
      data.tanggal ?? null,
      data.jenis_tl ?? null,
      data.keterangan ?? null,
      data.file_urls ?? null,
      data.nomor_surat_output ?? null,
      data.link_drive ?? null,
      id,
    ]
  )

  if (result.rowCount === 0) {
    return c.json({ error: 'Tindak lanjut tidak ditemukan' }, 404)
  }

  return c.json(result.rows[0])
}

// POST /aduan/:aduanId/tindak-lanjut
tl.post('/', zValidator('json', tlSchema), async (c) => {
  const aduanId = c.req.param('aduanId')
  const user = c.get('user')
  const data = c.req.valid('json')

  const userResult = await pool.query(
    'SELECT display_name FROM users WHERE id = $1',
    [user.userId]
  )
  const displayName = userResult.rows[0]?.display_name || user.email

  const result = await pool.query(
    `INSERT INTO tindak_lanjut (aduan_id, tanggal, jenis_tl, keterangan, file_urls, nomor_surat_output, link_drive, created_by, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [aduanId, data.tanggal, data.jenis_tl, data.keterangan, data.file_urls,
     data.nomor_surat_output, data.link_drive, user.userId, displayName]
  )

  return c.json(result.rows[0], 201)
})

export const deleteTl = async (c: any) => {
  const id = c.req.param('id')
  const result = await pool.query('DELETE FROM tindak_lanjut WHERE id = $1', [id])
  if (result.rowCount === 0) {
    return c.json({ error: 'Tindak lanjut tidak ditemukan' }, 404)
  }
  return c.json({ message: 'Tindak lanjut berhasil dihapus' })
}

export default tl
