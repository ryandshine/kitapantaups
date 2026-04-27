import { pool } from '../db.js'

const ADUAN_BASE_SELECT = `
  a.id,
  a.nomor_tiket,
  a.surat_nomor,
  a.surat_tanggal,
  a.surat_asal_perihal,
  a.pengadu_nama,
  a.pengadu_telepon,
  a.pengadu_email,
  a.pengadu_instansi,
  a.kategori_masalah,
  a.ringkasan_masalah,
  a.status,
  a.lokasi_prov,
  a.lokasi_kab,
  a.lokasi_kec,
  a.lokasi_desa,
  a.lokasi_luas_ha,
  a.lokasi_lat,
  a.lokasi_lng,
  a.jumlah_kk,
  a.alasan_penolakan,
  a.surat_file_url,
  a.pic_id,
  a.pic_name,
  a.created_by,
  a.updated_by,
  a.created_at,
  a.updated_at
`

const KPS_AGGREGATE_SELECT = `
  COALESCE(array_agg(k.id::text ORDER BY ak.position), ARRAY[]::text[]) AS kps_ids,
  COALESCE(array_agg(COALESCE(NULLIF(btrim(k.nama_lembaga), ''), k.surat_keputusan, k.id::text) ORDER BY ak.position), ARRAY[]::text[]) AS nama_kps,
  COALESCE(array_agg(COALESCE(k.skema, '') ORDER BY ak.position), ARRAY[]::text[]) AS jenis_kps,
  COALESCE(array_agg(COALESCE(k.skema, '') ORDER BY ak.position), ARRAY[]::text[]) AS type_kps,
  COALESCE(array_agg(COALESCE(k.surat_keputusan, '') ORDER BY ak.position), ARRAY[]::text[]) AS nomor_sk,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', k.id::text,
        'nama_lembaga', COALESCE(k.nama_lembaga, ''),
        'surat_keputusan', COALESCE(k.surat_keputusan, ''),
        'tanggal', k.tanggal,
        'skema', COALESCE(k.skema, ''),
        'provinsi_id', COALESCE(k.provinsi_id, ''),
        'kabupaten_id', COALESCE(k.kabupaten_id, ''),
        'kecamatan_id', COALESCE(k.kecamatan_id, ''),
        'desa_id', COALESCE(k.desa_id, ''),
        'provinsi', COALESCE(k.provinsi, ''),
        'kabupaten', COALESCE(k.kabupaten, ''),
        'kecamatan', COALESCE(k.kecamatan, ''),
        'desa', COALESCE(k.desa, ''),
        'luas_hl', COALESCE(k.luas_hl, 0),
        'luas_hp', COALESCE(k.luas_hp, 0),
        'luas_hpt', COALESCE(k.luas_hpt, 0),
        'luas_hpk', COALESCE(k.luas_hpk, 0),
        'luas_hk', COALESCE(k.luas_hk, 0),
        'luas_apl', COALESCE(k.luas_apl, 0),
        'luas_total', COALESCE(k.luas_total, 0),
        'anggota_pria', COALESCE(k.anggota_pria, 0),
        'anggota_wanita', COALESCE(k.anggota_wanita, 0),
        'jumlah_anggota', COALESCE(k.anggota_pria, 0) + COALESCE(k.anggota_wanita, 0),
        'nama_kps', COALESCE(NULLIF(btrim(k.nama_lembaga), ''), k.surat_keputusan, k.id::text),
        'jenis_kps', COALESCE(k.skema, ''),
        'kps_type', COALESCE(k.skema, ''),
        'nomor_sk', COALESCE(k.surat_keputusan, ''),
        'lokasi_prov', COALESCE(k.provinsi, ''),
        'lokasi_kab', COALESCE(k.kabupaten, ''),
        'lokasi_kec', COALESCE(k.kecamatan, ''),
        'lokasi_desa', COALESCE(k.desa, ''),
        'lokasi_luas_ha', COALESCE(k.luas_total, 0),
        'jumlah_kk', COALESCE(k.anggota_pria, 0) + COALESCE(k.anggota_wanita, 0),
        'balai', '',
        'lat', NULL,
        'lng', NULL,
        'skema_pemanfaatan', '',
        'tanggal_sk', k.tanggal,
        'has_skps', false,
        'has_petaps', false,
        'has_rkps', false
      )
      ORDER BY ak.position
    ),
    '[]'::jsonb
  ) AS kps_items
`

const getOrderedKpsRows = async (client: any, kpsIds: string[]) => {
  if (!Array.isArray(kpsIds) || kpsIds.length === 0) return []

  const result = await client.query(
    `SELECT
       selected.kps_id::text AS requested_id,
       k.id::text AS id,
       COALESCE(NULLIF(btrim(k.nama_lembaga), ''), k.surat_keputusan, k.id::text) AS nama_kps,
       COALESCE(k.skema, '') AS jenis_kps,
       COALESCE(k.skema, '') AS kps_type,
       COALESCE(k.surat_keputusan, '') AS nomor_sk
     FROM unnest($1::text[]) WITH ORDINALITY AS selected(kps_id, ord)
     JOIN public.kps k ON k.id = selected.kps_id
     ORDER BY selected.ord`,
    [kpsIds]
  )

  const uniqueIds = [...new Set(kpsIds)]
  if (result.rows.length !== uniqueIds.length) {
    throw new Error('Sebagian data KPS tidak ditemukan di master baru')
  }

  return result.rows
}

