import { pool } from '../db.js'

export const DashboardRepository = {
  async getStats() {
    const [total, byStatus, recent] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM aduan'),
      pool.query('SELECT status, COUNT(*) as count FROM aduan GROUP BY status'),
      pool.query("SELECT COUNT(*) as count FROM aduan WHERE created_at > now() - interval '30 days'"),
    ])

    return {
      total: Number(total.rows[0].total),
      byStatus: byStatus.rows,
      recent: Number(recent.rows[0].count),
    }
  }
}
