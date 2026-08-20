import { pool } from '../db.js'

export const DashboardRepository = {
  async getStats() {
    const [total, byStatus, recent, rkps, kups, monthlyTrend] = await Promise.all([
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
        GROUP BY ku.kelas
      `),
      pool.query(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('year', CURRENT_DATE),
            date_trunc('month', CURRENT_DATE),
            interval '1 month'
          ) AS month
        ), received AS (
          SELECT date_trunc('month', created_at) AS month, COUNT(*)::int AS count
          FROM public.aduan
          WHERE created_at >= date_trunc('year', CURRENT_DATE)
          GROUP BY 1
        ), resolved AS (
          SELECT date_trunc('month', created_at) AS month, COUNT(DISTINCT aduan_id)::int AS count
          FROM public.app_activities
          WHERE type = 'update_status'
            AND metadata->>'to_status' = 'selesai'
            AND created_at >= date_trunc('year', CURRENT_DATE)
          GROUP BY 1
        )
        SELECT
          months.month,
          COALESCE(received.count, 0)::int AS received,
          COALESCE(resolved.count, 0)::int AS resolved
        FROM months
        LEFT JOIN received ON received.month = months.month
        LEFT JOIN resolved ON resolved.month = months.month
        ORDER BY months.month
      `),
    ])

    return {
      total: Number(total.rows[0].total),
      byStatus: byStatus.rows,
      recent: Number(recent.rows[0].count),
      rkps: Number(rkps.rows[0].count),
      kups: kups.rows,
      monthlyTrend: monthlyTrend.rows,
    }
  }
}