const replaceAduanKps = async (client: any, aduanId: string, kpsIds: string[]) => {
  await client.query('DELETE FROM public.aduan_kps WHERE aduan_id = $1', [aduanId])

  if (!Array.isArray(kpsIds) || kpsIds.length === 0) return

  await client.query(
    `INSERT INTO public.aduan_kps (aduan_id, kps_id, position)
     SELECT $1, selected.kps_id, selected.ord - 1
     FROM unnest($2::text[]) WITH ORDINALITY AS selected(kps_id, ord)`,
    [aduanId, kpsIds]
  )
}

export const AduanRepository = {
  async findAndCountAll(
    params: any[],
    conditions: string[],
    limit: number,
    offset: number,
    sortBy: 'created_at' | 'updated_at' = 'created_at'
  ) {
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderBy = sortBy === 'updated_at' ? 'a.updated_at DESC' : 'a.created_at DESC'

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT
           ${ADUAN_BASE_SELECT},
           u.display_name AS creator_name,
           COALESCE(tl_counts.jumlah_tl, 0) AS jumlah_tl,
           COALESCE(kps_agg.kps_ids, ARRAY[]::text[]) AS kps_ids,
           COALESCE(kps_agg.nama_kps, ARRAY[]::text[]) AS nama_kps,
           COALESCE(kps_agg.jenis_kps, ARRAY[]::text[]) AS jenis_kps,
           COALESCE(kps_agg.type_kps, ARRAY[]::text[]) AS type_kps,
           COALESCE(kps_agg.nomor_sk, ARRAY[]::text[]) AS nomor_sk,
           COALESCE(kps_agg.kps_items, '[]'::jsonb) AS kps_items
         FROM public.aduan a
         LEFT JOIN public.users u ON u.id = a.created_by
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::integer AS jumlah_tl
           FROM public.tindak_lanjut tl
           WHERE tl.aduan_id = a.id
         ) tl_counts ON true
         LEFT JOIN LATERAL (
           SELECT ${KPS_AGGREGATE_SELECT}
           FROM public.aduan_kps ak
           JOIN public.kps k ON k.id = ak.kps_id
           WHERE ak.aduan_id = a.id
         ) kps_agg ON true
         ${where}
         ORDER BY ${orderBy}
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM public.aduan a ${where}`, params),
    ])

    return {
      data: rows.rows,
      total: Number(countResult.rows[0].total)
    }
  },

  async findDistinctProvinces() {
    const result = await pool.query(`SELECT DISTINCT lokasi_prov FROM public.aduan WHERE lokasi_prov IS NOT NULL AND lokasi_prov != '' ORDER BY lokasi_prov ASC`)
    return result.rows.map(r => r.lokasi_prov)
  },

  async findById(id: string) {
    const [aduanResult, tlResult, docsResult] = await Promise.all([
      pool.query(
        `SELECT
           ${ADUAN_BASE_SELECT},
           u.display_name AS creator_name,
           COALESCE(kps_agg.kps_ids, ARRAY[]::text[]) AS kps_ids,
           COALESCE(kps_agg.nama_kps, ARRAY[]::text[]) AS nama_kps,
           COALESCE(kps_agg.jenis_kps, ARRAY[]::text[]) AS jenis_kps,
           COALESCE(kps_agg.type_kps, ARRAY[]::text[]) AS type_kps,
           COALESCE(kps_agg.nomor_sk, ARRAY[]::text[]) AS nomor_sk,
           COALESCE(kps_agg.kps_items, '[]'::jsonb) AS kps_items
         FROM public.aduan a
         LEFT JOIN public.users u ON u.id = a.created_by
         LEFT JOIN LATERAL (
           SELECT ${KPS_AGGREGATE_SELECT}
           FROM public.aduan_kps ak
           JOIN public.kps k ON k.id = ak.kps_id
           WHERE ak.aduan_id = a.id
         ) kps_agg ON true
         WHERE a.id = $1`,
        [id]
      ),
      pool.query('SELECT * FROM public.tindak_lanjut WHERE aduan_id = $1 ORDER BY tanggal DESC', [id]),
      pool.query('SELECT * FROM public.aduan_documents WHERE aduan_id = $1 ORDER BY created_at DESC', [id]),
    ])

    if (aduanResult.rows.length === 0) return null

    return {
      ...aduanResult.rows[0],
      tindak_lanjut: tlResult.rows,
      documents: docsResult.rows,
    }
  },

  async findSimpleById(id: string) {
    const result = await pool.query('SELECT id, nomor_tiket FROM public.aduan WHERE id = $1 LIMIT 1', [id])
    return result.rows.length > 0 ? result.rows[0] : null
  },

  async countByYear(year: number) {
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM public.aduan WHERE EXTRACT(YEAR FROM created_at) = $1',
      [year]
    )
    return Number(countResult.rows[0].count)
  },

  async create(data: any, nomorTiket: string, userId: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const kpsRows = await getOrderedKpsRows(client, data.kps_ids || [])
      const namaKps = kpsRows.map((row: any) => row.nama_kps)
      const jenisKps = kpsRows.map((row: any) => row.jenis_kps)
      const nomorSk = kpsRows.map((row: any) => row.nomor_sk)

      const result = await client.query(
        `INSERT INTO public.aduan (
          nomor_tiket, surat_nomor, surat_tanggal, surat_asal_perihal,
          pengadu_nama, pengadu_telepon, pengadu_email, pengadu_instansi, kategori_masalah, ringkasan_masalah,
          lokasi_prov, lokasi_kab, lokasi_kec, lokasi_desa, lokasi_luas_ha,
          jumlah_kk, lokasi_lat, lokasi_lng, pic_id, pic_name, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        RETURNING *`,
        [
          nomorTiket, data.surat_nomor, data.surat_tanggal, data.surat_asal_perihal,
          data.pengadu_nama, data.pengadu_telepon, data.pengadu_email, data.pengadu_instansi, data.kategori_masalah, data.ringkasan_masalah,
          data.lokasi_prov, data.lokasi_kab, data.lokasi_kec, data.lokasi_desa, data.lokasi_luas_ha,
          data.jumlah_kk, data.lokasi_lat, data.lokasi_lng, data.pic_id, data.pic_name, userId,
        ]
      )

      const created = result.rows[0]
      await replaceAduanKps(client, created.id, data.kps_ids || [])

      await client.query('COMMIT')
      return {
        ...created,
        kps_ids: (data.kps_ids || []).map((id: string) => String(id)),
        nama_kps: namaKps,
        jenis_kps: jenisKps,
        type_kps: kpsRows.map((row: any) => row.kps_type),
        nomor_sk: nomorSk,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async update(id: string, data: any, userId: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const { kps_ids: kpsIds, ...baseData } = data
      const sets: string[] = []
      const params: any[] = []

      for (const [key, value] of Object.entries(baseData)) {
        if (value !== undefined) {
          params.push(value)
          sets.push(`${key} = $${params.length}`)
        }
      }

      params.push(userId)
      sets.push(`updated_by = $${params.length}`)
      params.push(id)

      const result = await client.query(
        `UPDATE public.aduan SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        return null
      }

      let kpsRows: any[] = []
      if (kpsIds !== undefined) {
        kpsRows = await getOrderedKpsRows(client, kpsIds)
        await replaceAduanKps(client, id, kpsIds)
      }

      await client.query('COMMIT')
      return {
        ...result.rows[0],
        ...(kpsIds !== undefined ? {
          kps_ids: (kpsIds || []).map((value: string) => String(value)),
          nama_kps: kpsRows.map((row: any) => row.nama_kps),
          jenis_kps: kpsRows.map((row: any) => row.jenis_kps),
          type_kps: kpsRows.map((row: any) => row.kps_type),
          nomor_sk: kpsRows.map((row: any) => row.nomor_sk),
        } : {}),
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async delete(id: string) {
    const result = await pool.query('DELETE FROM public.aduan WHERE id = $1', [id])
    return result.rowCount !== 0
  },

  async createDocument(aduanId: string, fileUrl: string, fileName: string, fileCategory: string, userId: string) {
    await pool.query(
      `INSERT INTO public.aduan_documents (aduan_id, file_url, file_name, file_category, created_by) VALUES ($1, $2, $3, $4, $5)`,
      [aduanId, fileUrl, fileName, fileCategory, userId]
    )
  },

  async findDocument(docId: string, aduanId: string) {
    const result = await pool.query(
      'SELECT * FROM public.aduan_documents WHERE id = $1 AND aduan_id = $2',
      [docId, aduanId]
    )
    return result.rows.length > 0 ? result.rows[0] : null
  },

  async deleteDocument(docId: string) {
    await pool.query('DELETE FROM public.aduan_documents WHERE id = $1', [docId])
  },

  async getActorName(userId: string, fallbackEmail: string) {
    const result = await pool.query(
      'SELECT display_name FROM public.users WHERE id = $1 LIMIT 1',
      [userId]
    )
    return result.rows[0]?.display_name || fallbackEmail
  },

  async logActivity(type: string, description: string, userId: string, actorName: string, aduanId: string, metadata: any) {
    await pool.query(
      `INSERT INTO public.app_activities (type, description, user_id, user_name, aduan_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [type, description, userId, actorName, aduanId, JSON.stringify(metadata)]
    )
  }
}
