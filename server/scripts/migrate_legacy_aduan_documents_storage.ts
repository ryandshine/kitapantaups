import 'dotenv/config'
import { access, mkdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { pool } from '../src/db.js'
import {
  getUploadsRoot,
  resolveStoredUploadPathFromUrl,
} from '../src/lib/upload.js'
import {
  buildFileUrlWithNewName,
  buildMigrationFileName,
} from '../src/lib/upload-migration.js'

type DocumentRow = {
  id: string
  aduan_id: string
  file_name: string
  file_url: string
  file_category: string | null
  document_date: string | null
}

type TindakLanjutRow = {
  id: string
  aduan_id: string
  jenis_tl: string | null
  file_urls: string[] | null
  document_date: string | null
}

type DocumentPlan = {
  id: string
  from: string
  to: string
  fileUrlBefore: string
  fileUrlAfter: string
  fileNameAfter: string
}

type TindakLanjutPlan = {
  id: string
  renames: Array<{
    from: string
    to: string
    fileUrlBefore: string
    fileUrlAfter: string
  }>
  fileUrlsAfter: string[]
}

const args = new Set(process.argv.slice(2))
const applyChanges = args.has('--apply')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null

if (limitArg && (!Number.isFinite(limit) || limit <= 0)) {
  throw new Error('--limit harus berupa angka positif')
}

const getSourceFileInfo = (fileUrl: string) => {
  const sourcePath = resolveStoredUploadPathFromUrl(fileUrl)
  const currentBaseName = path.basename(sourcePath)
  const folderName = path.basename(path.dirname(sourcePath))
  const ext = path.extname(currentBaseName).slice(1).toLowerCase()
  return { sourcePath, currentBaseName, folderName, ext }
}

const buildLegacyFileName = (
  dateValue: string | Date | null,
  category: string,
  stableKey: string,
  ext: string
) => buildMigrationFileName(dateValue, category || 'dokumen', stableKey, ext)

const buildDocumentPlan = (row: DocumentRow): DocumentPlan | null => {
  const { sourcePath, currentBaseName, folderName, ext } = getSourceFileInfo(row.file_url)

  if (!ext) {
    console.warn(`SKIP document:${row.id}: ekstensi tidak ditemukan dari ${currentBaseName}`)
    return null
  }

  const fileNameAfter = buildLegacyFileName(row.document_date, row.file_category || 'dokumen', row.id, ext)
  if (!fileNameAfter) {
    console.warn(`SKIP document:${row.id}: Perlu Perbaikan Tanggal Dokumen`)
    return null
  }
  if (currentBaseName === fileNameAfter) {
    return null
  }

  const fileUrlAfter = buildFileUrlWithNewName(row.file_url, fileNameAfter)

  return {
    id: row.id,
    from: sourcePath,
    to: path.join(getUploadsRoot(), folderName, fileNameAfter),
    fileUrlBefore: row.file_url,
    fileUrlAfter,
    fileNameAfter,
  }
}

const buildTindakLanjutPlan = (row: TindakLanjutRow): TindakLanjutPlan | null => {
  const fileUrls = (row.file_urls || []).filter((url): url is string => Boolean(url))
  if (fileUrls.length === 0) return null

  const renames = fileUrls.flatMap((fileUrl, index) => {
    try {
      const { sourcePath, currentBaseName, folderName, ext } = getSourceFileInfo(fileUrl)

      if (!ext) {
        return []
      }

      const fileNameAfter = buildLegacyFileName(
        row.document_date,
        row.jenis_tl || 'Tindak Lanjut',
        `${row.id}:${index}`,
        ext
      )
      if (!fileNameAfter) {
        console.warn(`SKIP tindak_lanjut:${row.id}[${index}]: Perlu Perbaikan Tanggal Dokumen`)
        return []
      }
      if (currentBaseName === fileNameAfter) {
        return []
      }

      return [{
        from: sourcePath,
        to: path.join(getUploadsRoot(), folderName, fileNameAfter),
        fileUrlBefore: fileUrl,
        fileUrlAfter: buildFileUrlWithNewName(fileUrl, fileNameAfter),
      }]
    } catch (error) {
      console.warn(`SKIP tindak_lanjut:${row.id}[${index}]: ${(error as Error).message}`)
      return []
    }
  })

  if (renames.length === 0) return null

  const fileUrlsAfter = fileUrls.map((fileUrl) => {
    const matched = renames.find((item) => item.fileUrlBefore === fileUrl)
    return matched?.fileUrlAfter || fileUrl
  })

  return {
    id: row.id,
    renames,
    fileUrlsAfter,
  }
}

const run = async () => {
  const documentResult = await pool.query<DocumentRow>(
    `
      SELECT
        d.id,
        d.aduan_id,
        d.file_name,
        d.file_url,
        d.file_category,
        to_char(a.surat_tanggal, 'YYYY-MM-DD') AS document_date
      FROM public.aduan_documents d
      JOIN public.aduan a ON a.id = d.aduan_id
      WHERE d.file_url LIKE '%/uploads/%'
      ORDER BY d.created_at ASC, d.id ASC
      ${limit ? 'LIMIT $1' : ''}
    `,
    limit ? [limit] : []
  )

  const tlResult = await pool.query<TindakLanjutRow>(
    `
      SELECT
        id,
        aduan_id,
        jenis_tl,
        file_urls,
        to_char(tanggal AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS document_date
      FROM public.tindak_lanjut
      WHERE file_urls IS NOT NULL
        AND array_length(file_urls, 1) > 0
      ORDER BY created_at ASC, id ASC
      ${limit ? 'LIMIT $1' : ''}
    `,
    limit ? [limit] : []
  )

  const documentPlans = documentResult.rows.map(buildDocumentPlan).filter((item): item is DocumentPlan => Boolean(item))
  const tindakLanjutPlans = tlResult.rows.map(buildTindakLanjutPlan).filter((item): item is TindakLanjutPlan => Boolean(item))
  const documentFilesNeedingDate = documentResult.rows.filter((row) => !row.document_date).length
  const tindakLanjutFilesNeedingDate = tlResult.rows
    .filter((row) => !row.document_date)
    .reduce((total, row) => total + (row.file_urls || []).filter(Boolean).length, 0)
  const filesNeedingDate = documentFilesNeedingDate + tindakLanjutFilesNeedingDate

  if (documentPlans.length === 0 && tindakLanjutPlans.length === 0) {
    if (filesNeedingDate > 0) {
      console.log(`${filesNeedingDate} file berstatus Perlu Perbaikan Tanggal Dokumen.`)
    }
    console.log('Tidak ada file legacy yang perlu di-rename.')
    return
  }

  const totalFiles = documentPlans.length + tindakLanjutPlans.reduce((sum, item) => sum + item.renames.length, 0)
  console.log(`Ditemukan ${totalFiles} file yang akan di-rename.`)
  console.log(`${filesNeedingDate} file berstatus Perlu Perbaikan Tanggal Dokumen.`)

  for (const item of documentPlans) {
    console.log(`- document:${item.id}`)
    console.log(`  from: ${item.from}`)
    console.log(`  to:   ${item.to}`)
  }

  for (const item of tindakLanjutPlans) {
    for (const renameItem of item.renames) {
      console.log(`- tindak_lanjut:${item.id}`)
      console.log(`  from: ${renameItem.from}`)
      console.log(`  to:   ${renameItem.to}`)
    }
  }

  const allRenames = [
    ...documentPlans.map((item) => ({ from: item.from, to: item.to })),
    ...tindakLanjutPlans.flatMap((item) => item.renames.map(({ from, to }) => ({ from, to }))),
  ]
  const targetCounts = new Map<string, number>()
  for (const item of allRenames) {
    targetCounts.set(item.to, (targetCounts.get(item.to) || 0) + 1)
  }

  let missingSources = 0
  let targetConflicts = 0
  for (const item of allRenames) {
    const sourceExists = await access(item.from).then(() => true).catch(() => false)
    if (!sourceExists) {
      missingSources += 1
      console.warn(`MISSING source: ${item.from}`)
    }

    const targetExists = await access(item.to).then(() => true).catch(() => false)
    const duplicateTarget = (targetCounts.get(item.to) || 0) > 1
    if (targetExists || duplicateTarget) {
      targetConflicts += 1
      console.warn(`CONFLICT target: ${item.to}`)
    }
  }

  console.log(`Preflight: ${missingSources} file sumber hilang, ${targetConflicts} konflik target.`)
  if (missingSources > 0 || targetConflicts > 0) {
    throw new Error('Migrasi diblokir karena preflight belum aman')
  }

  if (!applyChanges) {
    console.log('Dry-run selesai. Jalankan lagi dengan --apply untuk mengeksekusi rename fisik dan update database.')
    return
  }

  for (const item of documentPlans) {
    const fromExists = await access(item.from).then(() => true).catch(() => false)
    if (!fromExists) {
      console.warn(`SKIP document:${item.id}: file sumber tidak ditemukan`)
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
        [item.id, item.fileUrlAfter, item.fileNameAfter]
      )

      await client.query('COMMIT')
      console.log(`OK document:${item.id}`)
    } catch (error) {
      await client.query('ROLLBACK')
      await rename(item.to, item.from).catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  for (const item of tindakLanjutPlans) {
    const sourcesExist = await Promise.all(item.renames.map(async (renameItem) => access(renameItem.from).then(() => true).catch(() => false)))
    if (sourcesExist.some((exists) => !exists)) {
      console.warn(`SKIP tindak_lanjut:${item.id}: ada file sumber yang tidak ditemukan`)
      continue
    }

    const targetsExist = await Promise.all(item.renames.map(async (renameItem) => access(renameItem.to).then(() => true).catch(() => false)))
    if (targetsExist.some((exists) => exists)) {
      throw new Error(`Target sudah ada untuk tindak_lanjut:${item.id}`)
    }

    for (const renameItem of item.renames) {
      await mkdir(path.dirname(renameItem.to), { recursive: true })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const rowResult = await client.query<TindakLanjutRow>(
        'SELECT id, file_urls FROM public.tindak_lanjut WHERE id = $1 FOR UPDATE',
        [item.id]
      )

      const row = rowResult.rows[0]
      if (!row) {
        throw new Error(`Tindak lanjut tidak ditemukan: ${item.id}`)
      }

      const currentUrls = (row.file_urls || []).filter((url): url is string => Boolean(url))
      if (currentUrls.length !== item.fileUrlsAfter.length) {
        throw new Error(`Jumlah lampiran berubah untuk tindak_lanjut:${item.id}`)
      }

      for (const renameItem of item.renames) {
        await rename(renameItem.from, renameItem.to)
      }

      await client.query(
        'UPDATE public.tindak_lanjut SET file_urls = $2 WHERE id = $1',
        [item.id, item.fileUrlsAfter]
      )

      await client.query('COMMIT')
      console.log(`OK tindak_lanjut:${item.id}`)
    } catch (error) {
      await client.query('ROLLBACK')
      for (const renameItem of item.renames.slice().reverse()) {
        await rename(renameItem.to, renameItem.from).catch(() => {})
      }
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
