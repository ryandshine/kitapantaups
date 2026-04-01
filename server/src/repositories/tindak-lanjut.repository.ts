import { pool } from '../db.js'

export const TindakLanjutRepository = {
  async findByAduanId(aduanId: string) {
    const result = await pool.query(
      'SELECT * FROM tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC',
      [aduanId]
    )
    return result.rows
  },

  async create(aduanId: string, data: any, userId: string, userName: string) {
    const result = await pool.query(
      `INSERT INTO tindak_lanjut (aduan_id, tanggal, jenis_tl, keterangan, file_urls, nomor_surat_output, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [aduanId, data.tanggal, data.jenis_tl, data.keterangan, data.file_urls, data.nomor_surat_output, userId, userName]
    )
    return result.rows[0]
  },

  async update(id: string, data: any) {
    const result = await pool.query(
      `UPDATE tindak_lanjut
       SET tanggal = COALESCE($1, tanggal),
           jenis_tl = COALESCE($2, jenis_tl),
           keterangan = COALESCE($3, keterangan),
           file_urls = COALESCE($4, file_urls),
           nomor_surat_output = COALESCE($5, nomor_surat_output)
       WHERE id = $6
       RETURNING *`,
      [
        data.tanggal ?? null,
        data.jenis_tl ?? null,
        data.keterangan ?? null,
        data.file_urls ?? null,
        data.nomor_surat_output ?? null,
        id,
      ]
    )
    return result.rowCount !== null && result.rowCount > 0 ? result.rows[0] : null
  },

  async delete(id: string) {
    const result = await pool.query('DELETE FROM tindak_lanjut WHERE id = $1', [id])
    return result.rowCount !== null && result.rowCount > 0
  },

  async getActorName(userId: string, fallbackEmail: string) {
    const result = await pool.query(
      'SELECT display_name FROM users WHERE id = $1 LIMIT 1',
      [userId]
    )
    return result.rows[0]?.display_name || fallbackEmail
  }
}
