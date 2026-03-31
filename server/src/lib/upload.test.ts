import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  buildUploadPublicUrl,
  getAllowedUploadExtensions,
  getUploadsRoot,
  isAllowedUploadExtension,
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

test('buildUploadPublicUrl and resolveStoredUploadPathFromUrl round-trip safely', () => {
  const publicUrl = buildUploadPublicUrl('https://api.example.com/', 'ADU26000001', 'dokumen_file.pdf')
  const storedPath = resolveStoredUploadPathFromUrl(publicUrl)

  assert.equal(publicUrl, 'https://api.example.com/uploads/ADU26000001/dokumen_file.pdf')
  assert.equal(storedPath, path.join(getUploadsRoot(), 'ADU26000001', 'dokumen_file.pdf'))
})
