import { pool } from '../db.js'

export const ActivityRepository = {
  async findByAduanId(aduanId: string | undefined, limit: number) {
    const conditions: string[] = []
    const params: any[] = []

    if (aduanId) {
      params.push(aduanId)
      conditions.push(`aduan_id = $${params.length}`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    params.push(limit)

    const result = await pool.query(
      `SELECT * FROM app_activities ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    )
    return result.rows
  },

  async create(type: string, description: string, aduanId: string | null, userId: string, userName: string, metadata: any) {
    await pool.query(
      `INSERT INTO app_activities (type, description, aduan_id, user_id, user_name, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [type, description, aduanId, userId, userName, JSON.stringify(metadata)]
    )
  },

  async getActorName(userId: string, fallbackEmail: string) {
    const result = await pool.query(
      'SELECT display_name FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    return result.rows[0]?.display_name || fallbackEmail
  }
}
