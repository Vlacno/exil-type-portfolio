import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { assertCurrent, deploymentUrl, inventory, readProject, selectDeployment, verifyArtifact, verifyHosted } from './release.js'

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
