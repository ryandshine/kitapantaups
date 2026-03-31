import test from 'node:test'
import assert from 'node:assert/strict'
import { generateAduanTicketNumber } from './aduan-ticket.js'

test('generateAduanTicketNumber uses year suffix and zero-padded sequence', () => {
  assert.equal(generateAduanTicketNumber(2026, 1), 'ADU26000001')
  assert.equal(generateAduanTicketNumber(2026, 321), 'ADU26000321')
})
