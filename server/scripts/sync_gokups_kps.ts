import 'dotenv/config'
import { pool } from '../src/db.js'

const API_URL = 'https://gokups.hutsos.kehutanan.go.id/api/v1/kps'
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
}
const PAGE_DELAY_MS = 150
const MAX_RETRIES = 6
const START_PAGE = Math.max(1, Number(process.env.GOKUPS_START_PAGE || 1))

type GokupsKpsRow = {
  id: string
  nama_lembaga: string
  surat_keputusan?: string | null
  tanggal?: string | null
  skema?: string | null
  provinsi_id?: string | number | null
  kabupaten_id?: string | number | null
  kecamatan_id?: string | number | null
  desa_id?: string | number | null
  provinsi?: string | null
  kabupaten?: string | null
  kecamatan?: string | null
  desa?: string | null
  luas_hl?: string | number | null
  luas_hp?: string | number | null
  luas_hpt?: string | number | null
  luas_hpk?: string | number | null
  luas_hk?: string | number | null
  luas_apl?: string | number | null
  luas_total?: string | number | null
  anggota_pria?: string | number | null
  anggota_wanita?: string | number | null
}

const toText = (value: unknown) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

const toNumeric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toInteger = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

const toDate = (value: unknown) => {
  const text = toText(value)
  if (!text) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  return text === '0000-00-00' ? null : text
}

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const buildValuesClause = (rows: GokupsKpsRow[]) => {
  const values: unknown[] = []

  const placeholders = rows.map((row, rowIndex) => {
    const start = rowIndex * 24
    values.push(
      String(row.id),
      row.nama_lembaga.trim(),
      toText(row.surat_keputusan),
      toDate(row.tanggal),
      toText(row.skema),
      toText(row.provinsi_id),
      toText(row.kabupaten_id),
      toText(row.kecamatan_id),
      toText(row.desa_id),
      toText(row.provinsi),
      toText(row.kabupaten),
      toText(row.kecamatan),
      toText(row.desa),
      toNumeric(row.luas_hl),
      toNumeric(row.luas_hp),
      toNumeric(row.luas_hpt),
      toNumeric(row.luas_hpk),
      toNumeric(row.luas_hk),
      toNumeric(row.luas_apl),
      toNumeric(row.luas_total),
      toInteger(row.anggota_pria),
      toInteger(row.anggota_wanita),
      JSON.stringify(row),
      new Date().toISOString()
    )

    return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}, $${start + 6}, $${start + 7}, $${start + 8}, $${start + 9}, $${start + 10}, $${start + 11}, $${start + 12}, $${start + 13}, $${start + 14}, $${start + 15}, $${start + 16}, $${start + 17}, $${start + 18}, $${start + 19}, $${start + 20}, $${start + 21}, $${start + 22}, $${start + 23}::jsonb, $${start + 24}::timestamptz)`
  })

  return { placeholders: placeholders.join(',\n'), values }
}

const fetchPage = async (page: number, attempt = 1): Promise<{ data: GokupsKpsRow[]; lastPage: number; total: number }> => {
  try {
    const response = await fetch(`${API_URL}?page=${page}`, { headers: REQUEST_HEADERS })
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfterHeader = Number(response.headers.get('retry-after') || 0)
        const retryDelay = retryAfterHeader > 0 ? retryAfterHeader * 1000 : attempt * 2000
        console.warn(`Retry page ${page} after HTTP ${response.status} (${attempt}/${MAX_RETRIES})`)
        await sleep(retryDelay)
        return fetchPage(page, attempt + 1)
      }
      throw new Error(`GoKUPS API returned HTTP ${response.status} for page ${page}`)
    }

    const json = await response.json() as { data?: GokupsKpsRow[]; last_page?: number; total?: number }
    const data = Array.isArray(json.data) ? json.data : []
    return {
      data,
      lastPage: Number(json.last_page || 1),
      total: Number(json.total || data.length),
    }
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.warn(`Retry page ${page} after fetch error (${attempt}/${MAX_RETRIES})`)
      await sleep(attempt * 2000)
      return fetchPage(page, attempt + 1)
    }
    throw error
  }
}

const upsertRows = async (rows: GokupsKpsRow[]) => {
  if (rows.length === 0) return

  const { placeholders, values } = buildValuesClause(rows)
  await pool.query(
    `INSERT INTO public.kps (
      id,
      nama_lembaga,
      surat_keputusan,
      tanggal,
      skema,
      provinsi_id,
      kabupaten_id,
      kecamatan_id,
      desa_id,
      provinsi,
      kabupaten,
      kecamatan,
      desa,
      luas_hl,
      luas_hp,
      luas_hpt,
      luas_hpk,
      luas_hk,
      luas_apl,
      luas_total,
      anggota_pria,
      anggota_wanita,
      raw_payload,
      synced_at
    )
    VALUES
      ${placeholders}
    ON CONFLICT (id) DO UPDATE SET
      nama_lembaga = EXCLUDED.nama_lembaga,
      surat_keputusan = EXCLUDED.surat_keputusan,
      tanggal = EXCLUDED.tanggal,
      skema = EXCLUDED.skema,
      provinsi_id = EXCLUDED.provinsi_id,
      kabupaten_id = EXCLUDED.kabupaten_id,
      kecamatan_id = EXCLUDED.kecamatan_id,
      desa_id = EXCLUDED.desa_id,
      provinsi = EXCLUDED.provinsi,
      kabupaten = EXCLUDED.kabupaten,
      kecamatan = EXCLUDED.kecamatan,
      desa = EXCLUDED.desa,
      luas_hl = EXCLUDED.luas_hl,
      luas_hp = EXCLUDED.luas_hp,
      luas_hpt = EXCLUDED.luas_hpt,
      luas_hpk = EXCLUDED.luas_hpk,
      luas_hk = EXCLUDED.luas_hk,
      luas_apl = EXCLUDED.luas_apl,
      luas_total = EXCLUDED.luas_total,
      anggota_pria = EXCLUDED.anggota_pria,
      anggota_wanita = EXCLUDED.anggota_wanita,
      raw_payload = EXCLUDED.raw_payload,
      synced_at = EXCLUDED.synced_at`,
    values
  )
}

const main = async () => {
  const metaPage = await fetchPage(1)
  const firstPage = START_PAGE === 1 ? metaPage : await fetchPage(START_PAGE)
  const seenIds = new Set<string>()

  console.log(`GoKUPS total rows: ${metaPage.total}, last_page=${metaPage.lastPage}, start_page=${START_PAGE}`)

  for (const row of firstPage.data) seenIds.add(String(row.id))
  await upsertRows(firstPage.data)
  console.log(`Synced page ${START_PAGE}/${metaPage.lastPage}`)
  await sleep(PAGE_DELAY_MS)

  for (let page = START_PAGE + 1; page <= metaPage.lastPage; page += 1) {
    const current = await fetchPage(page)
    for (const row of current.data) seenIds.add(String(row.id))
    await upsertRows(current.data)
    if (page % 25 === 0 || page === metaPage.lastPage) {
      console.log(`Synced page ${page}/${metaPage.lastPage}`)
    }
    await sleep(PAGE_DELAY_MS)
  }

  if (START_PAGE === 1) {
    await pool.query('DELETE FROM public.kps WHERE NOT (id = ANY($1::text[]))', [[...seenIds]])
  }

  console.log(`Sync finished. Upserted ${seenIds.size} rows from GoKUPS in this run.`)
}

main()
  .catch((error) => {
    console.error('Gagal sinkronisasi GoKUPS:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
