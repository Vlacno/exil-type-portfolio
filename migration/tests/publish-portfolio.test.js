import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { buildPlan, ROOT, TARGET } from '../scripts/plan-local.js'
import { resolveAssets } from '../scripts/apply-local.js'
import { PUBLISH_SCOPE } from '../scripts/publish-scope.js'
import { CONFIRMATION, parsePublishArguments, authorizePublish, inspectPublication, publishReviewed, offlineReport } from '../scripts/publish-portfolio.js'

const { plan } = await buildPlan()
const assetMap = new Map(plan.assets.map((asset) => [asset.key, `image-${asset.sha1}-${asset.width}x${asset.height}-${asset.mimeType === 'image/png' ? 'png' : 'jpg'}`]))
const env = { SANITY_IMPORT_TOKEN: 'synthetic-unit-test-token' }
const approved = (inspection) => ({ dryRun: false, offline: false, confirm: CONFIRMATION, planHash: inspection.report.planHash })

function memoryClient() {
  const docs = new Map(plan.documents.map((doc) => [doc._id, { ...resolveAssets(doc, assetMap), _rev: `initial-${doc._id}`, _createdAt: '2026-01-01T00:00:00Z' }]))
  for (const id of assetMap.values()) docs.set(id, { _id: id, _type: 'sanity.imageAsset' })
  docs.set('foreign-portfolio-document', { _id: 'foreign-portfolio-document', _type: 'publication', title: 'Must stay unchanged' })
  const state = { docs, commits: 0, transactions: 0, beforeCommit: null }
  return Object.assign(state, {
    config: () => ({ ...TARGET, apiHost: 'https://api.sanity.io', useCdn: false, withCredentials: false }),
    async fetch(query, { ids, types, slugs }, options) {
      if (types) return [...docs.values()].filter((doc) => types.includes(doc._type) && slugs.includes(doc.slug?.current) && !doc._id.startsWith('versions.') && (options.perspective !== 'published' || !doc._id.startsWith('drafts.'))).map((doc) => structuredClone(doc))
      return ids.flatMap((id) => docs.has(id) && (!query.includes('sanity.imageAsset') || docs.get(id)._type === 'sanity.imageAsset') ? [structuredClone(docs.get(id))] : [])
    },
    transaction() {
      state.transactions++
      const operations = []
      return {
        patch(id, callback) {
          const operation = { kind: 'patch', id }
          callback({ ifRevisionId(revision) { operation.revision = revision; return this }, set(value) { operation.set = value; return this } })
          operations.push(operation)
          return this
        },
        create(doc) { operations.push({ kind: 'create', doc }); return this },
        delete(id) { operations.push({ kind: 'delete', id }); return this },
        async commit() {
          state.commits++
          if (state.beforeCommit) { const hook = state.beforeCommit; state.beforeCommit = null; hook() }
          const next = structuredClone(docs)
          for (const operation of operations) {
            if (operation.kind === 'patch') {
              if (next.get(operation.id)?._rev !== operation.revision) throw Object.assign(new Error('Revision conflict'), { statusCode: 409 })
              next.set(operation.id, { ...next.get(operation.id), ...operation.set })
            } else if (operation.kind === 'create') {
              if (next.has(operation.doc._id)) throw Object.assign(new Error('Already exists'), { statusCode: 409 })
              next.set(operation.doc._id, { ...structuredClone(operation.doc), _rev: 'published-revision' })
            } else next.delete(operation.id)
          }
          docs.clear()
          for (const [id, doc] of next) docs.set(id, doc)
          return { transactionId: `test-transaction-${state.commits}` }
        },
      }
    },
  })
}

test('fixed scope matches exactly the 29 imported IDs and cannot select other documents', () => {
  assert.deepEqual(PUBLISH_SCOPE.map((entry) => entry.draftId), plan.documents.map((doc) => doc._id))
  assert.equal(PUBLISH_SCOPE.length, 29)
  assert.ok(Object.isFrozen(PUBLISH_SCOPE))
  assert.equal(offlineReport().counts.unverified, 29)
  assert.equal(offlineReport().planHash, null)
  assert.throws(() => parsePublishArguments(['--ids', '*']), /Unknown/)
})

test('write mode requires exact explicit confirmation, connected plan hash and environment token', () => {
  assert.equal(parsePublishArguments([]).dryRun, true)
  for (const flags of [['--publish', '--dry-run'], ['--publish', '--offline']]) assert.throws(() => parsePublishArguments(flags))
  const options = { dryRun: false, confirm: CONFIRMATION, planHash: 'a'.repeat(64) }
  for (const key of ['confirm', 'planHash']) assert.throws(() => authorizePublish({ ...options, [key]: undefined }, env))
  assert.throws(() => authorizePublish(options, {}), /SANITY_IMPORT_TOKEN/)
  assert.doesNotThrow(() => authorizePublish(options, env))
})

