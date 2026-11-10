import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { buildPlan, validatePlan, assetReferences, TARGET, ROOT, hash, imageInfo } from '../scripts/plan-local.js'
import { applyPlan, pendingDocuments, resolveAssets } from '../scripts/apply-local.js'
import { parseArguments, authorizeApply } from '../scripts/import-local.js'

const { plan, snapshot } = await buildPlan()

// Deliberately implements only the importer interface. No SDK or network.
function memoryClient() {
  const docs = new Map(), images = new Map()
  const state = { docs, images, uploads: 0, commits: 0, failAtUpload: 0 }
  return Object.assign(state, {
    config: () => ({ ...TARGET, useCdn: false, withCredentials: false, apiHost: 'https://api.sanity.io' }),
    async fetch(query, parameters) {
      if (query.includes('sanity.imageAsset')) return [...images.values()].filter((asset) => parameters.hashes.includes(asset.sha1hash))
      if (!parameters.types) return [...docs.values()].filter((doc) => parameters.ids.includes(doc._id))
      return [...docs.values()].filter((doc) => parameters.ids.includes(doc._id) || doc._type === 'aboutPage' || parameters.types.includes(doc._type) && parameters.slugs.includes(doc.slug?.current))
    },
    assets: {
      async upload(type, bytes) {
        assert.equal(type, 'image')
        state.uploads++
        if (state.uploads === state.failAtUpload) throw new Error('Simulated interrupted image upload')
        const sha1hash = hash(bytes, 'sha1'), info = imageInfo(bytes)
        const asset = { _id: `image-${sha1hash}-${info.width}x${info.height}-${info.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`, sha1hash }
        images.set(asset._id, asset)
        return asset
      },
    },
    transaction() {
      const mutations = []
      return {
        createIfNotExists(doc) { mutations.push(doc); return this },
        async commit() {
          state.commits++
          for (const doc of mutations) if (!docs.has(doc._id)) docs.set(doc._id, structuredClone(doc))
        },
      }
    },
  })
}

test('plan maps the active local data and all image references deterministically', async () => {
  assert.deepEqual(plan.counts, { researchArticle: 5, publication: 18, typeface: 5, aboutPage: 1 })
  assert.equal(plan.documents.length, 29)
  assert.equal(plan.assets.length, 21)
  assert.equal(plan.documents.flatMap(assetReferences).length, 33)
  assert.equal(plan.documents.find((doc) => doc._type === 'aboutPage').sections.length, 5)
  assert.equal(snapshot.researchTemplate.body.filter((block) => block.kind === 'paragraph').length, 9)
  assert.equal(snapshot.researchTemplate.sources.length, 6)
  assert.match(snapshot.researchTemplate.copyright, /All rights reserved/i)
  assert.equal(snapshot.typefaceTemplate.body.filter((block) => block.kind === 'paragraph').length, 3)
  assert.match(snapshot.typefaceTemplate.samples.cyrillic, /Журнал Время/)
  assert.match(snapshot.typefaceTemplate.samples.reading, /[ієїґІЇЄҐ]/)
  assert.equal(snapshot.typefaceTemplate.samples.displayPrimary, 'Paris')
  assert.deepEqual((await buildPlan()).plan, plan)
  assert.ok(plan.assets.every((asset) => asset.paths.every((file) => /^src\/assets\/.+\.(jpg|png)$/.test(file))))
  assert.ok(plan.documents.every((doc) => doc._id.startsWith('drafts.')))
  assert.deepEqual(plan.documents.filter((doc) => doc._type === 'typeface').map((doc) => doc.name).sort(), ['Inter', 'Roboto Condensed / Russo One', 'Ruslan Display', 'Source Serif 4', 'Unbounded'])
})

test('preflight rejects wrong targets, duplicate slugs, old font keys and broken references', () => {
  for (const mutate of [
    (copy) => { copy.target.projectId = 'unapproved' },
    (copy) => { copy.target.dataset = 'other' },
    (copy) => { copy.documents[1].slug.current = copy.documents[0].slug.current },
    (copy) => { copy.documents[0].font = 'obsolete-font' },
    (copy) => { copy.documents[0].body = [] },
    (copy) => { copy.documents[0].body.find((block) => block.image).image.asset._ref = 'missing-image' },
    (copy) => { copy.documents.find((doc) => doc._type === 'typeface').fontKey = 'obsolete-font' },
  ]) {
    const copy = structuredClone(plan)
    mutate(copy)
    assert.throws(() => validatePlan(copy))
  }
  assert.throws(() => resolveAssets(plan.documents[0], new Map()), /not resolved/)
})

test('first simulated import creates drafts and real asset references; rerun preserves editor changes', async () => {
  const client = memoryClient()
  const first = await applyPlan(plan, client)
  assert.equal(first.uploadedImages, 21)
  assert.equal(first.createdOrAlreadyCreatedConcurrently, 29)
  assert.equal(first.published, 0)
  assert.equal(client.docs.size, 29)
  for (const doc of client.docs.values()) for (const ref of assetReferences(doc)) assert.ok(client.images.has(ref))
  client.docs.get(plan.documents[0]._id).title = 'Edited in Studio'
  const second = await applyPlan(plan, client)
  assert.equal(second.skippedExisting, 29)
  assert.equal(second.uploadedImages, 0)
  assert.equal(client.uploads, 21)
  assert.equal(client.commits, 1)
  assert.equal(client.docs.get(plan.documents[0]._id).title, 'Edited in Studio')
})

