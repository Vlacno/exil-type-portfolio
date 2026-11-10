import process from 'node:process'
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sanityProject } from '../../shared/sanityConfig.js'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const TARGET = Object.freeze({ projectId: 'e1din49w', dataset: 'production' })
export const PLAN_FILE = resolve(ROOT, 'migration/review/research-source-links.json')
export const REVIEW_HASH = '0506279043ebd409fddc86125d31ace5e9460b7bea5628e1e4e05e8005a58fb6'
export const CONFIRMATION = 'APPLY RESEARCH URL FIXES e1din49w/production 5'
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const allowedStatuses = new Set(['ready', 'already-applied'])

export class LinkPatchError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details }
}

function checkTarget(target) {
  if (target?.projectId !== TARGET.projectId || target?.dataset !== TARGET.dataset) throw new LinkPatchError('WRONG_TARGET', 'Only e1din49w / production is allowed')
}

export function validateLinkPlan(plan) {
  checkTarget(plan.target)
  const { reviewHash, ...content } = plan
  // A modified plan cannot authorize new fields/IDs by recomputing its own hash.
  // A revised plan requires a new explicit code review of this pinned hash.
  if (reviewHash !== REVIEW_HASH || digest(content) !== REVIEW_HASH) throw new LinkPatchError('UNREVIEWED_PLAN', 'The plan differs from the reviewed URL-only proposal')
  if (plan.format !== 'research-source-links-review-v1' || plan.mode !== 'review-only-no-writes' || plan.documents.length !== 5) throw new LinkPatchError('INVALID_PLAN', 'Invalid review plan format or scope')
  const ids = new Set(), sourceIds = new Set()
  let fields = 0
  for (const document of plan.documents) {
    if (!document.id || /^(drafts|versions)\./.test(document.id) || ids.has(document.id) || !document.ifRevisionID || !document.slug) throw new LinkPatchError('INVALID_PLAN', 'Invalid published identity or revision')
    ids.add(document.id)
    const set = {}
    for (const change of document.changes) {
      if (!/^[a-zA-Z0-9_-]+$/.test(change.sourceKey) || !['citation', 'url'].includes(change.field)) throw new LinkPatchError('INVALID_PLAN', 'Only keyed citation/url fields are allowed')
      const path = `sources[_key==${JSON.stringify(change.sourceKey)}].${change.field}`
      const replacement = plan.replacements.find((pair) => typeof change.before === 'string' && change.before.includes(pair.old))
      if (change.path !== path || path in set || !replacement || change.after !== change.before.replaceAll(replacement.old, replacement.new)) throw new LinkPatchError('INVALID_PLAN', 'A change is not an exact reviewed URL replacement')
      set[path] = change.after
      sourceIds.add(`${document.id}:${change.sourceKey}`)
      fields++
    }
    if (document.patch.id !== document.id || document.patch.ifRevisionID !== document.ifRevisionID || Object.keys(document.patch).some((key) => !['id', 'ifRevisionID', 'set'].includes(key)) || Object.keys(document.patch.set).length !== Object.keys(set).length || Object.keys(set).some((key) => document.patch.set[key] !== set[key])) throw new LinkPatchError('INVALID_PLAN', 'Patch payload does not match reviewed changes')
  }
  if (fields !== 18 || sourceIds.size !== 10) throw new LinkPatchError('INVALID_PLAN', 'Expected exactly 5 documents, 10 sources and 18 fields')
  return plan
}

export async function loadLinkPlan() {
  return validateLinkPlan(JSON.parse(await readFile(PLAN_FILE, 'utf8')))
}

export function parseLinkArguments(argv) {
  const options = { dryRun: true, apply: false, out: resolve(ROOT, 'migration/generated/research-links') }
  let explicitDryRun = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--dry-run') explicitDryRun = true
    else if (argument === '--apply') options.apply = true
    else if (['--confirm', '--plan-hash', '--out'].includes(argument)) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new LinkPatchError('INVALID_ARGUMENTS', `Missing value for ${argument}`)
      options[{ '--confirm': 'confirm', '--plan-hash': 'planHash', '--out': 'out' }[argument]] = value
    } else throw new LinkPatchError('INVALID_ARGUMENTS', 'Unknown argument; target, document IDs, token and plan file cannot be overridden through CLI')
  }
  if (options.apply && explicitDryRun) throw new LinkPatchError('INVALID_ARGUMENTS', '--apply and --dry-run are mutually exclusive')
  options.dryRun = !options.apply
  return options
}

