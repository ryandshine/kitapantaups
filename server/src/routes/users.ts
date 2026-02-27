import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const users = new Hono()

users.use('*', requireAuth, requireAdmin)

// GET /users
users.get('/', async (c) => {
  const result = await pool.query(
    'SELECT id, email, display_name, role, phone, photo_url, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
  )
  return c.json(result.rows)
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
  role: z.enum(['admin', 'staf']),
  phone: z.string().optional(),
})

// POST /users
users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const hash = await bcrypt.hash(data.password, 12)

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, role, phone, is_active, created_at`,
    [data.email, hash, data.display_name, data.role, data.phone]
  )

  return c.json(result.rows[0], 201)
})

const updateUserSchema = z.object({
  display_name: z.string().optional(),
  role: z.enum(['admin', 'staf']).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

// PATCH /users/:id
users.patch('/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')

  const sets: string[] = []
  const params: any[] = []

  if (data.display_name !== undefined) { params.push(data.display_name); sets.push(`display_name = $${params.length}`) }
  if (data.role !== undefined) { params.push(data.role); sets.push(`role = $${params.length}`) }
  if (data.phone !== undefined) { params.push(data.phone); sets.push(`phone = $${params.length}`) }
  if (data.is_active !== undefined) { params.push(data.is_active); sets.push(`is_active = $${params.length}`) }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 12)
    params.push(hash)
    sets.push(`password_hash = $${params.length}`)
  }

  if (sets.length === 0) return c.json({ error: 'Tidak ada field yang diupdate' }, 400)

  params.push(id)
  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, email, display_name, role, phone, is_active, updated_at`,
    params
  )

  if (result.rowCount === 0) return c.json({ error: 'User tidak ditemukan' }, 404)
  return c.json(result.rows[0])
})

// DELETE /users/:id
users.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
  if (result.rowCount === 0) return c.json({ error: 'User tidak ditemukan' }, 404)
  return c.json({ message: 'User berhasil dihapus' })
})

export default users
