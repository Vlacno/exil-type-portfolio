import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { createClient } from '@sanity/client'
import { TARGET, REVIEW_HASH, CONFIRMATION, loadLinkPlan, validateLinkPlan, parseLinkArguments, authorizeLinkApply, inspectLinks, applyReviewedLinks } from '../scripts/apply-research-links.js'

const plan = await loadLinkPlan()
const env = { SANITY_IMPORT_TOKEN: 'synthetic-new-project-test-token' }
const approved = (report) => ({ dryRun: false, apply: true, confirm: CONFIRMATION, planHash: report.planHash })
const getField = (doc, change) => doc.sources.find((source) => source._key === change.sourceKey)[change.field]

function memoryClient() {
  const docs = new Map(plan.documents.map((expected) => {
    const sources = new Map()
    for (const change of expected.changes) {
      if (!sources.has(change.sourceKey)) sources.set(change.sourceKey, { _key: change.sourceKey, customSourceNote: 'Do not touch' })
      sources.get(change.sourceKey)[change.field] = change.before
    }
    return [expected.id, { _id: expected.id, _type: 'researchArticle', _rev: expected.ifRevisionID, slug: { current: expected.slug }, title: 'Editor title', body: ['Editor body'], editorField: 'Preserve', sources: [...sources.values(), { _key: 'untouched-source', citation: 'Preserve this citation', url: 'https://example.org/preserve' }] }]
  }))
  docs.set('foreign-document', { _id: 'foreign-document', _type: 'researchArticle', title: 'Outside scope' })
  docs.set(`drafts.${plan.documents[0].id}`, { _id: `drafts.${plan.documents[0].id}`, _type: 'researchArticle', title: 'Separate editor draft' })
  const sdk = createClient({ ...TARGET, apiVersion: '2025-02-19', useCdn: false, withCredentials: false })
  const state = { docs, fetches: 0, transactions: 0, commits: 0, operations: [], beforeCommit: null, loseResponse: false, failReadBack: false }
  return Object.assign(state, {
    config: () => sdk.config(),
    async fetch(query, { ids }, options) {
      state.fetches++
      if (state.failReadBack && state.commits) throw new Error('Simulated read-back failure')
      assert.equal(options.perspective, 'published')
      assert.deepEqual(ids, plan.documents.map((doc) => doc.id))
      assert.match(query, /_id in \$ids/)
      return ids.flatMap((id) => docs.has(id) ? [structuredClone(docs.get(id))] : [])
    },
    transaction() {
      state.transactions++
      // Use real SDK serialization, but replace commit with an atomic in-memory
      // executor. This never sends an SDK request or mutation to Sanity.
      const transaction = sdk.transaction()
      transaction.commit = async () => {
        state.commits++
        if (state.beforeCommit) state.beforeCommit()
        const operations = transaction.serialize()
        state.operations = operations
        const next = structuredClone(docs)
        for (const operation of operations) {
          assert.deepEqual(Object.keys(operation), ['patch'])
          const { patch } = operation
          assert.deepEqual(Object.keys(patch).sort(), ['id', 'ifRevisionID', 'set'])
          const doc = next.get(patch.id)
          if (!doc || doc._rev !== patch.ifRevisionID) throw new Error('Revision conflict')
          for (const [key, value] of Object.entries(patch.set)) {
            const match = key.match(/^sources\[_key=="([a-zA-Z0-9_-]+)"\]\.(citation|url)$/)
            assert.ok(match)
            doc.sources.find((source) => source._key === match[1])[match[2]] = value
          }
          doc._rev = `after-${doc._rev}`
        }
        docs.clear()
        for (const [id, doc] of next) docs.set(id, doc)
        if (state.loseResponse) throw new Error(`Simulated lost response: ${env.SANITY_IMPORT_TOKEN}`)
        return { transactionId: 'test-atomic-transaction' }
      }
      return transaction
    },
  })
}

