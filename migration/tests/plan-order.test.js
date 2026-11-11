import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { resolve } from 'node:path'
import { buildPlan, ROOT } from '../scripts/plan-local.js'

const baseline = await buildPlan()
const images = baseline.snapshot.researchTemplate.body.filter((block) => block.kind === 'image').map((block) => block.path)
const imagePaths = images.map((file) => resolve(ROOT, file))
const readFile = fs.readFile.bind(fs)

async function buildWithReadOrder(context, order, sharedBytes) {
  const waiting = new Map()
  const completed = []
  const replacement = context.mock.method(fs, 'readFile', async (file, ...options) => {
    const bytes = await readFile(file, ...options)
    const name = typeof file === 'string' ? resolve(file) : null
    if (!imagePaths.includes(name)) return bytes
    // Release both real reads in a chosen order, without timer-based races.
    await new Promise((done) => {
      waiting.set(name, done)
      if (waiting.size === order.length) queueMicrotask(() => { for (const next of order) waiting.get(next)() })
    })
    completed.push(name)
    return sharedBytes || bytes
  })
  syncBuiltinESMExports()
  try {
    const result = await buildPlan()
    assert.deepEqual(completed, order)
    return result
  } finally {
    replacement.mock.restore()
    syncBuiltinESMExports()
  }
}

test('complete import plan and approval hash are independent of image-read completion order', { timeout: 10_000 }, async (context) => {
  assert.equal(imagePaths.length, 2)
  const first = await buildWithReadOrder(context, imagePaths)
  const reversed = await buildWithReadOrder(context, [...imagePaths].reverse())
  assert.deepEqual(reversed, first)
  assert.deepEqual(first.plan, baseline.plan)
  assert.deepEqual(first.plan.assets.map((asset) => asset.key), first.plan.assets.map((asset) => asset.key).sort())
})

test('deduplicated image paths have canonical ordering regardless of read completion', { timeout: 10_000 }, async (context) => {
  const sharedBytes = await readFile(imagePaths[0])
  const first = await buildWithReadOrder(context, imagePaths, sharedBytes)
  const reversed = await buildWithReadOrder(context, [...imagePaths].reverse(), sharedBytes)
  assert.deepEqual(reversed, first)
  const shared = first.plan.assets.find((asset) => asset.paths.length === 2)
  assert.ok(shared)
  assert.deepEqual(shared.paths, [...images].sort())
  assert.equal(first.plan.assets.length, baseline.plan.assets.length - 1)
})