export function authorizeLinkApply(options, env) {
  if (options.dryRun) return
  if (options.apply !== true || options.confirm !== CONFIRMATION) throw new LinkPatchError('CONFIRMATION_REQUIRED', `Requires --apply and --confirm "${CONFIRMATION}"`)
  if (!/^[a-f0-9]{64}$/.test(options.planHash || '')) throw new LinkPatchError('PLAN_HASH_REQUIRED', 'Requires --plan-hash from the reviewed connected dry-run')
  if (!env.SANITY_IMPORT_TOKEN?.trim()) throw new LinkPatchError('TOKEN_REQUIRED', 'Requires a separately issued SANITY_IMPORT_TOKEN for the new project, provided only through the environment')
}

function checkClient(client) {
  checkTarget(sanityProject)
  const config = client.config()
  checkTarget(config)
  if (config.apiHost !== 'https://api.sanity.io' || config.useCdn !== false || config.withCredentials) throw new LinkPatchError('UNSAFE_TRANSPORT', 'Use the uncached Sanity API without cookies')
}

export async function inspectLinks(inputPlan, client) {
  const plan = validateLinkPlan(structuredClone(inputPlan))
  checkClient(client)
  // Exact existing published IDs only. No draft overlays or slug fallback.
  const documents = await client.fetch('*[_id in $ids]{_id,_type,_rev,slug,sources[]{_key,citation,url}}', { ids: plan.documents.map((document) => document.id) }, { perspective: 'published' })
  const rows = plan.documents.map((expected) => {
    const matches = documents.filter((document) => document._id === expected.id)
    const document = matches[0]
    const row = { id: expected.id, slug: expected.slug, expectedRevision: expected.ifRevisionID, currentRevision: document?._rev || null, published: Boolean(document), fields: [] }
    if (!document) return { ...row, status: 'missing-published' }
    if (matches.length !== 1 || document._type !== 'researchArticle' || document.slug?.current !== expected.slug || !document._rev) return { ...row, status: 'identity-conflict' }
    for (const change of expected.changes) {
      const sources = (Array.isArray(document.sources) ? document.sources : []).filter((source) => source._key === change.sourceKey)
      const value = sources[0]?.[change.field]
      row.fields.push({ path: change.path, matchesBefore: sources.length === 1 && value === change.before, matchesAfter: sources.length === 1 && value === change.after })
    }
    if (row.fields.every((field) => field.matchesAfter)) return { ...row, status: 'already-applied' }
    if (document._rev !== expected.ifRevisionID) return { ...row, status: 'revision-conflict' }
    if (!row.fields.every((field) => field.matchesBefore)) return { ...row, status: 'value-conflict' }
    return { ...row, status: 'ready' }
  })
  const report = {
    target: TARGET, dryRun: true, verification: 'connected-published-read-only', reviewHash: REVIEW_HASH,
    planHash: digest({ reviewHash: REVIEW_HASH, documents: rows }),
    canApply: rows.every((row) => allowedStatuses.has(row.status)),
    counts: { documents: 5, sources: 10, plannedFields: 18, readyDocuments: rows.filter((row) => row.status === 'ready').length, alreadyApplied: rows.filter((row) => row.status === 'already-applied').length, conflicts: rows.filter((row) => !allowedStatuses.has(row.status)).length, fieldsToPatch: rows.filter((row) => row.status === 'ready').reduce((sum, row) => sum + row.fields.length, 0) },
    documents: rows, cloudWritesPerformed: 0,
  }
  return report
}