test('connected dry-run is read-only and marks an existing published version for skipping', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  client.docs.set(entry.publishedId, { _id: entry.publishedId, _type: entry.type, _rev: 'existing', title: 'Existing version' })
  const before = structuredClone(client.docs)
  const inspection = await inspectPublication(client)
  assert.equal(inspection.report.counts.ready, 28)
  assert.equal(inspection.report.counts['skipped-published'], 1)
  assert.equal(client.transactions, 0)
  assert.deepEqual(client.docs, before)
  assert.ok(!JSON.stringify(inspection.report).includes(env.SANITY_IMPORT_TOKEN))
})

test('simulated publishing preserves existing published + draft versions, assets and foreign records; rerun skips all', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  const existing = { _id: entry.publishedId, _type: entry.type, _rev: 'existing', title: 'Keep this version' }
  client.docs.set(entry.publishedId, existing)
  const originalDraft = structuredClone(client.docs.get(entry.draftId))
  const nonPortfolio = new Map([...client.docs].filter(([id]) => id.startsWith('image-') || id === 'foreign-portfolio-document'))
  const inspection = await inspectPublication(client), progress = []
  const result = await publishReviewed(client, inspection, approved(inspection), env, async (report) => progress.push(structuredClone(report)))
  assert.equal(result.counts.published, 28)
  assert.equal(result.counts['skipped-published'], 1)
  assert.equal(progress.length, 28)
  assert.deepEqual(client.docs.get(entry.publishedId), existing)
  assert.deepEqual(client.docs.get(entry.draftId), originalDraft)
  for (const [id, doc] of nonPortfolio) assert.deepEqual(client.docs.get(id), doc)
  for (const row of result.documents.filter((doc) => doc.status === 'published')) {
    assert.ok(!client.docs.has(row.draftId))
    assert.equal(client.docs.get(row.publishedId)._type, row.type)
  }
  const repeat = await inspectPublication(client)
  assert.equal(repeat.report.counts['skipped-published'], 29)
  const rerun = await publishReviewed(client, repeat, approved(repeat), env)
  assert.equal(rerun.counts.published, 0)
  assert.equal(client.commits, 28)
})

test('concurrent publication is never overwritten and its draft is not deleted', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  const inspection = await inspectPublication(client)
  const draft = structuredClone(client.docs.get(entry.draftId))
  const concurrent = { _id: entry.publishedId, _type: entry.type, _rev: 'concurrent', title: 'Published by someone else' }
  client.beforeCommit = () => client.docs.set(entry.publishedId, concurrent)
  const report = await publishReviewed(client, inspection, approved(inspection), env)
  assert.equal(report.counts.error, 1)
  assert.equal(report.counts.published, 28)
  assert.deepEqual(client.docs.get(entry.draftId), draft)
  assert.deepEqual(client.docs.get(entry.publishedId), concurrent)
})

test('revision guard prevents publishing or deleting a concurrently edited draft', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  const inspection = await inspectPublication(client)
  client.beforeCommit = () => { client.docs.get(entry.draftId)._rev = 'edited-after-preflight'; client.docs.get(entry.draftId).title = 'Keep latest draft' }
  const report = await publishReviewed(client, inspection, approved(inspection), env)
  assert.equal(report.counts.error, 1)
  assert.ok(!client.docs.has(entry.publishedId))
  assert.equal(client.docs.get(entry.draftId).title, 'Keep latest draft')
})

test('missing, invalid and broken-reference drafts block the batch before transactions', async () => {
  for (const damage of [
    (client) => client.docs.delete(PUBLISH_SCOPE[0].draftId),
    (client) => { client.docs.get(PUBLISH_SCOPE[0].draftId).slug.current = 'not-portfolio' },
    (client) => { client.docs.get(PUBLISH_SCOPE[0].draftId).font = 'commercial-font' },
    (client) => client.docs.delete([...assetMap.values()][0]),
  ]) {
    const client = memoryClient()
    damage(client)
    const inspection = await inspectPublication(client)
    await assert.rejects(publishReviewed(client, inspection, approved(inspection), env), /Preflight contains errors/)
    assert.equal(client.transactions, 0)
  }
})

test('changed reviewed plan and wrong destination block all writes', async () => {
  const client = memoryClient(), inspection = await inspectPublication(client)
  client.docs.get(PUBLISH_SCOPE[0].draftId)._rev = 'new-revision'
  await assert.rejects(publishReviewed(client, inspection, approved(inspection), env), /plan changed/)
  assert.equal(client.transactions, 0)
  client.config = () => ({ ...TARGET, projectId: 'unapproved' })
  await assert.rejects(inspectPublication(client), /Import target/)
})

