import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  buildStoredUploadFileName,
  buildUploadPublicUrl,
  formatUploadDateStamp,
  getAllowedUploadExtensions,
  getUploadsRoot,
  isAllowedUploadExtension,
  resolveStoredUploadPathFromUrl,
  normalizeUploadLabel,
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

test('normalizeUploadLabel converts names to snake_case', () => {
  assert.equal(normalizeUploadLabel('Surat Masuk'), 'surat_masuk')
  assert.equal(normalizeUploadLabel('  Data-Pendukung  '), 'data_pendukung')
  assert.equal(normalizeUploadLabel('!!!'), 'dokumen')
})

test('formatUploadDateStamp uses Jakarta date by default', () => {
  const stamp = formatUploadDateStamp(new Date('2026-05-05T17:30:00.000Z'))
  assert.equal(stamp, '20260506')
})

test('buildStoredUploadFileName follows the expected pattern', () => {
  const fileName = buildStoredUploadFileName('Surat Masuk', 'PDF', new Date('2026-05-05T17:30:00.000Z'), 'K4P9QX')
  assert.equal(fileName, '20260506_surat_masuk_K4P9QX.pdf')
})

test('buildUploadPublicUrl and resolveStoredUploadPathFromUrl round-trip safely', () => {
  const publicUrl = buildUploadPublicUrl('https://api.example.com/', 'ADU26000001', 'dokumen_file.pdf')
  const storedPath = resolveStoredUploadPathFromUrl(publicUrl)

  assert.equal(publicUrl, 'https://api.example.com/uploads/ADU26000001/dokumen_file.pdf')
  assert.equal(storedPath, path.join(getUploadsRoot(), 'ADU26000001', 'dokumen_file.pdf'))
})
