import 'dotenv/config'
import { pool } from '../db.js'

const API_URL = 'https://gokups.hutsos.kehutanan.go.id/api/v1/kups'
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
}
const PAGE_DELAY_MS = 150
const MAX_RETRIES = 6
const START_PAGE = Math.max(1, Number(process.env.GOKUPS_START_PAGE || 1))

type GokupsKupsRow = {
  id: string
  lembaga_id: string
  lintang?: string | number | null
  bujur?: string | number | null
  nama_kups: string
  kelas?: string | null
  potensi?: unknown[] | null
  produk?: unknown[] | null
}

type SyncLogger = {
  info: (message: string) => void
  warn: (message: string) => void
}

export type KupsSyncResult = {
  total: number
  lastPage: number
  startPage: number
  processedRows: number
  uniqueRows: number
  removedStaleRows: boolean
}

export type KupsSyncJobState = {
  isRunning: boolean
  startedAt: string | null
  finishedAt: string | null
  lastError: string | null
  lastResult: KupsSyncResult | null
}

const defaultLogger: SyncLogger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
}

const syncJobState: KupsSyncJobState = {
  isRunning: false,
  startedAt: null,
  finishedAt: null,
  lastError: null,
  lastResult: null,
}

const toText = (value: unknown) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

const toNumeric = (value: unknown) => {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const buildValuesClause = (rows: GokupsKupsRow[]) => {
  const values: unknown[] = []

  const placeholders = rows.map((row, rowIndex) => {
    const start = rowIndex * 10
    values.push(
      String(row.id),
      String(row.lembaga_id),
      row.nama_kups.trim(),
      toText(row.kelas),
      toNumeric(row.lintang),
      toNumeric(row.bujur),
      JSON.stringify(Array.isArray(row.potensi) ? row.potensi : []),
      JSON.stringify(Array.isArray(row.produk) ? row.produk : []),
      JSON.stringify(row),
      new Date().toISOString()
    )

    return `($${start + 1}, $${start + 2}, $${start + 3}, $${start + 4}, $${start + 5}::numeric, $${start + 6}::numeric, $${start + 7}::jsonb, $${start + 8}::jsonb, $${start + 9}::jsonb, $${start + 10}::timestamptz)`
  })

  return { placeholders: placeholders.join(',\n'), values }
}

const fetchPage = async (page: number, attempt = 1): Promise<{ data: GokupsKupsRow[]; lastPage: number; total: number }> => {
  try {
    const response = await fetch(`${API_URL}?page=${page}`, { headers: REQUEST_HEADERS })
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfterHeader = Number(response.headers.get('retry-after') || 0)
        const retryDelay = retryAfterHeader > 0 ? retryAfterHeader * 1000 : attempt * 2000
        defaultLogger.warn(`Retry page ${page} after HTTP ${response.status} (${attempt}/${MAX_RETRIES})`)
        await sleep(retryDelay)
        return fetchPage(page, attempt + 1)
      }
      throw new Error(`GoKUPS API returned HTTP ${response.status} for page ${page}`)
    }

    const json = await response.json() as { data?: GokupsKupsRow[]; last_page?: number; total?: number }
    const data = Array.isArray(json.data) ? json.data : []
    return {
      data,
      lastPage: Number(json.last_page || 1),
      total: Number(json.total || data.length),
    }
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      defaultLogger.warn(`Retry page ${page} after fetch error (${attempt}/${MAX_RETRIES})`)
      await sleep(attempt * 2000)
      return fetchPage(page, attempt + 1)
    }
    throw error
  }
}

