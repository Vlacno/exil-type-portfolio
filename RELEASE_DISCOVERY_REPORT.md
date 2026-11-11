# Release discovery failure: 0032fa9

Date: 11 November 2026. Independent checkout: `exil-type-portfolio-public`.

## Evidence and cause

[The failed release job](https://github.com/Vlacno/exil-type-portfolio/actions/runs/43088570645/job/130762440054)
checked out `0032fa93fd73a5595a3915a14ec241917d249a2a` on Ubuntu 26.04.1,
Node 24.22.2 and Vercel CLI 65.14.0. Frontend verification passed. The release:

1. Passed its current-main/credential-presence preflight.
2. Downloaded and verified the exact commit's artifact and file hashes.
3. Executed `release.js link` successfully. This first makes an authenticated
   GET `/v9/projects/{projectId}?teamId={orgId}` and checks both returned IDs,
   repository root, rolling release and pending-promotion state.
4. Failed inside `vercel list` while retrieving the linked project, before the
   selection helper, upload, smoke check or promotion could run.

The exact CLI error maps to **PROJECT_UNAUTHORIZED**, raised for HTTP 403 with
`forbidden` or `team_unauthorized` during linked-project resolution. It is not a
JSON parse error or unrecognized-option error. The resolver performs both the
scoped project read and an additional `/teams/{orgId}` owner-metadata read.
A minimal `{orgId, projectId}` link is valid. With both Vercel IDs exported, the
resolver uses those environment IDs; adding a project name to the local file or
deleting `.vercel` does not address owner-read authorization.

The installed 65.14.0 linking implementation was exercised with injected API
mocks. A successful project read plus denied team metadata reproduced the exact
error/code. Setting `currentTeam` explicitly did not remove that lookup. Allowing
the team metadata read, with the same IDs and link contents, returned `linked`.
No real credentials were used in these reproductions.

**Conclusion:** the failing component is the CLI's linked-context authorization,
not the already-verified artifact or project-ID pair. The successful direct
project request makes the additional owner/team lookup the supported cause.
The original non-debug log does not include its denied URL or raw API error code,
so the precise live token entitlement cannot be proven from those logs. No claim
is made that the token has been introspected or its scopes changed. Project-read
success also does not prove deployment-list/create/promote permissions.

## Changes

- `.github/scripts/release.js`: added read-only `discoverDeployment`/`lookup`.
  Ownership is revalidated, then GET `/v6/deployments` receives explicit
  `projectId`, `teamId`, `target=production` and repository/commit metadata filters.
  This is the same deployment-list API used by the pinned CLI, without account
  or team-display metadata lookup. It does not download environment variables.
- The existing selector still requires a single READY production deployment
  with the exact repository, SHA and artifact digest. Pending, failed, ambiguous,
  incomplete or changed-artifact results block. No results are inferred from an
  error. An empty successful lookup clears only stale local selection state;
  a failed lookup preserves prior state but exits nonzero, blocking later steps.
- API errors now identify discovery and HTTP status without dumping provider
  response bodies or tokens. Invalid JSON fails with a stable diagnostic.
- `.github/workflows/ci.yml`: replaced CLI listing with `release.js lookup` and
  moved CLI installation after successful discovery. The CLI remains pinned for
  prebuilt upload and promotion. No `continue-on-error`, forced recreation,
  fallback deployment or automatic command retry was added.
- `.github/scripts/release.test.js`: added mocked API and actual helper-command
  regression coverage for explicit scopes, permission errors, invalid responses,
  duplicate protection, exact artifact reuse and stale-state handling.
- `DEPLOYMENT.md`: documented discovery and required read permissions.

## Checks and required settings

- No credential reset, directory deletion or project re-link is required for this
  change. Retain the existing independent project/team secrets that passed the
  direct identity check. Never remove `.vercel/output` to follow the generic
  CLI hint: it contains the verified artifact needed by this release.
- The existing token needs project-read, deployment-read/list, deployment-create
  and production-promotion permission in that owner/project. No additional
  team-display metadata permission is needed by the replacement discovery.
- If the new helper reports HTTP 401/403, inspect the existing token's access
  and configured owner/project; it must remain blocked until access is valid.
  The current evidence does not justify resetting credentials or expanding their
  scope indiscriminately. Upload/promotion access has not been exercised here.
- Keep Git auto-deployments disabled, automatic production-domain assignment off,
  the production GitHub environment restricted to main, and the existing bypass
  secret if staged URLs are protected. These settings were not changed.
- All verification jobs, commit freshness guards, serial release concurrency,
  artifact hashes, staged static-file verification, `--prebuilt --prod
  --skip-domain`, explicit promotion and duplicate checks remain enforced.
- No release job was rerun: rerunning it could reach deployment, which was not
  authorized. An authenticated end-to-end release remains for a later authorized
  run; mocked tests are not a claim that live cloud permissions have been proven.

## Validation

ESLint, actionlint 1.7.12 and all 42 offline maintenance/release safety tests passed.
Tests use fake API responses and synthetic tokens. No live deployment, promotion,
credential reset, Git commit, push, dependency/lockfile update, application change
or CMS write was performed. The existing frontend passed GitHub verification for
this exact commit; browser tests/builds were not repeated for release-only changes.
Original historical project and Git index/HEAD/config were preserved.

## Sources

- [CLI linked-project resolver](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/projects/link.ts)
- [CLI team metadata lookup](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/projects/get-org-by-id.ts)
- [CLI project lookup](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/projects/get-project-by-id-or-name.ts)
- [CLI scoped deployment query](https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/list/index.ts)
- [Vercel deployment-list API](https://vercel.com/docs/rest-api/deployments/list-deployments)

Upstream links are explanatory; the local reproduction used the installed
65.14.0 package rather than assuming the current main branch is identical.
