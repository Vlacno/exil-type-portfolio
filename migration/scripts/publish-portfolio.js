import process from 'node:process'
import { mkdir, writeFile, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, TARGET, assertTarget, hash, assetReferences } from './plan-local.js'
import { sanityProject } from '../../shared/sanityConfig.js'
import { PUBLISH_SCOPE } from './publish-scope.js'

export const CONFIRMATION = 'PUBLISH e1din49w/production PORTFOLIO 29'
const allowedFonts = new Set(['source-serif-4', 'inter', 'unbounded', 'roboto-condensed', 'russo-one', 'ruslan-display'])
const names = new Set(['Source Serif 4', 'Inter', 'Unbounded', 'Roboto Condensed / Russo One', 'Ruslan Display'])

export class PublicationError extends Error {
  constructor(code, message, details) {
    super(message)
    this.code = code
    this.details = details
  }
}

export function parsePublishArguments(argv) {
  const options = { dryRun: true, offline: false, publicOnly: false, out: resolve(ROOT, 'migration/generated/publish') }
  let dryRun = false, publish = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--dry-run') dryRun = true
    else if (argument === '--publish') publish = true
    else if (argument === '--offline') options.offline = true
    else if (argument === '--public-only') options.publicOnly = true
    else if (['--confirm', '--plan-hash', '--out'].includes(argument)) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
      options[{ '--confirm': 'confirm', '--plan-hash': 'planHash', '--out': 'out' }[argument]] = value
    } else throw new Error(`Unknown argument: ${argument}`)
  }
  if (publish && (dryRun || options.offline || options.publicOnly)) throw new Error('--publish cannot be combined with --dry-run, --offline or --public-only')
  if (options.offline && options.publicOnly) throw new Error('--offline and --public-only are mutually exclusive')
  options.dryRun = !publish
  return options
}

export function authorizePublish(options, env) {
  if (!options.dryRun) {
    if (options.publicOnly || options.offline) throw new Error('Publication requires an authenticated connected plan')
    if (options.confirm !== CONFIRMATION) throw new Error(`Publication requires --confirm "${CONFIRMATION}"`)
    if (!/^[a-f0-9]{64}$/.test(options.planHash || '')) throw new Error('Publication requires --plan-hash from a connected dry-run')
  }
  if (!options.offline && !options.publicOnly && !env.SANITY_IMPORT_TOKEN?.trim()) throw new PublicationError('MISSING_TOKEN', 'SANITY_IMPORT_TOKEN is missing; use --dry-run --public-only for a limited public CMS check or --dry-run --offline for a local report')
}

function validateClient(client) {
  const config = client.config()
  assertTarget(config)
  if (config.apiHost !== 'https://api.sanity.io' || config.useCdn !== false || config.withCredentials) throw new Error('Publisher requires the uncached, non-cookie Sanity API transport')
}

export function publishedDocument(draft, entry) {
  if (draft._id !== entry.draftId || draft._type !== entry.type || !draft._rev) throw new Error('Draft identity or revision does not match the allowlist')
  if (entry.slug && draft.slug?.current !== entry.slug) throw new Error('Draft slug does not match the imported portfolio')
  if (entry.type === 'typeface' && (draft.fontKey !== entry.slug || !names.has(draft.name))) throw new Error('Draft does not use the portfolio free font')
  if (entry.type === 'researchArticle' && !allowedFonts.has(draft.font)) throw new Error('Draft uses a disallowed heading font')
  if (entry.type === 'aboutPage' && (!Array.isArray(draft.sections) || ['about', 'research', 'copyright', 'support', 'contact'].some((key) => !draft.sections.some((section) => section._key === key)))) throw new Error('About does not contain the imported portfolio sections')
  if (draft._system) throw new Error('System-managed release documents are not supported')
  // Content stays intact; only Sanity-managed top-level fields are removed.
  const payload = Object.fromEntries(Object.entries(draft).filter(([key]) => !['_id', '_rev', '_createdAt', '_updatedAt'].includes(key)))
  return { ...payload, _id: entry.publishedId }
}

export function summarize(report) {
  report.counts = Object.fromEntries(['unverified', 'ready', 'skipped-published', 'missing-draft', 'alternate-draft', 'conflicting-identity', 'invalid-draft', 'broken-reference', 'published', 'error'].map((status) => [status, report.documents.filter((entry) => entry.status === status).length]))
  return report
}

export function offlineReport() {
  assertTarget(sanityProject)
  return summarize({ target: TARGET, dryRun: true, verification: 'offline-unverified', planHash: null, totalAllowed: 29,
    warning: 'No CMS access: draft existence, revisions, published versions, assets and permissions are unverified. This report cannot authorize publication.',
    documents: PUBLISH_SCOPE.map((entry) => ({ ...entry, status: 'unverified' })),
  })
}

