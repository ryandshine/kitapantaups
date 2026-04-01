import { pool } from '../db.js'

export const SettingRepository = {
  async findAll() {
    const result = await pool.query('SELECT key, value FROM settings')
    return result.rows
  },

  async upsert(key: string, value: string, userId: string) {
    await pool.query(
      `INSERT INTO settings (key, value, updated_by) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()`,
      [key, value, userId]
    )
  }
}
