import { Hono } from 'hono'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const master = new Hono()

master.use('*', requireAuth)

// GET /master/status
master.get('/status', async (c) => {
  const result = await pool.query('SELECT * FROM master_status ORDER BY id')
  return c.json(result.rows)
})

// GET /master/kategori
master.get('/kategori', async (c) => {
  const result = await pool.query('SELECT * FROM master_kategori_masalah ORDER BY nama_kategori')
  return c.json(result.rows)
})

// GET /master/jenis-tl
master.get('/jenis-tl', async (c) => {
  const result = await pool.query('SELECT * FROM master_jenis_tl ORDER BY nama_jenis_tl')
  return c.json(result.rows)
})

// GET /master/kps?search=&page=&limit=
master.get('/kps', async (c) => {
  const search = c.req.query('search') || ''
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 50
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(nama_kps ILIKE $${params.length} OR nomor_sk ILIKE $${params.length})`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM master_kps ${where} ORDER BY nama_kps LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) as total FROM master_kps ${where}`, params),
  ])

  return c.json({
    data: rows.rows,
    total: Number(countResult.rows[0].total),
    page,
    limit,
  })
})

export default master