export async function inspectPublication(client, { publicOnly = false } = {}) {
  validateClient(client)
  const perspective = publicOnly ? 'published' : 'raw'
  const ids = PUBLISH_SCOPE.flatMap((entry) => publicOnly ? [entry.publishedId] : [entry.draftId, entry.publishedId])
  const records = await client.fetch(publicOnly ? '*[_id in $ids]{_id,_type,_rev,slug}' : '*[_id in $ids]', { ids }, { perspective })
  // Discovery is metadata-only and never expands the write allowlist. A manual
  // published record is skipped; an alternate draft is reported, not adopted.
  const matches = await client.fetch(`*[
    !(_id in path("versions.**")) && _type in $types && slug.current in $slugs
  ]{_id,_type,_rev,slug}`, {
    types: [...new Set(PUBLISH_SCOPE.filter((entry) => entry.slug).map((entry) => entry.type))],
    slugs: PUBLISH_SCOPE.flatMap((entry) => entry.slug ? [entry.slug] : []),
  }, { perspective })
  const byId = new Map(records.map((doc) => [doc._id, doc]))
  const candidates = new Map()
  const documents = PUBLISH_SCOPE.map((entry) => {
    const published = byId.get(entry.publishedId), draft = byId.get(entry.draftId)
    if (published) return { ...entry, status: 'skipped-published', publishedRevision: published._rev || null, draftRevision: draft?._rev || null }
    const alternatives = entry.slug ? matches.filter((record) => record._type === entry.type && record.slug?.current === entry.slug && ![entry.draftId, entry.publishedId].includes(record._id)) : []
    const publishedAlternatives = alternatives.filter((record) => !record._id.startsWith('drafts.') && !record._id.startsWith('versions.'))
    if (publishedAlternatives.length > 1) return { ...entry, status: 'conflicting-identity', matchingIds: alternatives.map((record) => record._id).sort(), error: 'Multiple published documents have the portfolio type and slug; review without changing cloud data' }
    if (publishedAlternatives.length === 1) return {
      ...entry, status: 'skipped-published', resolvedPublishedId: publishedAlternatives[0]._id,
      publishedRevision: publishedAlternatives[0]._rev || null, draftRevision: draft?._rev || null,
      reason: 'A published document with this type and slug already exists under another ID; no canonical copy will be created',
    }
    if (alternatives.length) return { ...entry, status: 'alternate-draft', matchingIds: alternatives.map((record) => record._id).sort(), error: 'A same-type/same-slug draft exists under another ID; it is not authorized for publication by this allowlist' }
    if (publicOnly) return { ...entry, status: 'unverified', reason: 'No published version was found; draft visibility requires SANITY_IMPORT_TOKEN' }
    if (!draft) return { ...entry, status: 'missing-draft', error: 'The exact imported draft ID does not exist' }
    try {
      const payload = publishedDocument(draft, entry)
      const references = assetReferences(payload)
      if (references.some((ref) => typeof ref !== 'string' || !/^image-[a-f0-9]+-\d+x\d+-(jpg|png)$/.test(ref))) throw new Error('Draft contains unresolved or non-image references')
      candidates.set(entry.draftId, { draft, payload, references })
      return { ...entry, status: 'ready', draftRevision: draft._rev, contentHash: hash(JSON.stringify(payload)) }
    } catch {
      return { ...entry, status: 'invalid-draft', error: 'Draft identity, slug, revision, font, system fields or references failed validation' }
    }
  })
  const referencedIds = [...new Set([...candidates.values()].flatMap((candidate) => candidate.references))]
  const assets = referencedIds.length ? await client.fetch('*[_id in $ids && _type == "sanity.imageAsset"]{_id}', { ids: referencedIds }, { perspective: 'raw' }) : []
  const existingAssets = new Set(assets.map((asset) => asset._id))
  for (const row of documents) {
    const candidate = candidates.get(row.draftId)
    if (candidate?.references.some((ref) => !existingAssets.has(ref))) {
      row.status = 'broken-reference'
      row.error = 'A referenced image asset does not exist in the target dataset'
      candidates.delete(row.draftId)
    }
  }
  const report = summarize({ target: TARGET, dryRun: true, verification: publicOnly ? 'connected-public-only' : 'connected-read-only', totalAllowed: 29, documents })
  report.planHash = publicOnly ? null : hash(JSON.stringify({ target: TARGET, documents }))
  if (publicOnly) report.warning = 'Connected to the new CMS without a token. Published records are verified; draft existence, revisions and write permissions remain unverified. This report cannot authorize publication.'
  return { report, candidates }
}

