import test from 'node:test'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { assertCurrent, deploymentUrl, discoverDeployment, inventory, readProject, selectDeployment, verifyArtifact, verifyHosted } from './release.js'

const env = { GITHUB_REPOSITORY: 'example/portfolio', GITHUB_SHA: 'a'.repeat(40), GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push', GH_TOKEN: 'synthetic-test-token' }
const release = { sha: env.GITHUB_SHA, repository: env.GITHUB_REPOSITORY, digest: 'artifact-hash' }
const deployment = { target: 'production', state: 'READY', url: 'portfolio-tested.vercel.app', meta: { portfolioRepository: release.repository, githubCommitSha: release.sha, portfolioBuild: release.digest } }

test('release gate accepts only the live main push SHA and fails closed on API errors', async () => {
  const request = async (url, options) => { assert.equal(url, 'https://api.github.com/repos/example/portfolio/git/ref/heads/main'); assert.equal(options.redirect, 'error'); return Response.json({ object: { sha: env.GITHUB_SHA } }) }
  await assertCurrent(env, request)
  await assert.rejects(assertCurrent(env, async () => Response.json({ object: { sha: 'b'.repeat(40) } })), /Superseded/)
  await assert.rejects(assertCurrent(env, async () => new Response('', { status: 403 })), /HTTP 403/)
  await assert.rejects(assertCurrent({ ...env, GITHUB_REF: 'refs/heads/other' }, request), /main push/)
  await assert.rejects(assertCurrent({ ...env, GITHUB_EVENT_NAME: 'pull_request' }, request), /main push/)
})

test('deployment reuse prevents duplicate artifacts, pending retries and ambiguous selection', () => {
  assert.deepEqual(selectDeployment({ deployments: [deployment] }, release), { url: 'https://portfolio-tested.vercel.app' })
  assert.equal(selectDeployment({ deployments: [] }, release), null)
  assert.throws(() => selectDeployment({ deployments: [deployment], pagination: { next: 123 } }, release), /Incomplete/)
  assert.throws(() => selectDeployment({ deployments: [deployment, deployment] }, release), /Multiple/)
  assert.throws(() => selectDeployment({ deployments: [{ ...deployment, state: 'BUILDING' }] }, release), /not ready/)
  assert.throws(() => selectDeployment({ deployments: [deployment] }, { ...release, digest: 'different-build' }), /different artifact/)
})

test('deployment URLs cannot redirect automation credentials to other origins', () => {
  for (const url of ['https://example.org', 'https://portfolio.vercel.app.evil.org', 'https://user:password@portfolio.vercel.app', 'https://portfolio.vercel.app/path', 'https://portfolio.vercel.app/?secret=value', 'http://portfolio.vercel.app']) assert.throws(() => deploymentUrl(url))
  assert.equal(deploymentUrl('portfolio-tested.vercel.app'), 'https://portfolio-tested.vercel.app')
})

test('artifact verification rejects edits and remote mismatches without writes or real network', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-release-test-'))
  try {
    await mkdir(path.join(root, '.vercel/output/static'), { recursive: true })
    await writeFile(path.join(root, '.vercel/output/static/index.html'), '<h1>CMS build</h1>')
    const files = await inventory(path.join(root, '.vercel/output'))
    const metadata = { ...release, contentSource: 'sanity', files, digest: createHash('sha256').update(JSON.stringify(files)).digest('hex') }
    await writeFile(path.join(root, '.vercel/release.json'), JSON.stringify(metadata))
    await writeFile(path.join(root, '.vercel/deployment.json'), JSON.stringify({ url: 'https://portfolio-tested.vercel.app' }))
    await verifyArtifact(root, env)
    await assert.rejects(verifyArtifact(root, { ...env, GITHUB_SHA: 'b'.repeat(40) }), /identity/)
    const request = async (url, options) => { assert.equal(url, 'https://portfolio-tested.vercel.app/'); assert.equal(options.redirect, 'error'); assert.equal(options.headers['x-vercel-protection-bypass'], 'synthetic-bypass'); return new Response('<h1>CMS build</h1>') }
    await verifyHosted(root, { ...env, VERCEL_AUTOMATION_BYPASS_SECRET: 'synthetic-bypass' }, request)
    await assert.rejects(verifyHosted(root, env, async () => new Response('Wrong build')), /verification failed/)
    await writeFile(path.join(root, '.vercel/output/static/index.html'), 'Changed')
    await assert.rejects(verifyArtifact(root, env), /content mismatch/)
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    assert.ok(path.basename(root).startsWith('portfolio-release-test-'))
    await rm(root, { recursive: true, force: true })
  }
})

