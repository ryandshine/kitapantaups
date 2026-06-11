import { pool } from '../db.js'

export const DashboardRepository = {
  async getStats() {
    const [total, byStatus, recent, rkps, kups] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM aduan'),
      pool.query('SELECT status, COUNT(*) as count FROM aduan GROUP BY status'),
      pool.query("SELECT COUNT(*) as count FROM aduan WHERE created_at > now() - interval '30 days'"),
      pool.query(`
        SELECT COUNT(DISTINCT a.id) as count
        FROM aduan a
        JOIN aduan_kps ak ON a.id = ak.aduan_id
        JOIN kps k ON ak.kps_id = k.id
        WHERE k.raw_payload->>'dokumen_rkps' = 'Sudah'
      `),
      pool.query(`
        SELECT 
          COALESCE(ku.kelas, 'Unknown') as kelas,
          COUNT(DISTINCT a.id) as count
        FROM aduan a
        JOIN aduan_kps ak ON a.id = ak.aduan_id
        JOIN kups ku ON ak.kps_id = ku.lembaga_id
        WHERE a.status = 'proses'
        GROUP BY ku.kelas
      `),
    ])

    return {
      total: Number(total.rows[0].total),
      byStatus: byStatus.rows,
      recent: Number(recent.rows[0].count),
      rkps: Number(rkps.rows[0].count),
      kups: kups.rows,
    }
  }
}
