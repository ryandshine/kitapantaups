import { pool } from '../db.js'

export const SummaryRepository = {
  async getSummary() {
    const [overview, kpsOverview, statuses, monthlyTrend, aging, provinces, regencies, categories, rkps, kups, pics, priority, recent, appendix] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_aduan,
          COUNT(*) FILTER (WHERE status = 'selesai')::int AS selesai,
          COUNT(*) FILTER (WHERE status <> 'selesai')::int AS aktif,
          COUNT(*) FILTER (WHERE status <> 'selesai' AND created_at < NOW() - INTERVAL '30 days')::int AS terlambat,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('year', CURRENT_DATE))::int AS tahun_berjalan
        FROM public.aduan
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_kps,
          COALESCE(SUM(luas_total), 0)::numeric AS total_luas,
          COALESCE(SUM(anggota_pria), 0)::int AS anggota_pria,
          COALESCE(SUM(anggota_wanita), 0)::int AS anggota_wanita
        FROM (
          SELECT
            k.id,
            MAX(COALESCE(k.luas_total, 0)) AS luas_total,
            MAX(COALESCE(k.anggota_pria, 0)) AS anggota_pria,
            MAX(COALESCE(k.anggota_wanita, 0)) AS anggota_wanita
          FROM public.kps k
          JOIN public.aduan_kps ak ON ak.kps_id = k.id
          GROUP BY k.id
        ) kps_totals
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(BTRIM(status), ''), 'tanpa_status') AS label, COUNT(*)::int AS count
        FROM public.aduan
        GROUP BY 1
        ORDER BY count DESC, label ASC
      `),
      pool.query(`
        WITH months AS (
          SELECT generate_series(date_trunc('year', CURRENT_DATE), date_trunc('month', CURRENT_DATE), interval '1 month') AS month
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
          TO_CHAR(months.month, 'YYYY-MM-01') AS month,
          COALESCE(received.count, 0)::int AS received,
          COALESCE(resolved.count, 0)::int AS resolved
        FROM months
        LEFT JOIN received ON received.month = months.month
        LEFT JOIN resolved ON resolved.month = months.month
        ORDER BY months.month
      `),
      pool.query(`
        SELECT bucket, COUNT(*)::int AS count
        FROM (
          SELECT CASE
            WHEN created_at >= NOW() - INTERVAL '7 days' THEN '0-7 hari'
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN '8-30 hari'
            WHEN created_at >= NOW() - INTERVAL '90 days' THEN '31-90 hari'
            ELSE '>90 hari'
          END AS bucket
          FROM public.aduan
          WHERE status <> 'selesai'
        ) aged
        GROUP BY bucket
        ORDER BY CASE bucket WHEN '0-7 hari' THEN 1 WHEN '8-30 hari' THEN 2 WHEN '31-90 hari' THEN 3 ELSE 4 END
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(BTRIM(lokasi_prov), ''), 'Tidak diketahui') AS label, COUNT(*)::int AS count
        FROM public.aduan
        GROUP BY 1
        ORDER BY count DESC, label ASC
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(BTRIM(lokasi_kab), ''), 'Tidak diketahui') AS label, COUNT(*)::int AS count
        FROM public.aduan
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 10
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(BTRIM(kategori_masalah), ''), 'Tidak dikategorikan') AS label, COUNT(*)::int AS count
        FROM public.aduan
        GROUP BY 1
        ORDER BY count DESC, label ASC
      `),
      pool.query(`
        SELECT label, COUNT(*)::int AS count
        FROM (
          SELECT CASE
            WHEN k.raw_payload->>'dokumen_rkps' = 'Sudah' THEN 'Sudah'
            ELSE 'Belum'
          END AS label
          FROM public.kps k
          JOIN public.aduan_kps ak ON ak.kps_id = k.id
          GROUP BY k.id, label
        ) rkps_status
        GROUP BY label
        ORDER BY CASE label WHEN 'Sudah' THEN 1 ELSE 2 END
      `),
      pool.query(`
        SELECT COALESCE(NULLIF(UPPER(BTRIM(ku.kelas)), ''), 'UNKNOWN') AS label, COUNT(DISTINCT ku.lembaga_id)::int AS count
        FROM public.kups ku
        GROUP BY 1
        ORDER BY count DESC, label ASC
      `),
      pool.query(`
        SELECT
          COALESCE(NULLIF(BTRIM(a.pic_name), ''), 'Belum ditugaskan') AS label,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE a.status = 'selesai')::int AS selesai,
          COUNT(*) FILTER (WHERE a.status <> 'selesai')::int AS aktif,
          ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(CASE WHEN a.status = 'selesai' THEN a.updated_at ELSE NOW() END, NOW()) - a.created_at)) / 86400))::int AS rata_rata_hari
        FROM public.aduan a
        GROUP BY 1
        ORDER BY total DESC, label ASC
      `),
      pool.query(`
        SELECT
          a.nomor_tiket AS ticket,
          COALESCE(NULLIF(BTRIM(a.surat_asal_perihal), ''), NULLIF(BTRIM(a.ringkasan_masalah), ''), '-') AS perihal,
          a.status,
          a.pic_name AS pic,
          a.created_at,
          ROUND(EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 86400)::int AS age_days
        FROM public.aduan a
        WHERE a.status <> 'selesai'
          AND a.created_at < NOW() - INTERVAL '30 days'
        ORDER BY a.created_at ASC
        LIMIT 10
      `),
      pool.query(`
        SELECT
          a.nomor_tiket AS ticket,
          COALESCE(NULLIF(BTRIM(a.surat_asal_perihal), ''), NULLIF(BTRIM(a.ringkasan_masalah), ''), '-') AS perihal,
          a.status,
          COALESCE(NULLIF(BTRIM(a.pic_name), ''), 'Belum ditugaskan') AS pic,
          a.updated_at
        FROM public.aduan a
        ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT
          a.nomor_tiket AS ticket,
          a.created_at,
          a.updated_at,
          COALESCE(NULLIF(BTRIM(a.surat_asal_perihal), ''), NULLIF(BTRIM(a.ringkasan_masalah), ''), '-') AS perihal,
          COALESCE(NULLIF(BTRIM(a.pengadu_nama), ''), '-') AS pengadu,
          COALESCE(NULLIF(BTRIM(a.status), ''), 'tanpa_status') AS status,
          COALESCE(NULLIF(BTRIM(a.pic_name), ''), 'Belum ditugaskan') AS pic,
          COALESCE(NULLIF(BTRIM(a.lokasi_prov), ''), '-') AS provinsi,
          COALESCE(NULLIF(BTRIM(a.lokasi_kab), ''), '-') AS kabupaten,
          COALESCE(string_agg(DISTINCT COALESCE(NULLIF(BTRIM(k.nama_lembaga), ''), k.surat_keputusan, k.id::text), ', '), '-') AS kps
        FROM public.aduan a
        LEFT JOIN public.aduan_kps ak ON ak.aduan_id = a.id
        LEFT JOIN public.kps k ON k.id = ak.kps_id
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `),
    ])

    return {
      overview: overview.rows[0],
      kpsOverview: kpsOverview.rows[0],
      statuses: statuses.rows,
      monthlyTrend: monthlyTrend.rows,
      aging: aging.rows,
      provinces: provinces.rows,
      regencies: regencies.rows,
      categories: categories.rows,
      rkps: rkps.rows,
      kups: kups.rows,
      pics: pics.rows,
      priority: priority.rows,
      recent: recent.rows,
      appendix: appendix.rows,
    }
  },
}
