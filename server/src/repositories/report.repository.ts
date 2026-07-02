import { pool } from '../db.js'
import { SKP_DOCUMENT_TYPES } from '../lib/skp-report.js'

export type SkpDatabaseRow = {
  document_type: string
  document_number: string
  document_date: string
  complaint_number: string
  institution_name: string
  scheme: string
  complainant: string
  regency: string
  province: string
  status: string
  file_url: string
}

const SKP_TYPES = [...SKP_DOCUMENT_TYPES]

export const ReportRepository = {
  async findSkpYearRange() {
    const result = await pool.query<{ min_year: number | null; max_year: number | null }>(
      `SELECT
         MIN(EXTRACT(YEAR FROM tl.tanggal AT TIME ZONE 'Asia/Jakarta'))::integer AS min_year,
         MAX(EXTRACT(YEAR FROM tl.tanggal AT TIME ZONE 'Asia/Jakarta'))::integer AS max_year
       FROM public.tindak_lanjut tl
       WHERE tl.jenis_tl = ANY($1::text[])
         AND array_length(tl.file_urls, 1) > 0`,
      [SKP_TYPES]
    )
    return result.rows[0] || { min_year: null, max_year: null }
  },

  async findSkpFilesByYear(year: number) {
    const result = await pool.query<SkpDatabaseRow>(
      `SELECT
         tl.jenis_tl AS document_type,
         COALESCE(NULLIF(btrim(tl.nomor_surat_output), ''), '-') AS document_number,
         to_char(tl.tanggal AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS document_date,
         a.nomor_tiket AS complaint_number,
         COALESCE(NULLIF(btrim(array_to_string(a.nama_kps, ', ')), ''), '-') AS institution_name,
         COALESCE(NULLIF(btrim(array_to_string(a.jenis_kps, ', ')), ''), '-') AS scheme,
         COALESCE(NULLIF(btrim(a.pengadu_nama), ''), '-') AS complainant,
         COALESCE(NULLIF(btrim(a.lokasi_kab), ''), '-') AS regency,
         COALESCE(NULLIF(btrim(a.lokasi_prov), ''), '-') AS province,
         COALESCE(NULLIF(btrim(a.status), ''), '-') AS status,
         file_item.file_url
       FROM public.tindak_lanjut tl
       JOIN public.aduan a ON a.id = tl.aduan_id
       CROSS JOIN LATERAL unnest(COALESCE(tl.file_urls, ARRAY[]::text[]))
         WITH ORDINALITY AS file_item(file_url, file_position)
       WHERE tl.jenis_tl = ANY($1::text[])
         AND tl.tanggal >= make_timestamptz($2, 1, 1, 0, 0, 0, 'Asia/Jakarta')
         AND tl.tanggal < make_timestamptz($2 + 1, 1, 1, 0, 0, 0, 'Asia/Jakarta')
       ORDER BY tl.tanggal ASC, a.nomor_tiket ASC, tl.id ASC, file_item.file_position ASC`,
      [SKP_TYPES, year]
    )
    return result.rows
  },
}

