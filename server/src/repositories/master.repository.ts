import { pool } from '../db.js'

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
    const result = await pool.query('SELECT * FROM master_jenis_tl ORDER BY nama_jenis_tl')
    return result.rows
  },

  async findKpsAndCountAll(params: any[], conditions: string[], limit: number, offset: number) {
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT
           m.id_kps_api,
           COALESCE(NULLIF(btrim(m.nama_kps), ''), m.no_sk, m.id_kps_api) AS nama_kps,
           m.jenis_kps,
           m.kps_type,
           COALESCE(m.no_sk, '') AS nomor_sk,
           COALESCE(m.provinsi, '') AS lokasi_prov,
           COALESCE(m.kab_kota, '') AS lokasi_kab,
           COALESCE(m.kecamatan, '') AS lokasi_kec,
           COALESCE(m.desa, '') AS lokasi_desa,
           COALESCE(m.luas_sk_ha, m.luas_areal_kerja_ha, m.luas_indikatif_ha, 0) AS lokasi_luas_ha,
           COALESCE(m.jml_kk_kps, 0) AS jumlah_kk,
           COALESCE(m.nama_kph, '') AS balai,
           m.latitude AS lat,
           m.longitude AS lng
         FROM master_kps m
         ${where}
         ORDER BY COALESCE(NULLIF(btrim(m.nama_kps), ''), m.no_sk, m.id_kps_api)
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM master_kps m ${where}`, params),
    ])

    return {
      data: rows.rows,
      total: Number(countResult.rows[0].total)
    }
  }
}
