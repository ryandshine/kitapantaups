import { pool } from '../db.js'

export const UserRepository = {
  async findAll() {
    const result = await pool.query(
      'SELECT id, email, display_name, role, phone, photo_url, is_active, created_at, updated_at FROM users ORDER BY created_at DESC'
    )
    return result.rows
  },

  async create(data: { email: string; password_hash: string; display_name: string; role: string; phone?: string }) {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, display_name, role, phone, is_active, created_at`,
      [data.email, data.password_hash, data.display_name, data.role, data.phone]
    )
    return result.rows[0]
  },

  async update(id: string, data: { display_name?: string; role?: string; phone?: string; is_active?: boolean; password_hash?: string }) {
    const sets: string[] = []
    const params: any[] = []

    if (data.display_name !== undefined) { params.push(data.display_name); sets.push(`display_name = $${params.length}`) }
    if (data.role !== undefined) { params.push(data.role); sets.push(`role = $${params.length}`) }
    if (data.phone !== undefined) { params.push(data.phone); sets.push(`phone = $${params.length}`) }
    if (data.is_active !== undefined) { params.push(data.is_active); sets.push(`is_active = $${params.length}`) }
    if (data.password_hash !== undefined) { params.push(data.password_hash); sets.push(`password_hash = $${params.length}`) }

    if (sets.length === 0) return null // Nothing to update

    params.push(id)
    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, email, display_name, role, phone, is_active, updated_at`,
      params
    )

    if (result.rowCount === 0) return null // Not found
    return result.rows[0]
  },

  async delete(id: string) {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id])
    return result.rowCount !== 0 // Returns true if deleted, false if not found
  }
}