test('a published same-type/same-slug document under another ID is skipped and never adopted for writes', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  client.docs.delete(entry.draftId)
  const manual = { _id: 'manual-research-uuid', _type: entry.type, _rev: 'manual-published', slug: { current: entry.slug }, title: 'Existing manually published article' }
  client.docs.set(manual._id, manual)
  const inspection = await inspectPublication(client)
  assert.equal(inspection.report.documents[0].status, 'skipped-published')
  assert.equal(inspection.report.documents[0].resolvedPublishedId, manual._id)
  const report = await publishReviewed(client, inspection, approved(inspection), env)
  assert.equal(report.counts.published, 28)
  assert.deepEqual(client.docs.get(manual._id), manual)
  assert.ok(!client.docs.has(entry.publishedId))
  assert.ok(!client.docs.has(entry.draftId))
})

test('alternate drafts and multiple published matches are blocking identities, not new write targets', async () => {
  for (const variant of ['draft', 'duplicate-published']) {
    const client = memoryClient(), entry = PUBLISH_SCOPE[0]
    client.docs.delete(entry.draftId)
    const sameSlug = { _type: entry.type, _rev: 'manual', slug: { current: entry.slug } }
    if (variant === 'draft') client.docs.set('drafts.manual', { ...sameSlug, _id: 'drafts.manual' })
    else for (const id of ['manual-one', 'manual-two']) client.docs.set(id, { ...sameSlug, _id: id })
    const inspection = await inspectPublication(client)
    assert.equal(inspection.report.documents[0].status, variant === 'draft' ? 'alternate-draft' : 'conflicting-identity')
    await assert.rejects(publishReviewed(client, inspection, approved(inspection), env), (error) => error.code === 'PREFLIGHT_BLOCKED' && error.details[0].draftId === entry.draftId)
    assert.equal(client.transactions, 0)
  }
})

test('connected public-only check verifies published records but cannot infer missing drafts or authorize publication', async () => {
  const client = memoryClient(), entry = PUBLISH_SCOPE[0]
  client.docs.set('manual-publication', { _id: 'manual-publication', _type: entry.type, slug: { current: entry.slug }, _rev: 'published' })
  const inspection = await inspectPublication(client, { publicOnly: true })
  assert.equal(inspection.report.verification, 'connected-public-only')
  assert.equal(inspection.report.counts['skipped-published'], 1)
  assert.equal(inspection.report.counts.unverified, 28)
  assert.equal(inspection.report.counts['missing-draft'], 0)
  assert.equal(inspection.report.planHash, null)
  assert.throws(() => parsePublishArguments(['--publish', '--public-only']))
  assert.doesNotThrow(() => authorizePublish({ dryRun: true, publicOnly: true }, {}))
  await assert.rejects(publishReviewed(client, inspection, { ...approved(inspection), publicOnly: true }, env), /authenticated write mode/)
  assert.equal(client.transactions, 0)
})

test('missing token creates a structured authorization error and preserves the previous report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exil-publish-auth-test-'))
  try {
    await writeFile(join(directory, 'report.json'), '{"previous":true}\n')
    const result = spawnSync(process.execPath, [resolve(ROOT, 'migration/scripts/publish-portfolio.js'), '--dry-run', '--out', directory], {
      cwd: ROOT, encoding: 'utf8', timeout: 30_000, env: { ...process.env, SANITY_IMPORT_TOKEN: '' },
    })
    assert.equal(result.status, 1)
    const report = JSON.parse(await readFile(join(directory, 'error.json'), 'utf8'))
    assert.equal(report.code, 'MISSING_TOKEN')
    assert.equal(report.stage, 'authorization')
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'report.json'), 'utf8')), { previous: true })
  } finally {
    const inside = relative(resolve(tmpdir()), resolve(directory))
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside))
    await rm(directory, { recursive: true, force: true })
  }
})

test('offline dry-run CLI works with network disabled, reports unknown CMS state and prints no token', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exil-publish-test-'))
  try {
    const guard = join(directory, 'no-network.mjs')
    await writeFile(guard, `import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import {syncBuiltinESMExports} from 'node:module';
const deny = () => { throw new Error('NETWORK DISABLED') }; globalThis.fetch = deny; http.request = deny; https.request = deny; net.Socket.prototype.connect = deny; syncBuiltinESMExports();`)
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(guard).href, resolve(ROOT, 'migration/scripts/publish-portfolio.js'), '--dry-run', '--offline', '--out', join(directory, 'report')], {
      cwd: ROOT, encoding: 'utf8', timeout: 30_000, env: { ...process.env, ...env },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(!`${result.stdout}${result.stderr}`.includes(env.SANITY_IMPORT_TOKEN))
    const report = JSON.parse(await readFile(join(directory, 'report/report.json'), 'utf8'))
    assert.equal(report.counts.unverified, 29)
    assert.equal(report.counts.published, 0)
    assert.equal(report.planHash, null)
    assert.equal(report.verification, 'offline-unverified')
  } finally {
    const inside = relative(resolve(tmpdir()), resolve(directory))
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside))
    await rm(directory, { recursive: true, force: true })
  }
})
