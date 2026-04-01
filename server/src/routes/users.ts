import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { UserService } from '../services/user.service.js'

const users = new Hono()

// GET /users - Admin only
users.get('/', requireAuth, requireAdmin, async (c) => {
  const result = await UserService.getAllUsers()
  return c.json(result)
})

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
  role: z.enum(['admin', 'staf']).optional(),
  phone: z.string().optional(),
})

// POST /users - Public registration or Admin creating user
users.post('/', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json')
  const authHeader = c.req.header('Authorization')
  
  // Panggil layer Service murni
  const newUser = await UserService.createUser(data, authHeader)
  return c.json(newUser, 201)
})

const updateUserSchema = z.object({
  display_name: z.string().optional(),
  role: z.enum(['admin', 'staf']).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

// PATCH /users/:id - Admin only
users.patch('/:id', requireAuth, requireAdmin, zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id')
  const data = c.req.valid('json')

  // Validasi request kosong
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'Tidak ada field yang diupdate' }, 400)
  }

  // Oper ke layer Service
  const updatedUser = await UserService.updateUser(id, data)
  
  if (!updatedUser) {
    return c.json({ error: 'User tidak ditemukan' }, 404)
  }
  
  return c.json(updatedUser)
})

// DELETE /users/:id - Admin only
users.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = c.req.param('id')
  
  const deleted = await UserService.deleteUser(id)
  
  if (!deleted) {
    return c.json({ error: 'User tidak ditemukan' }, 404)
  }
  
  return c.json({ message: 'User berhasil dihapus' })
})

export default users
