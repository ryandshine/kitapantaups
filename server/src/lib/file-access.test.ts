import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyUploadPath } from './file-access.js'

test('classifyUploadPath identifies profile uploads', () => {
  assert.deepEqual(classifyUploadPath('profiles/user-1/avatar.png'), {
    type: 'profile',
    userId: 'user-1',
  })
})

test('classifyUploadPath identifies aduan uploads by nomor tiket folder', () => {
  assert.deepEqual(classifyUploadPath('ADU26000001/dokumen_file.pdf'), {
    type: 'aduan',
    nomorTiket: 'ADU26000001',
  })
})

test('classifyUploadPath rejects incomplete paths', () => {
  assert.equal(classifyUploadPath('ADU26000001'), null)
})