test('only the exact reviewed plan is accepted, even if a tampered plan is rehashed', () => {
  assert.equal(plan.reviewHash, REVIEW_HASH)
  for (const modify of [
    (p) => { p.documents[0].id = 'other-document' },
    (p) => { p.documents[0].changes[0].path = 'title' },
    (p) => { p.documents[0].changes[0].after += 'Editorial rewrite' },
    (p) => { p.documents[0].patch.unset = ['body'] },
    (p) => { p.target.projectId = 'unapproved' },
    (p) => { p.documents[0].id = `drafts.${p.documents[0].id}` },
  ]) {
    const p = structuredClone(plan)
    modify(p)
    const { reviewHash: previousHash, ...content } = p
    assert.equal(previousHash, REVIEW_HASH)
    p.reviewHash = createHash('sha256').update(JSON.stringify(content)).digest('hex')
    assert.throws(() => validateLinkPlan(p))
  }
})

test('connected dry-run checks all five revisions and 18 old values without writes', async () => {
  const client = memoryClient(), before = structuredClone(client.docs)
  const report = await inspectLinks(plan, client)
  assert.equal(report.canApply, true)
  assert.equal(report.counts.readyDocuments, 5)
  assert.equal(report.counts.fieldsToPatch, 18)
  assert.ok(report.documents.every((doc) => doc.fields.every((field) => field.matchesBefore)))
  assert.equal(report.cloudWritesPerformed, 0)
  assert.equal(client.transactions, 0)
  assert.deepEqual(client.docs, before)
})

test('revision changes in unrelated editorial fields block instead of rebasing', async () => {
  const client = memoryClient(), doc = client.docs.get(plan.documents[0].id)
  doc._rev = 'edited-revision'
  doc.title = 'New editorial title'
  const report = await inspectLinks(plan, client)
  assert.equal(report.documents[0].status, 'revision-conflict')
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'PREFLIGHT_BLOCKED')
  assert.equal(client.transactions, 0)
  assert.equal(doc.title, 'New editorial title')
})

test('wrong old values, duplicate source keys, missing published docs and wrong identities block all writes', async () => {
  for (const damage of [
    (c) => { c.docs.get(plan.documents[0].id).sources[0].citation = 'Editor replacement' },
    (c) => { const d = c.docs.get(plan.documents[0].id); d.sources.push(structuredClone(d.sources[0])) },
    (c) => c.docs.delete(plan.documents[0].id),
    (c) => { c.docs.get(plan.documents[0].id)._type = 'publication' },
    (c) => { c.docs.get(plan.documents[0].id).slug.current = 'different-slug' },
  ]) {
    const client = memoryClient()
    damage(client)
    const report = await inspectLinks(plan, client)
    assert.equal(report.canApply, false)
    await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'PREFLIGHT_BLOCKED')
    assert.equal(client.commits, 0)
  }
})

test('simulated apply changes only 18 keyed values atomically and preserves published IDs, drafts and other content', async () => {
  const client = memoryClient(), before = structuredClone(client.docs)
  // Keyed paths remain correct if array ordering changes without changing data.
  for (const document of plan.documents) client.docs.get(document.id).sources.reverse()
  const report = await inspectLinks(plan, client)
  let savedBefore = false
  const result = await applyReviewedLinks(plan, client, approved(report), env, async () => { savedBefore = true })
  assert.equal(savedBefore, true)
  assert.equal(client.commits, 1)
  assert.equal(client.operations.length, 5)
  assert.equal(result.patchedFields, 18)
  assert.equal(result.counts.alreadyApplied, 5)
  assert.equal(result.verification, 'applied-and-verified')
  for (const document of plan.documents) {
    const after = client.docs.get(document.id), original = before.get(document.id)
    assert.equal(after.title, original.title)
    assert.deepEqual(after.body, original.body)
    assert.equal(after.editorField, original.editorField)
    assert.equal(after._id, original._id)
    for (const change of document.changes) assert.equal(getField(after, change), change.after)
    for (const source of after.sources) {
      const originalSource = original.sources.find((entry) => entry._key === source._key)
      for (const key of Object.keys(source)) if (!document.changes.some((change) => change.sourceKey === source._key && change.field === key)) assert.deepEqual(source[key], originalSource[key])
    }
  }
  assert.deepEqual(client.docs.get('foreign-document'), before.get('foreign-document'))
  const draftId = `drafts.${plan.documents[0].id}`
  assert.deepEqual(client.docs.get(draftId), before.get(draftId))
})

test('concurrent revision change aborts the entire transaction and retains editor changes', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client), editedId = plan.documents[3].id
  client.beforeCommit = () => { client.docs.get(editedId)._rev = 'concurrent-edit'; client.docs.get(editedId).title = 'Concurrent title' }
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'TRANSACTION_FAILED_OR_UNKNOWN')
  for (const doc of plan.documents) for (const change of doc.changes) assert.equal(getField(client.docs.get(doc.id), change), change.before)
  assert.equal(client.docs.get(editedId).title, 'Concurrent title')
})

