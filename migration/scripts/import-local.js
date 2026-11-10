import process from 'node:process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildPlan, ROOT, TARGET } from './plan-local.js'

export function parseArguments(argv) {
  const options = { dryRun: true, out: resolve(ROOT, 'migration/generated') }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--dry-run') dryRun = true
    else if (argument === '--apply') apply = true
    else if (argument === '--acknowledge-warnings') options.acknowledgeWarnings = true
    else if (['--out', '--confirm-project', '--plan-hash'].includes(argument)) {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`)
      options[{ '--out': 'out', '--confirm-project': 'confirmProject', '--plan-hash': 'planHash' }[argument]] = value
    } else throw new Error(`Unknown argument: ${argument}`)
  }
  if (dryRun && apply) throw new Error('--dry-run and --apply are mutually exclusive')
  options.dryRun = !apply
  return options
}

export function authorizeApply(options, plan, env) {
  if (options.dryRun) return
  if (options.confirmProject !== TARGET.projectId) throw new Error('--apply requires --confirm-project e1din49w')
  if (options.planHash !== plan.approvalHash) throw new Error('--apply requires the exact --plan-hash from the reviewed dry-run')
  if (plan.warnings.length && !options.acknowledgeWarnings) throw new Error('Review content and image rights, then explicitly use --acknowledge-warnings')
  if (!env.SANITY_IMPORT_TOKEN?.trim()) throw new Error('SANITY_IMPORT_TOKEN is required only for an explicitly authorized import')
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const options = parseArguments(argv)
  const { plan, snapshot } = await buildPlan()
  const report = {
    target: plan.target, dryRun: options.dryRun, documents: plan.counts,
    totalContentDocuments: plan.documents.length, uniqueImages: plan.assets.length,
    imageBytes: plan.assets.reduce((sum, asset) => sum + asset.bytes, 0),
    aboutSections: plan.documents.find((doc) => doc._type === 'aboutPage').sections.length,
    warnings: plan.warnings, approvalHash: plan.approvalHash,
    networkDuringDryRun: 'none; no SDK client, token, request, asset upload or mutation is used',
  }
  authorizeApply(options, plan, env)
  const output = resolve(options.out)
  await mkdir(output, { recursive: true })
  for (const [file, data] of [['source-snapshot.json', snapshot], ['plan.json', plan], ['report.json', report]]) {
    await writeFile(resolve(output, file), JSON.stringify(data, null, 2) + '\n', 'utf8')
  }
  console.log(JSON.stringify(report, null, 2))
  if (options.dryRun) return report
  // This branch is not run as part of preparation. Use a separately issued,
  // target-scoped token; do not reuse Studio login or a customer's credentials.
  const { createClient } = await import('@sanity/client')
  const { applyPlan } = await import('./apply-local.js')
  const client = createClient({ ...TARGET, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw', withCredentials: false, token: env.SANITY_IMPORT_TOKEN })
  const result = await applyPlan(plan, client)
  await writeFile(resolve(output, 'result.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify(result, null, 2))
  return result
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    let message = error instanceof Error ? error.message : 'Local import failed'
    if (process.env.SANITY_IMPORT_TOKEN) message = message.split(process.env.SANITY_IMPORT_TOKEN).join('[REDACTED]')
    console.error(message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]'))
    process.exitCode = 1
  })
}
