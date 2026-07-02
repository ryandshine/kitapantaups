import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { StorageService } from '../services/storage.service.js'
import { buildUploadPublicUrl, getUploadsRoot } from './upload.js'

const exists = (filePath: string) => access(filePath).then(() => true).catch(() => false)

test('renameDocumentFiles persists a database-date name and keeps the generated code', async () => {
  const folder = `TEST${process.pid}A`
  const uploadDir = path.join(getUploadsRoot(), folder)
  const sourceName = '20260702_TLNotaDinas_K4P9QX.pdf'
  const targetName = '20260529_BeritaAcara_K4P9QX.pdf'
  const sourcePath = path.join(uploadDir, sourceName)
  const targetPath = path.join(uploadDir, targetName)
  const sourceUrl = buildUploadPublicUrl('https://api.example.com', folder, sourceName)
  let persistedUrls: string[] = []

  await mkdir(uploadDir, { recursive: true })
  await writeFile(sourcePath, 'unchanged-content')

  try {
    const urls = await StorageService.renameDocumentFiles(
      [sourceUrl],
      'Berita Acara',
      '2026-05-29',
      async (nextUrls) => {
        persistedUrls = nextUrls
      }
    )

    assert.deepEqual(urls, persistedUrls)
    assert.equal(path.basename(new URL(urls[0]).pathname), targetName)
    assert.equal(await exists(sourcePath), false)
    assert.equal(await exists(targetPath), true)
  } finally {
    await rm(uploadDir, { recursive: true, force: true })
  }
})

test('renameDocumentFiles restores the source when URL persistence fails', async () => {
  const folder = `TEST${process.pid}B`
  const uploadDir = path.join(getUploadsRoot(), folder)
  const sourceName = '20260702_Dokumen_A7K29Q.pdf'
  const sourcePath = path.join(uploadDir, sourceName)
  const targetPath = path.join(uploadDir, '20260529_SuratMasuk_A7K29Q.pdf')
  const sourceUrl = buildUploadPublicUrl('https://api.example.com', folder, sourceName)

  await mkdir(uploadDir, { recursive: true })
  await writeFile(sourcePath, 'unchanged-content')

  try {
    await assert.rejects(
      StorageService.renameDocumentFiles(
        [sourceUrl],
        'Surat Masuk',
        '2026-05-29',
        async () => {
          throw new Error('database update failed')
        }
      ),
      /database update failed/
    )

    assert.equal(await exists(sourcePath), true)
    assert.equal(await exists(targetPath), false)
  } finally {
    await rm(uploadDir, { recursive: true, force: true })
  }
})