test('project ownership and root-directory checks reject a wrong Vercel target before linking', async () => {
  const target = { VERCEL_PROJECT_ID: 'prj_test', VERCEL_ORG_ID: 'team_test', VERCEL_TOKEN: 'synthetic-test-token' }
  const project = { id: 'prj_test', accountId: 'team_test', rootDirectory: null }
  const request = async (url) => { assert.equal(url, 'https://api.vercel.com/v9/projects/prj_test?teamId=team_test'); return Response.json(project) }
  assert.deepEqual(await readProject(target, request), project)
  await assert.rejects(readProject(target, async () => Response.json({ ...project, accountId: 'team_other' })), /owner/)
  await assert.rejects(readProject(target, async () => Response.json({ ...project, id: 'prj_other' })), /project/)
  await assert.rejects(readProject(target, async () => Response.json({ ...project, rootDirectory: 'studio' })), /Root Directory/)
  await assert.rejects(readProject(target, async () => Response.json({ ...project, rollingRelease: { stages: [] } })), /Rolling Releases/)
  await assert.rejects(readProject(target, async () => Response.json({ ...project, lastAliasRequest: { jobStatus: 'pending' } })), /queued/)
})


test('deployment discovery uses only explicit project/team-scoped GETs and reuses the exact verified artifact', async () => {
  const target = { VERCEL_PROJECT_ID: 'prj_test', VERCEL_ORG_ID: 'team_test', VERCEL_TOKEN: 'synthetic-test-token' }
  const calls = []
  const request = async (value, options) => {
    const url = new URL(value)
    calls.push(url.pathname)
    assert.equal(url.origin, 'https://api.vercel.com')
    assert.equal(options.method || 'GET', 'GET')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, `Bearer ${target.VERCEL_TOKEN}`)
    assert.equal(url.searchParams.get('teamId'), target.VERCEL_ORG_ID)
    assert.equal(url.searchParams.has('token'), false)
    if (url.pathname === '/v9/projects/prj_test') return Response.json({ id: 'prj_test', accountId: 'team_test', rootDirectory: null })
    assert.equal(url.pathname, '/v6/deployments')
    assert.equal(url.searchParams.get('projectId'), target.VERCEL_PROJECT_ID)
    assert.equal(url.searchParams.get('target'), 'production')
    assert.equal(url.searchParams.get('meta-portfolioRepository'), release.repository)
    assert.equal(url.searchParams.get('meta-githubCommitSha'), release.sha)
    return Response.json({ deployments: [{ ...deployment, state: undefined, readyState: 'READY' }], pagination: { next: null } })
  }
  assert.deepEqual(await discoverDeployment(release, target, request), { url: 'https://portfolio-tested.vercel.app' })
  assert.deepEqual(calls, ['/v9/projects/prj_test', '/v6/deployments'])
})

test('discovery permission errors and incomplete results block rather than authorize duplicate deployments', async () => {
  const target = { VERCEL_PROJECT_ID: 'prj_test', VERCEL_ORG_ID: 'team_test', VERCEL_TOKEN: 'synthetic-test-token' }
  const project = { id: 'prj_test', accountId: 'team_test', rootDirectory: null }
  const respond = (response) => async (url) => url.includes('/v9/projects/') ? Response.json(project) : response()
  for (const status of [401, 403, 500]) {
    await assert.rejects(discoverDeployment(release, target, respond(() => Response.json({ error: { message: 'provider-body-must-not-leak' } }, { status }))), (error) => error.message.includes(`Deployment discovery (check deployment-read permission for the configured project/team) failed: HTTP ${status}`) && !error.message.includes('provider-body-must-not-leak'))
  }
  await assert.rejects(discoverDeployment(release, target, respond(() => { throw new Error('network unavailable') })), /network unavailable/)
  await assert.rejects(discoverDeployment(release, target, respond(() => new Response('provider-body-must-not-leak'))), /Deployment discovery.*returned invalid JSON/)
  await assert.rejects(discoverDeployment(release, target, respond(() => Response.json(null))), /Incomplete/)
  await assert.rejects(discoverDeployment(release, target, respond(() => Response.json({ deployments: [], pagination: { next: 123 } }))), /Incomplete/)
  await assert.rejects(discoverDeployment(release, target, respond(() => Response.json({ deployments: [deployment, deployment] }))), /Multiple/)
  await assert.rejects(discoverDeployment(release, target, respond(() => Response.json({ deployments: [{ ...deployment, state: 'BUILDING' }] }))), /not ready/)
  await assert.rejects(discoverDeployment({ ...release, digest: 'different-artifact' }, target, respond(() => Response.json({ deployments: [deployment] }))), /different artifact/)
  assert.equal(await discoverDeployment(release, target, respond(() => Response.json({ deployments: [], pagination: { next: null } }))), null)
  let requestedList = false
  await assert.rejects(discoverDeployment(release, target, async (url) => {
    if (url.includes('/v6/deployments')) requestedList = true
    return Response.json({ ...project, accountId: 'team_other' })
  }), /owner/)
  assert.equal(requestedList, false)
})