export async function publishReviewed(client, inspection, options, env, onProgress = async () => {}) {
  // This guard also applies when this function is called outside the CLI.
  if (options.dryRun || options.offline || options.publicOnly) throw new Error('Publishing requires explicit authenticated write mode')
  authorizePublish(options, env)
  validateClient(client)
  // Never trust a passed/mutable report as authority: re-read immediately before
  // publication. Revision guards below cover changes after this fresh read.
  const current = await inspectPublication(client)
  if (current.report.planHash !== options.planHash || inspection.report.planHash !== options.planHash) throw new PublicationError('PLAN_CHANGED', 'Publication plan changed; run and review a new connected dry-run')
  if (current.report.documents.some((entry) => !['ready', 'skipped-published'].includes(entry.status))) throw new PublicationError('PREFLIGHT_BLOCKED', 'Preflight contains errors; no documents will be published', current.report.documents.filter((entry) => !['ready', 'skipped-published'].includes(entry.status)).map((entry) => ({ draftId: entry.draftId, status: entry.status })))
  const report = { ...current.report, dryRun: false, verification: 'publication-run', documents: structuredClone(current.report.documents) }
  for (const row of report.documents) {
    if (row.status !== 'ready') continue
    const { draft, payload } = current.candidates.get(row.draftId)
    try {
      // Strict create (not createIfNotExists / createOrReplace) makes any
      // concurrently created published version abort this whole transaction.
      // Revision-guarded patch + create + delete are atomic per document, so
      // changed drafts and existing published versions both remain untouched.
      const result = await client.transaction()
        .patch(row.draftId, (patch) => patch.ifRevisionId(draft._rev).set(row.type === 'aboutPage' ? { sections: draft.sections } : { slug: draft.slug }))
        .create(payload)
        .delete(row.draftId)
        .commit({ visibility: 'sync', returnDocuments: false })
      row.status = 'published'
      row.transactionId = result.transactionId
    } catch (error) {
      row.status = 'error'
      // Do not serialize SDK errors, requests, response bodies or credentials.
      row.error = 'Transaction failed or its outcome is uncertain; rerun dry-run before retrying'
      row.httpStatus = Number.isInteger(error?.statusCode) ? error.statusCode : null
    }
    summarize(report)
    await onProgress(report)
  }
  return summarize(report)
}

async function saveReport(output, report) {
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
}

async function archivePreviousError(output) {
  try {
    await rename(resolve(output, 'error.json'), resolve(output, `previous-error-${randomUUID()}.json`))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parsePublishArguments(argv)
  const output = resolve(options.out)
  let stage = 'authorization'
  try {
    assertTarget(sanityProject)
    authorizePublish(options, env)
    let report
    if (options.offline) report = offlineReport()
    else {
      const { createClient } = await import('@sanity/client')
      const client = createClient({ ...TARGET, apiVersion: '2025-02-19', useCdn: false, withCredentials: false, perspective: options.publicOnly ? 'published' : 'raw', token: options.publicOnly ? undefined : env.SANITY_IMPORT_TOKEN, maxRetries: 0 })
      stage = 'read-only-preflight'
      const inspection = await inspectPublication(client, { publicOnly: options.publicOnly })
      report = inspection.report
      stage = 'report-write'
      await saveReport(output, report)
      stage = 'reviewed-plan-and-publication'
      if (!options.dryRun) report = await publishReviewed(client, inspection, options, env, (progress) => saveReport(output, progress))
    }
    stage = 'report-write'
    await saveReport(output, report)
    await archivePreviousError(output)
    console.log(JSON.stringify(report, null, 2))
    if (report.documents.some((entry) => ['missing-draft', 'alternate-draft', 'conflicting-identity', 'invalid-draft', 'broken-reference', 'error'].includes(entry.status))) process.exitCode = 1
    return report
  } catch (error) {
    const known = error instanceof PublicationError
    const report = {
      target: TARGET, dryRun: options.dryRun, verification: 'failed', stage,
      code: known ? error.code : 'OPERATION_FAILED',
      error: known ? error.message : 'Operation failed at the reported stage; inspect the last per-document report. No automatic retry.',
      ...(known && error.details ? { details: error.details } : {}),
      httpStatus: Number.isInteger(error?.statusCode) ? error.statusCode : null,
    }
    // Preserve the last progress report; do not hide partial successes.
    await mkdir(output, { recursive: true })
    await writeFile(resolve(output, 'error.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
    console.error(JSON.stringify(report, null, 2))
    process.exitCode = 1
    return report
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    let message = error instanceof Error ? error.message : 'Portfolio publication failed'
    if (process.env.SANITY_IMPORT_TOKEN) message = message.split(process.env.SANITY_IMPORT_TOKEN).join('[REDACTED]')
    console.error(message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]'))
    process.exitCode = 1
  })
}