test('changed connected state invalidates the confirmed hash before a transaction', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client)
  client.docs.get(plan.documents[0].id)._rev = 'after-review'
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'PLAN_CHANGED')
  assert.equal(client.transactions, 0)
})

test('local pre-write report failure stops before a transaction', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client)
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env, async () => { throw new Error('Disk unavailable') }), /Disk unavailable/)
  assert.equal(client.transactions, 0)
})

test('rerun recognizes all replacements without overwriting later editorial work', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client)
  await applyReviewedLinks(plan, client, approved(report), env)
  client.docs.get(plan.documents[0].id).title = 'Later editorial work'
  client.docs.get(plan.documents[0].id)._rev = 'later-editorial-revision'
  const current = await inspectLinks(plan, client)
  const repeat = await applyReviewedLinks(plan, client, approved(current), env)
  assert.equal(repeat.verification, 'already-applied-no-writes')
  assert.equal(repeat.cloudWritesPerformed, 0)
  assert.equal(client.commits, 1)
  assert.equal(client.docs.get(plan.documents[0].id).title, 'Later editorial work')
})

test('uncertain commit outcome is never retried; dry-run identifies successful writes', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client)
  client.loseResponse = true
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'TRANSACTION_FAILED_OR_UNKNOWN' && !error.message.includes(env.SANITY_IMPORT_TOKEN))
  assert.equal(client.commits, 1)
  assert.equal((await inspectLinks(plan, client)).counts.alreadyApplied, 5)
})

test('failed read-back after a successful transaction returns a safe receipt', async () => {
  const client = memoryClient(), report = await inspectLinks(plan, client)
  client.failReadBack = true
  await assert.rejects(applyReviewedLinks(plan, client, approved(report), env), (error) => error.code === 'POSTCHECK_FAILED' && error.details.transactionId === 'test-atomic-transaction')
  assert.equal(client.commits, 1)
})

test('explicit flags, exact confirmation, reviewed hash and dedicated environment token are mandatory for writes', async () => {
  assert.equal(parseLinkArguments([]).dryRun, true)
  assert.throws(() => parseLinkArguments(['--apply', '--dry-run']))
  assert.throws(() => parseLinkArguments(['--token', 'not-accepted']))
  assert.throws(() => parseLinkArguments(['--project', 'not-accepted']))
  const client = memoryClient(), report = await inspectLinks(plan, client), options = approved(report)
  for (const key of ['apply', 'confirm', 'planHash']) assert.throws(() => authorizeLinkApply({ ...options, [key]: undefined }, env))
  assert.throws(() => authorizeLinkApply(options, {}))
  await assert.rejects(applyReviewedLinks(plan, client, { ...options, dryRun: true }, env))
  assert.equal(client.transactions, 0)
  client.config = () => ({ ...TARGET, projectId: 'unapproved' })
  await assert.rejects(inspectLinks(plan, client), (error) => error.code === 'WRONG_TARGET')
})

test('unconfirmed real CLI fails before SDK/network and never prints the environment token', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exil-research-links-test-'))
  try {
    const guard = join(directory, 'no-network.mjs')
    await writeFile(guard, `import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import {syncBuiltinESMExports} from 'node:module'; const deny=()=>{throw new Error('Network disabled')};globalThis.fetch=deny;http.request=deny;https.request=deny;net.Socket.prototype.connect=deny;syncBuiltinESMExports();`)
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(guard).href, resolve('migration/scripts/apply-research-links.js'), '--apply', '--out', directory], { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 20_000 })
    assert.equal(result.status, 1)
    assert.ok(!`${result.stdout}${result.stderr}`.includes(env.SANITY_IMPORT_TOKEN))
    const error = JSON.parse(await readFile(join(directory, 'error.json'), 'utf8'))
    assert.equal(error.code, 'CONFIRMATION_REQUIRED')
    assert.equal(error.stage, 'authorization-and-plan')
  } finally {
    const inside = relative(resolve(tmpdir()), resolve(directory))
    assert.ok(inside && !inside.startsWith('..') && !isAbsolute(inside))
    await rm(directory, { recursive: true, force: true })
  }
})