test('lookup CLI preserves verified files, removes stale selection, and stops safely on denied discovery', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'portfolio-lookup-test-'))
  try {
    await mkdir(path.join(root, '.vercel/output/static'), { recursive: true })
    await writeFile(path.join(root, '.vercel/output/static/index.html'), 'Verified CMS build')
    const files = await inventory(path.join(root, '.vercel/output'))
    const metadata = { ...release, contentSource: 'sanity', files, digest: createHash('sha256').update(JSON.stringify(files)).digest('hex') }
    await writeFile(path.join(root, '.vercel/release.json'), JSON.stringify(metadata))
    const state = path.join(root, '.vercel/deployment.json')
    await writeFile(state, JSON.stringify({ url: 'https://stale-selection.vercel.app' }))
    const mock = path.join(root, 'mock-fetch.mjs')
    await writeFile(mock, `
      globalThis.fetch = async (value, options = {}) => {
        if ((options.method || 'GET') !== 'GET') throw new Error('Test forbids API mutations');
        const url = new URL(value);
        if (url.origin !== 'https://api.vercel.com' || url.searchParams.get('teamId') !== 'team_test') throw new Error('Unexpected API scope');
        if (url.pathname === '/v9/projects/prj_test') return Response.json({ id: 'prj_test', accountId: 'team_test', rootDirectory: null });
        if (url.pathname !== '/v6/deployments' || url.searchParams.get('projectId') !== 'prj_test') throw new Error('Unexpected API request');
        if (process.env.MOCK_DISCOVERY === 'deny') return new Response('', { status: 403 });
        return Response.json({ deployments: process.env.MOCK_DISCOVERY === 'found' ? [{ target: 'production', readyState: 'READY', url: 'portfolio-tested.vercel.app', meta: { portfolioRepository: ${JSON.stringify(release.repository)}, githubCommitSha: ${JSON.stringify(release.sha)}, portfolioBuild: ${JSON.stringify(metadata.digest)} } }] : [], pagination: { next: null } });
      };
    `)
    const script = path.resolve('.github/scripts/release.js')
    const run = (mode) => spawnSync(process.execPath, ['--import', pathToFileURL(mock).href, script, 'lookup'], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, ...env, VERCEL_TOKEN: 'synthetic-test-token', VERCEL_ORG_ID: 'team_test', VERCEL_PROJECT_ID: 'prj_test', MOCK_DISCOVERY: mode },
    })
    assert.equal(run('empty').status, 0)
    await assert.rejects(readFile(state), { code: 'ENOENT' })
    assert.equal(run('found').status, 0)
    const selected = await readFile(state, 'utf8')
    assert.deepEqual(JSON.parse(selected), { url: 'https://portfolio-tested.vercel.app' })
    const denied = run('deny')
    assert.equal(denied.status, 1)
    assert.match(denied.stderr, /Deployment discovery.*HTTP 403/)
    assert.equal(denied.stderr.includes('synthetic-test-token'), false)
    assert.equal(await readFile(state, 'utf8'), selected)
    assert.deepEqual(await inventory(path.join(root, '.vercel/output')), files)
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep))
    assert.ok(path.basename(root).startsWith('portfolio-lookup-test-'))
    await rm(root, { recursive: true, force: true })
  }
})