test('published and manually created same-slug documents are skipped; conflicting records stop before uploads', async () => {
  const client = memoryClient(), first = structuredClone(plan.documents[0]), second = structuredClone(plan.documents[1])
  first._id = first._id.replace(/^drafts\./, '')
  second._id = 'manually-created-research'
  client.docs.set(first._id, first)
  client.docs.set(second._id, second)
  const result = await applyPlan(plan, client)
  assert.equal(result.skippedExisting, 2)
  assert.ok(!client.docs.has(plan.documents[0]._id))
  assert.ok(!client.docs.has(plan.documents[1]._id))
  const conflict = memoryClient()
  conflict.docs.set('one', { ...first, _id: 'one' })
  conflict.docs.set('two', { ...first, _id: 'two' })
  await assert.rejects(applyPlan(plan, conflict), /Duplicate destination/)
  assert.equal(conflict.uploads, 0)
  assert.throws(() => pendingDocuments(plan, [{ _id: 'other-about', _type: 'aboutPage' }]), /noncanonical/)
})

test('an interrupted upload can be resumed by image hash without duplicate assets or partial documents', async () => {
  const client = memoryClient()
  client.failAtUpload = 4
  await assert.rejects(applyPlan(plan, client), /Simulated/)
  assert.equal(client.images.size, 3)
  assert.equal(client.docs.size, 0)
  client.failAtUpload = 0
  const result = await applyPlan(plan, client)
  assert.equal(result.reusedImages, 3)
  assert.equal(result.uploadedImages, 18)
  assert.equal(client.images.size, 21)
  assert.equal(client.docs.size, 29)
})

test('changed image bytes and a foreign client stop before any upload', async () => {
  const changed = structuredClone(plan), client = memoryClient()
  changed.assets[0].sha1 = '0'.repeat(40)
  await assert.rejects(applyPlan(changed, client), /Image changed/)
  assert.equal(client.uploads, 0)
  client.config = () => ({ ...TARGET, projectId: 'unapproved' })
  await assert.rejects(applyPlan(plan, client), /Import target/)
})

test('apply requires explicit target, reviewed plan hash, warning acknowledgment and separate token', () => {
  assert.equal(parseArguments([]).dryRun, true)
  assert.equal(parseArguments(['--dry-run']).dryRun, true)
  assert.throws(() => parseArguments(['--apply', '--dry-run']), /mutually exclusive/)
  assert.throws(() => parseArguments(['--token', 'not-supported']), /Unknown/)
  const authorized = { dryRun: false, confirmProject: TARGET.projectId, planHash: plan.approvalHash, acknowledgeWarnings: true }
  for (const field of ['confirmProject', 'planHash', 'acknowledgeWarnings']) {
    assert.throws(() => authorizeApply({ ...authorized, [field]: undefined }, plan, { SANITY_IMPORT_TOKEN: 'synthetic-test-only' }))
  }
  assert.throws(() => authorizeApply(authorized, plan, {}), /SANITY_IMPORT_TOKEN/)
  assert.doesNotThrow(() => authorizeApply(authorized, plan, { SANITY_IMPORT_TOKEN: 'synthetic-test-only' }))
})

test('real dry-run CLI works with network transports disabled and never prints a token', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'exil-import-test-'))
  try {
    const guard = join(directory, 'no-network.mjs')
    await writeFile(guard, `import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import {syncBuiltinESMExports} from 'node:module';
const deny = () => { throw new Error('NETWORK IS DISABLED IN THIS TEST') };
globalThis.fetch = deny; http.request = deny; http.get = deny; https.request = deny; https.get = deny; net.connect = deny; net.createConnection = deny; net.Socket.prototype.connect = deny; syncBuiltinESMExports();`)
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(guard).href, resolve(ROOT, 'migration/scripts/import-local.js'), '--dry-run', '--out', join(directory, 'output')], {
      cwd: ROOT, encoding: 'utf8', timeout: 30_000,
      env: { ...process.env, SANITY_IMPORT_TOKEN: 'synthetic-token-never-print-me' },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.ok(!`${result.stdout}${result.stderr}`.includes('synthetic-token-never-print-me'))
    const report = JSON.parse(await readFile(join(directory, 'output/report.json'), 'utf8'))
    assert.equal(report.dryRun, true)
    assert.equal(report.approvalHash, plan.approvalHash)
    assert.equal(report.totalContentDocuments, 29)
    const output = JSON.parse(await readFile(join(directory, 'output/plan.json'), 'utf8'))
    assert.deepEqual(output, JSON.parse(JSON.stringify(plan)))
  } finally {
    // Only this test's freshly created, absolute OS temp directory.
    await rm(directory, { recursive: true, force: true })
  }
})
