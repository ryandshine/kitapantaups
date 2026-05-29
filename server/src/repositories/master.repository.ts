import { pool } from '../db.js'

const KPS_SELECT = `
  SELECT
    k.id::text AS id,
    COALESCE(k.nama_lembaga, '') AS nama_lembaga,
    COALESCE(k.surat_keputusan, '') AS surat_keputusan,
    k.tanggal,
    COALESCE(k.skema, '') AS skema,
    COALESCE(k.provinsi_id, '') AS provinsi_id,
    COALESCE(k.kabupaten_id, '') AS kabupaten_id,
    COALESCE(k.kecamatan_id, '') AS kecamatan_id,
    COALESCE(k.desa_id, '') AS desa_id,
    COALESCE(k.provinsi, '') AS provinsi,
    COALESCE(k.kabupaten, '') AS kabupaten,
    COALESCE(k.kecamatan, '') AS kecamatan,
    COALESCE(k.desa, '') AS desa,
    COALESCE(k.luas_hl, 0) AS luas_hl,
    COALESCE(k.luas_hp, 0) AS luas_hp,
    COALESCE(k.luas_hpt, 0) AS luas_hpt,
    COALESCE(k.luas_hpk, 0) AS luas_hpk,
    COALESCE(k.luas_hk, 0) AS luas_hk,
    COALESCE(k.luas_apl, 0) AS luas_apl,
    COALESCE(k.luas_total, 0) AS luas_total,
    COALESCE(k.anggota_pria, 0) AS anggota_pria,
    COALESCE(k.anggota_wanita, 0) AS anggota_wanita,
    COALESCE(k.anggota_pria, 0) + COALESCE(k.anggota_wanita, 0) AS jumlah_anggota,
    COALESCE(NULLIF(btrim(k.nama_lembaga), ''), k.surat_keputusan, k.id::text) AS nama_kps,
    COALESCE(k.skema, '') AS jenis_kps,
    COALESCE(k.skema, '') AS kps_type,
    COALESCE(k.surat_keputusan, '') AS nomor_sk,
    COALESCE(k.provinsi, '') AS lokasi_prov,
    COALESCE(k.kabupaten, '') AS lokasi_kab,
    COALESCE(k.kecamatan, '') AS lokasi_kec,
    COALESCE(k.desa, '') AS lokasi_desa,
    COALESCE(k.luas_total, 0) AS lokasi_luas_ha,
    COALESCE(k.anggota_pria, 0) + COALESCE(k.anggota_wanita, 0) AS jumlah_kk,
    COALESCE(k.raw_payload->>'nama_balai', '') AS balai,
    COALESCE(k.raw_payload->>'seksi_wilayah', '') AS sekwil,
    NULL::numeric AS lat,
    NULL::numeric AS lng,
    ''::text AS skema_pemanfaatan,
    k.tanggal AS tanggal_sk,
    (k.raw_payload->>'dokumen_skps' IS NOT NULL) AS has_skps,
    false AS has_petaps,
    (k.raw_payload->>'dokumen_rkps' IS NOT NULL) AS has_rkps
  FROM public.kps k
`

export const MasterRepository = {
  async findStatus() {
    const result = await pool.query('SELECT * FROM master_status ORDER BY id')
    return result.rows
  },

  async findKategori() {
    const result = await pool.query('SELECT * FROM master_kategori_masalah ORDER BY nama_kategori')
    return result.rows
  },

  async findJenisTl() {
    const result = await pool.query(`
      SELECT *
      FROM master_jenis_tl
      ORDER BY CASE nama_jenis_tl
        WHEN 'Surat/Dokumen Pengadu' THEN 1
        WHEN 'TL Surat Jawaban' THEN 2
        WHEN 'TL Nota Dinas' THEN 3
        WHEN 'TL BA Rapat Pembahasan' THEN 4
        WHEN 'TL Notula Rapat' THEN 5
        WHEN 'Laporan Puldasi' THEN 6
        WHEN 'Lainnya' THEN 7
        WHEN 'Surat/Dokumen Pihak Terkait' THEN 8
        WHEN 'TL Berita Acara Evaluasi' THEN 9
        WHEN 'TL Surat Teguran' THEN 10
        WHEN 'Laporan Pengawasan' THEN 11
        WHEN 'Notula' THEN 12
        WHEN 'Berita Acara' THEN 13
        WHEN 'SK Perubahan' THEN 14
        WHEN 'SK Pembekuan' THEN 15
        WHEN 'SK Pencabutan Pembekuan' THEN 16
        WHEN 'SK Perpanjangan' THEN 17
        WHEN 'SK Tim Evaluasi' THEN 18
        WHEN 'Surat Pemegang PS' THEN 19
        WHEN 'Surat/ND Internal' THEN 20
        ELSE 999
      END,
      nama_jenis_tl
    `)
    return result.rows
  },

  async findKpsAndCountAll(params: any[], conditions: string[], limit: number, offset: number) {
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, countResult] = await Promise.all([
      pool.query(
        `${KPS_SELECT}
         ${where}
         ORDER BY COALESCE(NULLIF(btrim(k.nama_lembaga), ''), k.surat_keputusan, k.id::text)
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM public.kps k ${where}`, params),
    ])

    return {
      data: rows.rows,
      total: Number(countResult.rows[0].total)
    }
  },

  async findKpsById(id: string) {
    const result = await pool.query(`${KPS_SELECT} WHERE k.id = $1 LIMIT 1`, [id])
    return result.rows[0] || null
  }
}
