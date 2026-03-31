import test from 'node:test'
import assert from 'node:assert/strict'

const canNonAdminChangeAduanStatus = (payload: { status?: string; alasan_penolakan?: string }, role: string) => {
  if ((payload.status !== undefined || payload.alasan_penolakan !== undefined) && role !== 'admin') {
    return false
  }

  return true
}

test('non-admin cannot change aduan status', () => {
  assert.equal(canNonAdminChangeAduanStatus({ status: 'proses' }, 'staf'), false)
  assert.equal(canNonAdminChangeAduanStatus({ alasan_penolakan: 'Tidak lengkap' }, 'staf'), false)
})

test('admin can change aduan status', () => {
  assert.equal(canNonAdminChangeAduanStatus({ status: 'selesai' }, 'admin'), true)
})

test('non-admin can still edit non-status fields', () => {
  assert.equal(canNonAdminChangeAduanStatus({}, 'staf'), true)
})
