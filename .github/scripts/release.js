import process from 'node:process'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))
const json = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`)

export async function inventory(directory, prefix = '') {
  const files = []
  for (const entry of (await readdir(path.join(directory, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...await inventory(directory, name))
    else if (entry.isFile()) files.push({ path: name, sha256: hash(await readFile(path.join(directory, name))) })
    else throw new Error('Release artifacts must contain regular files only')
  }
  return files
}

export async function verifyArtifact(root, env) {
  const release = await readJson(path.join(root, '.vercel/release.json'))
  if (release.sha !== env.GITHUB_SHA || release.repository !== env.GITHUB_REPOSITORY || release.contentSource !== 'sanity') throw new Error('Artifact identity mismatch')
  const files = await inventory(path.join(root, '.vercel/output'))
  if (JSON.stringify(files) !== JSON.stringify(release.files) || hash(JSON.stringify(files)) !== release.digest) throw new Error('Artifact content mismatch')
  return release
}

async function api(url, token, request = fetch, operation = 'Read-only API request') {
  if (!token) throw new Error('Missing API credential')
  const response = await request(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`${operation} failed: HTTP ${response.status}`)
  try { return await response.json() } catch { throw new Error(`${operation} returned invalid JSON`) }
}

export async function assertCurrent(env, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'push') throw new Error('Release requires an exact main push commit')
  const ref = await api(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/git/ref/heads/main`, env.GH_TOKEN, request)
  if (ref.object?.sha !== env.GITHUB_SHA) throw new Error('Superseded commit: release blocked')
}

export function deploymentUrl(value) {
  const url = new URL(value.startsWith('https://') ? value : `https://${value}`)
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected an immutable Vercel deployment URL')
  return url.origin
}

export function selectDeployment(data, release) {
  if (!data || !Array.isArray(data.deployments) || data.pagination?.next) throw new Error('Incomplete deployment list; inspect before retrying')
  const candidates = data.deployments.filter((d) => d.target === 'production' && d.meta?.portfolioRepository === release.repository && d.meta?.githubCommitSha === release.sha)
  if (candidates.length > 1) throw new Error('Multiple deployments for this commit; inspect before retrying')
  if (!candidates.length) return null
  const deployment = candidates[0]
  if (deployment.meta.portfolioBuild !== release.digest) throw new Error('This commit already has a different artifact; refuse a duplicate deployment')
  if ((deployment.state || deployment.readyState) !== 'READY') throw new Error('Existing deployment is not ready; refuse a duplicate deployment')
  return { url: deploymentUrl(deployment.url) }
}

export async function discoverDeployment(release, env, request = fetch) {
  // CLI list also reads team/account metadata. Discovery needs only the verified
  // project and its deployments, with the owner scope explicit on each request.
  await readProject(env, request)
  const query = new URLSearchParams({
    projectId: env.VERCEL_PROJECT_ID,
    teamId: env.VERCEL_ORG_ID,
    target: 'production',
    limit: '20',
    'meta-portfolioRepository': release.repository,
    'meta-githubCommitSha': release.sha,
  })
  const data = await api(`https://api.vercel.com/v6/deployments?${query}`, env.VERCEL_TOKEN, request, 'Deployment discovery (check deployment-read permission for the configured project/team)')
  return selectDeployment(data, release)
}

export async function verifyHosted(root, env, request = fetch) {
  const release = await verifyArtifact(root, env)
  const { url } = await readJson(path.join(root, '.vercel/deployment.json'))
  const origin = deploymentUrl(url)
  const headers = env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}
  // Check the immutable staged origin only; never send a bypass secret through redirects.
  for (const file of release.files.filter((f) => f.path.startsWith('static/'))) {
    const name = file.path.slice('static/'.length)
    const target = name === 'index.html' ? `${origin}/` : `${origin}/${name.split('/').map(encodeURIComponent).join('/')}`
    const response = await request(target, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) })
    if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== file.sha256) throw new Error(`Staged artifact verification failed: ${name}`)
  }
}

export async function readProject(env, request = fetch) {
  const project = await api(`https://api.vercel.com/v9/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID)}?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}`, env.VERCEL_TOKEN, request)
  if (project.id !== env.VERCEL_PROJECT_ID || project.accountId !== env.VERCEL_ORG_ID) throw new Error('Unexpected Vercel project or owner')
  if (project.rootDirectory && project.rootDirectory !== '.') throw new Error('Vercel Root Directory must be the frontend repository root')
  if (project.rollingRelease || ['pending', 'in-progress'].includes(project.lastAliasRequest?.jobStatus)) throw new Error('Resolve active or queued Vercel promotions and disable Rolling Releases before releasing')
  return project
}

async function currentProduction(env) {
  const project = await readProject(env)
  return project.targets?.production?.url ? deploymentUrl(project.targets.production.url) : null
}

async function main(command, argument) {
  const env = process.env
  const root = process.cwd()
  const state = '.vercel/deployment.json'
  if (command === 'package') {
    if (env.VITE_CONTENT_SOURCE !== 'sanity' || !env.GITHUB_SHA || !env.GITHUB_REPOSITORY) throw new Error('Missing CMS release build identity')
    await mkdir('.vercel', { recursive: true })
    await mkdir('.vercel/output')
    await cp('dist', '.vercel/output/static', { recursive: true })
    await json('.vercel/output/config.json', { version: 3 })
    const files = await inventory('.vercel/output')
    await json('.vercel/release.json', { sha: env.GITHUB_SHA, repository: env.GITHUB_REPOSITORY, contentSource: 'sanity', digest: hash(JSON.stringify(files)), files })
    return
  }
  if (command === 'preflight') {
    for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) if (!env[key]) throw new Error(`Missing GitHub Secret: ${key}`)
    return assertCurrent(env)
  }
  const release = await verifyArtifact(root, env)
  if (command === 'verify') return console.log(`Verified artifact for ${release.sha}`)
  if (command === 'digest') return console.log(release.digest)
  if (command === 'link') {
    await readProject(env)
    return json('.vercel/project.json', { orgId: env.VERCEL_ORG_ID, projectId: env.VERCEL_PROJECT_ID })
  }
  if (command === 'lookup') {
    const selected = await discoverDeployment(release, env)
    if (selected) await json(state, selected)
    else await rm(state, { force: true })
    return
  }
  if (command === 'select') {
    const selected = selectDeployment(await readJson(argument), release)
    if (selected) await json(state, selected)
    return
  }
  if (command === 'record') return json(state, { url: deploymentUrl(argument) })
  if (command === 'smoke') return verifyHosted(root, env)
  const { url } = await readJson(state)
  if (command === 'url') return console.log(deploymentUrl(url))
  if (command === 'current' || command === 'confirm') {
    const current = await currentProduction(env)
    const matches = current === deploymentUrl(url)
    if (command === 'current') return writeFile(env.GITHUB_OUTPUT, `current=${matches}\n`, { flag: 'a' })
    if (!matches) throw new Error('Production target does not match the tested deployment')
    return writeFile(env.GITHUB_STEP_SUMMARY, `Released commit \`${release.sha}\` from tested deployment ${deploymentUrl(url)}.\n`, { flag: 'a' })
  }
  throw new Error('Unknown release command')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2], process.argv[3]).catch((error) => { console.error(error.message); process.exitCode = 1 })
}
