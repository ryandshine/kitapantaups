import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFileUrlWithNewName,
  deriveStableUploadCode,
  isModernUploadFileName,
} from './upload-migration.js'

test('deriveStableUploadCode is deterministic and uppercase', () => {
  assert.equal(deriveStableUploadCode('11111111-2222-3333-4444-555555555555').length, 6)
  assert.equal(deriveStableUploadCode('11111111-2222-3333-4444-555555555555'), deriveStableUploadCode('11111111-2222-3333-4444-555555555555'))
  assert.match(deriveStableUploadCode('11111111-2222-3333-4444-555555555555'), /^[A-Z0-9]{6}$/)
})

test('buildFileUrlWithNewName keeps origin and folder while replacing basename', () => {
  const url = buildFileUrlWithNewName(
    'https://api.example.com/uploads/ADU26000001/dokumen_oldname.pdf',
    '20260506_dokumen_K4P9QX.pdf'
  )

  assert.equal(url, 'https://api.example.com/uploads/ADU26000001/20260506_dokumen_K4P9QX.pdf')
})

test('isModernUploadFileName detects the new upload pattern', () => {
  assert.equal(isModernUploadFileName('20260506_dokumen_K4P9QX.pdf'), true)
  assert.equal(isModernUploadFileName('dokumen_oldname.pdf'), false)
})
