import { pool } from '../db.js'

export const AduanRepository = {
  async findAndCountAll(params: any[], conditions: string[], limit: number, offset: number) {
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT
           a.*,
           u.display_name as creator_name,
           COUNT(tl.id) as jumlah_tl,
           COALESCE(
             ARRAY_REMOVE(ARRAY_AGG(DISTINCT mk.kps_type), NULL),
             ARRAY[]::text[]
           ) as type_kps
         FROM aduan a
         LEFT JOIN users u ON u.id = a.created_by
         LEFT JOIN tindak_lanjut tl ON tl.aduan_id = a.id
         LEFT JOIN LATERAL unnest(a.id_kps_api) AS kps_id ON true
         LEFT JOIN master_kps mk ON mk.id_kps_api = kps_id
         ${where} 
         GROUP BY a.id, u.display_name
         ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM aduan a ${where}`, params),
    ])

    return {
      data: rows.rows,
      total: Number(countResult.rows[0].total)
    }
  },

  async findDistinctProvinces() {
    const result = await pool.query(`SELECT DISTINCT lokasi_prov FROM aduan WHERE lokasi_prov IS NOT NULL AND lokasi_prov != '' ORDER BY lokasi_prov ASC`)
    return result.rows.map(r => r.lokasi_prov)
  },

  async findById(id: string) {
    const [aduanResult, tlResult, docsResult] = await Promise.all([
      pool.query(
        `SELECT
           a.*,
           u.display_name as creator_name,
           COALESCE(
             ARRAY(
               SELECT DISTINCT mk.kps_type
               FROM unnest(a.id_kps_api) AS kps_id
               LEFT JOIN master_kps mk ON mk.id_kps_api = kps_id
               WHERE mk.kps_type IS NOT NULL
             ),
             ARRAY[]::text[]
           ) as type_kps
         FROM aduan a LEFT JOIN users u ON u.id = a.created_by
         WHERE a.id = $1`,
        [id]
      ),
      pool.query('SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC', [id]),
      pool.query('SELECT * FROM aduan_documents WHERE aduan_id = $1 ORDER BY created_at DESC', [id]),
    ])

    if (aduanResult.rows.length === 0) return null

    return {
      ...aduanResult.rows[0],
      tindak_lanjut: tlResult.rows,
      documents: docsResult.rows,
    }
  },

  async findSimpleById(id: string) {
    const result = await pool.query('SELECT id, nomor_tiket FROM aduan WHERE id = $1 LIMIT 1', [id])
    return result.rows.length > 0 ? result.rows[0] : null
  },

  async countByYear(year: number) {
    const countResult = await pool.query(
      "SELECT COUNT(*) as count FROM aduan WHERE EXTRACT(YEAR FROM created_at) = $1",
      [year]
    )
    return Number(countResult.rows[0].count)
  },

  async create(data: any, nomorTiket: string, userId: string) {
    const result = await pool.query(
      `INSERT INTO aduan (
        nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal,
        pengadu_nama, pengadu_telepon, pengadu_email, pengadu_instansi, kategori_masalah, ringkasan_masalah,
        nama_kps, jenis_kps, nomor_sk, id_kps_api,
        lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa, lokasi_luas_ha,
        jumlah_kk, lokasi_lat, lokasi_lng, pic_id, pic_name, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *`,
      [
        nomorTiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal,
        data.pengadu_nama, data.pengadu_telepon, data.pengadu_email, data.pengadu_instansi, data.kategori_masalah, data.ringkasan_masalah,
        data.nama_kps, data.jenis_kps, data.nomor_sk, data.id_kps_api,
        data.lokasi_prov, data.lokasi_kab, data.lokasi_kec, data.lokasi_desa, data.lokasi_luas_ha,
        data.jumlah_kk, data.lokasi_lat, data.lokasi_lng, data.pic_id, data.pic_name, userId,
      ]
    )
    return result.rows[0]
  },

  async update(id: string, data: any, userId: string) {
    const sets: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        params.push(value)
        sets.push(`${key} = $${params.length}`)
      }
    }

    if (sets.length === 0) return null

    params.push(userId)
    sets.push(`updated_by = $${params.length}`)
    params.push(id)

    const result = await pool.query(
      `UPDATE aduan SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )

    if (result.rowCount === 0) return null
    return result.rows[0]
  },

  async delete(id: string) {
    const result = await pool.query('DELETE FROM aduan WHERE id = $1', [id])
    return result.rowCount !== 0
  },

  async createDocument(aduanId: string, fileUrl: string, fileName: string, fileCategory: string, userId: string) {
    await pool.query(
      `INSERT INTO aduan_documents (aduan_id, file_url, file_name, file_category, created_by) VALUES ($1, $2, $3, $4, $5)`,
      [aduanId, fileUrl, fileName, fileCategory, userId]
    )
  },

  async findDocument(docId: string, aduanId: string) {
    const result = await pool.query(
      'SELECT * FROM aduan_documents WHERE id = $1 AND aduan_id = $2',
      [docId, aduanId]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  },

  async deleteDocument(docId: string) {
    await pool.query('DELETE FROM aduan_documents WHERE id = $1', [docId])
  },

  async getActorName(userId: string, fallbackEmail: string) {
    const result = await pool.query(
      'SELECT display_name FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    return result.rows[0]?.display_name || fallbackEmail
  },

  async logActivity(type: string, description: string, userId: string, actorName: string, aduanId: string, metadata: any) {
    await pool.query(
      `INSERT INTO app_activities (type, description, user_id, user_name, aduan_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [type, description, userId, actorName, aduanId, JSON.stringify(metadata)]
    )
  }
}
