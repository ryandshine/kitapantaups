import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  buildStoredUploadFileName,
  buildUploadPublicUrl,
  formatUploadDateStamp,
  getAllowedUploadExtensions,
  getUploadCodeFromFileName,
  getUploadsRoot,
  isAllowedUploadExtension,
  normalizeDocumentTypeLabel,
  resolveStoredUploadPathFromUrl,
  sanitizePathSegment,
} from './upload.js'

test('sanitizePathSegment removes unsafe characters', () => {
  assert.equal(sanitizePathSegment('../ADU-26_001?'), 'ADU-26_001')
})

test('upload extension allowlist covers common document uploads', () => {
  assert.equal(isAllowedUploadExtension('pdf'), true)
  assert.equal(isAllowedUploadExtension('exe'), false)
  assert.ok(getAllowedUploadExtensions().includes('docx'))
})

test('normalizeDocumentTypeLabel converts names to archive-safe PascalCase', () => {
  assert.equal(normalizeDocumentTypeLabel('Surat Masuk'), 'SuratMasuk')
  assert.equal(normalizeDocumentTypeLabel('TL BA Rapat Pembahasan'), 'TLBARapatPembahasan')
  assert.equal(normalizeDocumentTypeLabel('  data-pendukung  '), 'DataPendukung')
  assert.equal(normalizeDocumentTypeLabel('!!!'), 'Dokumen')
})

test('formatUploadDateStamp uses the supplied document calendar date', () => {
  assert.equal(formatUploadDateStamp('2026-05-29'), '20260529')
  assert.equal(formatUploadDateStamp(new Date('2026-05-05T17:30:00.000Z')), '20260506')
})

test('formatUploadDateStamp rejects a missing or invalid document date', () => {
  assert.throws(() => formatUploadDateStamp(null), /tanggal dokumen/i)
  assert.throws(() => formatUploadDateStamp('not-a-date'), /tanggal dokumen/i)
})

test('buildStoredUploadFileName follows the expected pattern', () => {
  const fileName = buildStoredUploadFileName('Surat Masuk', 'PDF', '2026-05-29', 'K4P9QX')
  assert.equal(fileName, '20260529_SuratMasuk_K4P9QX.pdf')
})

test('getUploadCodeFromFileName preserves an existing generated code', () => {
  assert.equal(getUploadCodeFromFileName('20260529_surat_masuk_K4P9QX.pdf'), 'K4P9QX')
  assert.equal(getUploadCodeFromFileName('legacy-file.pdf'), null)
})

test('buildUploadPublicUrl and resolveStoredUploadPathFromUrl round-trip safely', () => {
  const publicUrl = buildUploadPublicUrl('https://api.example.com/', 'ADU26000001', 'dokumen_file.pdf')
  const storedPath = resolveStoredUploadPathFromUrl(publicUrl)

  assert.equal(publicUrl, 'https://api.example.com/uploads/ADU26000001/dokumen_file.pdf')
  assert.equal(storedPath, path.join(getUploadsRoot(), 'ADU26000001', 'dokumen_file.pdf'))
})