export async function applyReviewedLinks(inputPlan, client, options, env, onBeforeWrite = async () => {}) {
  if (options.dryRun !== false || options.apply !== true) throw new LinkPatchError('WRITE_MODE_REQUIRED', 'Only an explicitly confirmed --apply may write')
  authorizeLinkApply(options, env)
  const plan = validateLinkPlan(structuredClone(inputPlan))
  // Always re-read both values and revisions immediately before the transaction.
  const preflight = await inspectLinks(plan, client)
  if (preflight.planHash !== options.planHash) throw new LinkPatchError('PLAN_CHANGED', 'Current state differs from the reviewed dry-run; run and review a new dry-run')
  if (!preflight.canApply) throw new LinkPatchError('PREFLIGHT_BLOCKED', 'Revision, old-value or published-identity conflicts; no writes performed', preflight.documents.filter((row) => !allowedStatuses.has(row.status)).map(({ id, status }) => ({ id, status })))
  const pending = plan.documents.filter((document) => preflight.documents.find((row) => row.id === document.id).status === 'ready')
  if (!pending.length) return { ...preflight, dryRun: false, verification: 'already-applied-no-writes' }
  // Save the checked state before attempting any cloud mutation. Disk failure
  // here stops without a write. This callback cannot change the copied plan.
  await onBeforeWrite(preflight)
  let transaction = client.transaction()
  for (const document of pending) {
    const set = Object.fromEntries(document.changes.map((change) => [change.path, change.after]))
    transaction = transaction.patch(document.id, (patch) => patch.ifRevisionId(document.ifRevisionID).set(set))
  }
  let result
  try {
    // One atomic transaction for the five exact documents. A concurrent editor
    // changing any revision causes the whole batch to fail, without rebasing.
    result = await transaction.commit({ visibility: 'sync', returnDocuments: false })
  } catch {
    throw new LinkPatchError('TRANSACTION_FAILED_OR_UNKNOWN', 'Transaction failed or its outcome is unknown. No automatic retry; use connected dry-run to determine current values')
  }
  const receipt = { transactionId: result.transactionId, patchedDocuments: pending.map((document) => document.id), patchedFields: preflight.counts.fieldsToPatch }
  let verified
  try { verified = await inspectLinks(plan, client) } catch {
    throw new LinkPatchError('POSTCHECK_FAILED', 'Transaction returned success, but read-back failed; run dry-run before any retry', receipt)
  }
  if (verified.counts.alreadyApplied !== 5) throw new LinkPatchError('POSTCHECK_FAILED', 'Transaction returned success, but values or published identities changed before verification; do not overwrite or roll back editor changes', receipt)
  return { ...verified, dryRun: false, verification: 'applied-and-verified', cloudWritesPerformed: pending.length, ...receipt }
}

async function saveReport(output, name, report) {
  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, name), JSON.stringify(report, null, 2) + '\n', 'utf8')
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseLinkArguments(argv), output = resolve(options.out)
  const runId = randomUUID()
  let stage = 'authorization-and-plan'
  try {
    checkTarget(sanityProject)
    authorizeLinkApply(options, env)
    const plan = await loadLinkPlan()
    const { createClient } = await import('@sanity/client')
    const client = createClient({ ...TARGET, apiVersion: '2025-02-19', perspective: 'published', useCdn: false, withCredentials: false, token: env.SANITY_IMPORT_TOKEN || undefined, maxRetries: 0, timeout: 20_000 })
    stage = 'connected-preflight'
    let report = await inspectLinks(plan, client)
    stage = 'local-report-write'
    await saveReport(output, 'report.json', { runId, ...report })
    if (!options.dryRun) {
      stage = 'confirmed-apply-and-verification'
      report = await applyReviewedLinks(plan, client, options, env, (checked) => saveReport(output, 'before-apply.json', { runId, ...checked }))
    }
    stage = 'local-report-write'
    await saveReport(output, 'report.json', { runId, ...report })
    try { await rename(resolve(output, 'error.json'), resolve(output, `previous-error-${runId}.json`)) } catch (error) { if (error.code !== 'ENOENT') throw error }
    await saveReport(output, 'last-run.json', { runId, status: report.canApply ? 'success' : 'blocked', dryRun: report.dryRun })
    console.log(JSON.stringify(report, null, 2))
    if (!report.canApply) process.exitCode = 1
    return report
  } catch (error) {
    const known = error instanceof LinkPatchError
    const failure = { runId, target: TARGET, dryRun: options.dryRun, stage, code: known ? error.code : 'OPERATION_FAILED', error: known ? error.message : 'Operation failed at the reported stage; no automatic retry. SDK error bodies and headers are omitted.', ...(known && error.details ? { details: error.details } : {}), httpStatus: Number.isInteger(error?.statusCode) ? error.statusCode : null }
    await saveReport(output, 'error.json', failure)
    await saveReport(output, 'last-run.json', { runId, status: 'failed', dryRun: options.dryRun })
    console.error(JSON.stringify(failure, null, 2))
    process.exitCode = 1
    return failure
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { console.error('URL patch CLI or report write failed; no automatic retry.'); process.exitCode = 1 })
}