const upsertRows = async (rows: GokupsKupsRow[]) => {
  if (rows.length === 0) return

  const { placeholders, values } = buildValuesClause(rows)
  await pool.query(
    `INSERT INTO public.kups (
      id,
      lembaga_id,
      nama_kups,
      kelas,
      lintang,
      bujur,
      potensi,
      produk,
      raw_payload,
      synced_at
    )
    SELECT
      v.id,
      v.lembaga_id,
      v.nama_kups,
      v.kelas,
      v.lintang,
      v.bujur,
      v.potensi,
      v.produk,
      v.raw_payload,
      v.synced_at
    FROM (
      VALUES
        ${placeholders}
    ) AS v(id, lembaga_id, nama_kups, kelas, lintang, bujur, potensi, produk, raw_payload, synced_at)
    JOIN public.kps k ON k.id = v.lembaga_id
    ON CONFLICT (id) DO UPDATE SET
      lembaga_id = EXCLUDED.lembaga_id,
      nama_kups = EXCLUDED.nama_kups,
      kelas = EXCLUDED.kelas,
      lintang = EXCLUDED.lintang,
      bujur = EXCLUDED.bujur,
      potensi = EXCLUDED.potensi,
      produk = EXCLUDED.produk,
      raw_payload = EXCLUDED.raw_payload,
      synced_at = EXCLUDED.synced_at`,
    values
  )
}

export const syncGokupsKups = async (logger: SyncLogger = defaultLogger): Promise<KupsSyncResult> => {
  const metaPage = await fetchPage(1)
  const firstPage = START_PAGE === 1 ? metaPage : await fetchPage(START_PAGE)
  const seenIds = new Set<string>()
  let processedRows = 0

  logger.info(`GoKUPS KUPS total rows: ${metaPage.total}, last_page=${metaPage.lastPage}, start_page=${START_PAGE}`)

  for (const row of firstPage.data) seenIds.add(String(row.id))
  await upsertRows(firstPage.data)
  processedRows += firstPage.data.length
  logger.info(`Synced page ${START_PAGE}/${metaPage.lastPage}`)
  await sleep(PAGE_DELAY_MS)

  for (let page = START_PAGE + 1; page <= metaPage.lastPage; page += 1) {
    const current = await fetchPage(page)
    for (const row of current.data) seenIds.add(String(row.id))
    await upsertRows(current.data)
    processedRows += current.data.length
    if (page % 25 === 0 || page === metaPage.lastPage) {
      logger.info(`Synced page ${page}/${metaPage.lastPage}`)
    }
    await sleep(PAGE_DELAY_MS)
  }

  const removedStaleRows = START_PAGE === 1
  if (removedStaleRows) {
    await pool.query(
      `DELETE FROM public.kups 
       WHERE NOT (id = ANY($1::text[]))
         AND NOT EXISTS (
           SELECT 1 FROM public.aduan_kps ak WHERE ak.kps_id = public.kups.lembaga_id
         )`,
      [[...seenIds]]
    )
  }

  logger.info(`Sync finished. Upserted ${seenIds.size} rows from GoKUPS KUPS in this run.`)

  return {
    total: metaPage.total,
    lastPage: metaPage.lastPage,
    startPage: START_PAGE,
    processedRows,
    uniqueRows: seenIds.size,
    removedStaleRows,
  }
}

export const getKupsSyncJobState = (): KupsSyncJobState => ({
  ...syncJobState,
})

export const startGokupsKupsSyncJob = () => {
  if (syncJobState.isRunning) {
    return { started: false, state: getKupsSyncJobState() }
  }

  syncJobState.isRunning = true
  syncJobState.startedAt = new Date().toISOString()
  syncJobState.finishedAt = null
  syncJobState.lastError = null

  void syncGokupsKups()
    .then((result) => {
      syncJobState.lastResult = result
      syncJobState.lastError = null
      syncJobState.finishedAt = new Date().toISOString()
    })
    .catch((error: unknown) => {
      syncJobState.lastError = error instanceof Error ? error.message : String(error)
      syncJobState.finishedAt = new Date().toISOString()
      console.error('Gagal sinkronisasi GoKUPS KUPS:', error)
    })
    .finally(() => {
      syncJobState.isRunning = false
    })

  return { started: true, state: getKupsSyncJobState() }
}
