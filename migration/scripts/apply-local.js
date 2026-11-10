import { readFile, realpath } from 'node:fs/promises'
import { basename, resolve, relative, isAbsolute } from 'node:path'
import { assertTarget, assetReferences, hash, validatePlan, ROOT } from './plan-local.js'

const publishedId = (id) => id.replace(/^drafts\./, '')

export function pendingDocuments(plan, existing) {
  return plan.documents.filter((doc) => {
    const matches = existing.filter((candidate) =>
      publishedId(candidate._id) === publishedId(doc._id)
      || candidate._type === doc._type && (doc._type === 'aboutPage' || candidate.slug?.current === doc.slug.current),
    )
    if (matches.some((candidate) => candidate._type !== doc._type)) throw new Error(`Document ID has a different type: ${doc._id}`)
    if (new Set(matches.map((candidate) => publishedId(candidate._id))).size > 1) throw new Error(`Duplicate destination documents for ${doc.slug?.current || 'aboutPage'}; resolve before importing`)
    if (doc._type === 'aboutPage' && matches.some((candidate) => publishedId(candidate._id) !== 'aboutPage')) throw new Error('Existing About document has a noncanonical ID; review the singleton before importing')
    // Never overwrite an editor's draft or published record, including a record
    // created manually with the same type/slug but a different document ID.
    return matches.length === 0
  })
}

export function resolveAssets(document, references) {
  if (Array.isArray(document)) return document.map((value) => resolveAssets(value, references))
  if (!document || typeof document !== 'object') return document
  if (document._type === 'reference') {
    const ref = references.get(document._ref)
    if (!ref || !/^image-[a-f0-9]+-\d+x\d+-(jpg|png)$/.test(ref)) throw new Error('An image reference was not resolved to an uploaded Sanity asset')
    return { _type: 'reference', _ref: ref }
  }
  return Object.fromEntries(Object.entries(document).map(([key, value]) => [key, resolveAssets(value, references)]))
}

// Called only after CLI approval gates, or by tests with an in-memory fake client.
export async function applyPlan(plan, client, { root = ROOT } = {}) {
  validatePlan(plan)
  const config = client.config()
  assertTarget(config)
  if (config.useCdn !== false || config.withCredentials || config.apiHost !== 'https://api.sanity.io') throw new Error('Importer requires the uncached, non-cookie Sanity API transport')
  const existing = await client.fetch(`*[
    !(_id in path("versions.**")) &&
    (_id in $ids || (_type in $types && slug.current in $slugs) || _type == "aboutPage")
  ]{_id, _type, slug}`, {
    ids: plan.documents.flatMap((doc) => [doc._id, publishedId(doc._id)]),
    types: [...new Set(plan.documents.map((doc) => doc._type))],
    slugs: plan.documents.flatMap((doc) => doc.slug ? [doc.slug.current] : []),
  }, { perspective: 'raw' })
  const pending = pendingDocuments(plan, existing)
  const needed = new Set(pending.flatMap(assetReferences))
  const assets = plan.assets.filter((asset) => needed.has(asset.key))
  const buffers = new Map()
  const assetRoot = await realpath(resolve(root, 'src/assets'))
  // Validate all local binaries before the first upload. The same checked bytes
  // are passed to upload, so an edited file cannot bypass the reviewed plan.
  for (const asset of assets) {
    const file = await realpath(resolve(root, asset.paths[0]))
    const inside = relative(assetRoot, file)
    if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('Image path escaped src/assets')
    const bytes = await readFile(file)
    if (hash(bytes) !== asset.sha256 || hash(bytes, 'sha1') !== asset.sha1) throw new Error(`Image changed since dry-run: ${asset.paths[0]}`)
    buffers.set(asset.key, bytes)
  }
  const known = assets.length ? await client.fetch('*[_type == "sanity.imageAsset" && sha1hash in $hashes]{_id, sha1hash}', { hashes: assets.map((asset) => asset.sha1) }) : []
  const references = new Map()
  let uploaded = 0
  for (const asset of assets) {
    let record = known.find((candidate) => candidate.sha1hash === asset.sha1)
    if (!record) {
      record = await client.assets.upload('image', buffers.get(asset.key), { filename: basename(asset.paths[0]), contentType: asset.mimeType })
      uploaded++
    }
    if (!new RegExp(`^image-${asset.sha1}-\\d+x\\d+-(jpg|png)$`).test(record._id)) throw new Error('Sanity returned an unexpected image asset identity')
    references.set(asset.key, record._id)
  }
  const resolved = pending.map((doc) => resolveAssets(doc, references))
  if (resolved.some((doc) => assetReferences(doc).some((ref) => ref.startsWith('pending-')))) throw new Error('Unresolved image in mutation payload')
  if (resolved.length) {
    // One atomic document transaction; asset uploads happen first. A failed run
    // may leave uploaded assets, which the next run reuses by content hash.
    let transaction = client.transaction()
    for (const doc of resolved) transaction = transaction.createIfNotExists(doc)
    await transaction.commit({ visibility: 'sync', returnDocuments: false })
  }
  const verified = await client.fetch('*[_id in $ids]{_id, _type}', { ids: plan.documents.map((doc) => doc._id) }, { perspective: 'raw' })
  const createdIds = new Set(verified.map((doc) => doc._id))
  for (const doc of resolved) if (!createdIds.has(doc._id)) throw new Error('Post-import count check failed; rerun is safe after reviewing the error')
  return { target: plan.target, planned: plan.documents.length, createdOrAlreadyCreatedConcurrently: resolved.length, skippedExisting: plan.documents.length - resolved.length, uploadedImages: uploaded, reusedImages: assets.length - uploaded, published: 0 }
}
