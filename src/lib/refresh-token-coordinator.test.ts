import assert from 'node:assert/strict'
import test from 'node:test'
import { createRefreshTokenCoordinator } from './refresh-token-coordinator'

test('shares one in-flight refresh across concurrent callers', async () => {
  let calls = 0
  const coordinator = createRefreshTokenCoordinator(async () => {
    calls += 1
    await new Promise((resolve) => setTimeout(resolve, 5))
    return 'next-access-token'
  })

  const [first, second, third] = await Promise.all([
    coordinator.refresh(),
    coordinator.refresh(),
    coordinator.refresh(),
  ])

  assert.equal(calls, 1)
  assert.equal(first, 'next-access-token')
  assert.equal(second, 'next-access-token')
  assert.equal(third, 'next-access-token')
})

test('allows a new refresh after the previous one settles', async () => {
  let calls = 0
  const coordinator = createRefreshTokenCoordinator(async () => {
    calls += 1
    return `token-${calls}`
  })

  assert.equal(await coordinator.refresh(), 'token-1')
  assert.equal(await coordinator.refresh(), 'token-2')
  assert.equal(calls, 2)
})
