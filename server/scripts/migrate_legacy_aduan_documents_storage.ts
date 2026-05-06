import 'dotenv/config'
import { access, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { pool } from '../src/db.js'
import {
  buildStoredUploadFileName,
  getUploadsRoot,
  normalizeUploadLabel,
  resolveStoredUploadPathFromUrl,
} from '../src/lib/upload.js'
import {
  buildFileUrlWithNewName,
  deriveStableUploadCode,
  isModernUploadFileName,
} from '../src/lib/upload-migration.js'

type DocumentRow = {
  id: string
  aduan_id: string
  file_name: string
  file_url: string
  file_category: string | null
  created_at: string | Date | null
}

const args = new Set(process.argv.slice(2))
const applyChanges = args.has('--apply')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null

if (limitArg && (!Number.isFinite(limit) || limit <= 0)) {
  throw new Error('--limit harus berupa angka positif')
}

const getDateForFile = (value: string | Date | null) => {
  const date = value ? new Date(value) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const run = async () => {
  const result = await pool.query<DocumentRow>(
    `
      SELECT id, aduan_id, file_name, file_url, file_category, created_at
      FROM public.aduan_documents
      WHERE file_url LIKE '%/uploads/%'
      ORDER BY created_at ASC, id ASC
      ${limit ? 'LIMIT $1' : ''}
    `,
    limit ? [limit] : []
  )

  const rows = result.rows
  const uploadRoot = getUploadsRoot()
  const plan: Array<{
    id: string
    from: string
    to: string
    fileUrlBefore: string
    fileUrlAfter: string
  }> = []

  for (const row of rows) {
    const sourcePath = resolveStoredUploadPathFromUrl(row.file_url)
    const currentBaseName = path.basename(sourcePath)
    const folderName = path.basename(path.dirname(sourcePath))
    const ext = path.extname(currentBaseName).slice(1).toLowerCase()

    if (!ext) {
      console.warn(`SKIP ${row.id}: ekstensi tidak ditemukan dari ${currentBaseName}`)
      continue
    }

    if (isModernUploadFileName(currentBaseName)) {
      continue
    }

    const normalizedCategory = normalizeUploadLabel(row.file_category || 'dokumen')
    const newFileName = buildStoredUploadFileName(
      normalizedCategory,
      ext,
      getDateForFile(row.created_at),
      deriveStableUploadCode(row.id)
    )
    const targetPath = path.join(uploadRoot, folderName, newFileName)

    if (currentBaseName === newFileName) {
      continue
    }

    plan.push({
      id: row.id,
      from: sourcePath,
      to: targetPath,
      fileUrlBefore: row.file_url,
      fileUrlAfter: buildFileUrlWithNewName(row.file_url, newFileName),
    })
  }

  if (plan.length === 0) {
    console.log('Tidak ada file legacy yang perlu di-rename.')
    return
  }

  console.log(`Ditemukan ${plan.length} file yang akan di-rename.`)
  for (const item of plan) {
    console.log(`- ${item.id}`)
    console.log(`  from: ${item.from}`)
    console.log(`  to:   ${item.to}`)
  }

  if (!applyChanges) {
    console.log('Dry-run selesai. Jalankan lagi dengan --apply untuk mengeksekusi rename fisik dan update database.')
    return
  }

  for (const item of plan) {
    const fromExists = await access(item.from).then(() => true).catch(() => false)
    if (!fromExists) {
      console.warn(`SKIP ${item.id}: file sumber tidak ditemukan`)
      continue
    }

    const toExists = await access(item.to).then(() => true).catch(() => false)
    if (toExists) {
      throw new Error(`Target sudah ada: ${item.to}`)
    }

    await mkdir(path.dirname(item.to), { recursive: true })

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const rowResult = await client.query<DocumentRow>(
        'SELECT id, file_url, file_name FROM public.aduan_documents WHERE id = $1 FOR UPDATE',
        [item.id]
      )

      const row = rowResult.rows[0]
      if (!row) {
        throw new Error(`Dokumen tidak ditemukan: ${item.id}`)
      }

      if (row.file_url === item.fileUrlAfter) {
        await client.query('COMMIT')
        continue
      }

      await rename(item.from, item.to)

      await client.query(
        'UPDATE public.aduan_documents SET file_url = $2, file_name = $3 WHERE id = $1',
        [item.id, item.fileUrlAfter, path.basename(item.to)]
      )

      await client.query('COMMIT')
      console.log(`OK ${item.id}`)
    } catch (error) {
      await client.query('ROLLBACK')
      await rename(item.to, item.from).catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  console.log('Migrasi fisik selesai.')
}

run()
  .catch((error) => {
    console.error('Migrasi fisik gagal:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
