# Frontend CI/CD

## Inspected state

Prepared on 10 November 2026 in `exil-type-portfolio-public`, the independent
checkout of `Vlacno/exil-type-portfolio`. The original historical directory was
not edited. The repository currently has one branch, `main`.

The existing workflow only ran checks. GitHub reported its latest check failed
on `tests/cms/typefaces.spec.js:84`: the paired heading exceeded its container
in Linux Chromium. Vercel nevertheless reported a successful deployment of the
same commit (`8afb187`). Its Git integration therefore bypasses the test gate.
See the [failed Actions job](https://github.com/Vlacno/exil-type-portfolio/actions/runs/42907639456/job/130149704707)
and the [Vercel commit status](https://api.github.com/repos/Vlacno/exil-type-portfolio/commits/8afb18773079a1434fa32fad8603c39c2cd2b56f/status).
The existing assertion and application layout have not been changed.

No local Vercel project link/configuration or Vercel credentials were present.
The GitHub status identifies `baronbaks-projects/exil-type-portfolio`; the cloud
project ID, team ID, environment values, domains and account settings cannot be
confirmed from that public status. No Vercel dashboard/API settings were changed.
The disabled automatic domain-assignment setting is the user's stated setup.

## Pipeline

Only pushes to `main` trigger this workflow. There is no staging branch, PR
release workflow, deployment hook or workflow-run chain.

1. Check out the push's exact SHA with no persisted credentials; install the
   frontend lockfile with lifecycle scripts disabled. Actions use full commit
   pins and Node 24; Vercel CLI is pinned to 65.14.0 in the release job only.
2. Run ESLint, offline maintenance/release-guard tests, and one Vite production
   build with `VITE_CONTENT_SOURCE=sanity` and all four section overrides set to
   `sanity`. No cloud environment file or token is pulled into the build.
3. Run the existing desktop/mobile E2E matrix, CMS fixtures, SDK tests and mobile
   WebKit CMS tests. These use their existing isolated local/mock settings.
   A new Playwright suite uses `vite preview` against the actual production
   build, verifying all four sections use the independent published-data SDK
   rather than local fallback. All cloud responses are intercepted in tests.
4. Package this exact `dist` as Vercel Build Output API v3 static files, without
   changing the website's hash routing. Record its SHA, repository and SHA-256
   file inventory outside public static output. Upload only that release archive,
   never project credentials, environment files, dependencies or Studio.
5. The release job depends on all verification succeeding. Read the live main
   SHA before deployment, reject stale commits, and verify artifact identity and
   every packaged file hash. Create a CI-only link from GitHub Secrets.
6. Look for an existing production deployment of this repository/commit. Reuse a
   single READY deployment only if its artifact digest also matches. Pending,
   failed, ambiguous, changed-artifact or incomplete results stop rather than
   create a duplicate. An absent candidate is uploaded once with
   `vercel deploy --prebuilt --prod --skip-domain`.
7. Fetch the immutable staged deployment's HTML, scripts, styles, images, fonts
   and license files and compare them with the verified inventory. Redirects,
   deployment-protection login pages, HTTP errors and mismatched bytes block
   promotion. The required automation-bypass secret is sent only as an HTTP
   header to that immutable Vercel host, never to the CMS or through redirects.
8. Recheck main immediately before `vercel promote <same URL>`. This explicitly
   assigns production domains even when automatic assignment is disabled. An
   already-current deployment is not promoted again. Verify the project's
   production target and record SHA/URL in the GitHub job summary.

Vite runs once. Existing dev-server browser suites do not create extra production
builds. `--prebuilt` uploads already-built files; promoting a staged production
deployment does not rebuild. A new workflow attempt still runs verification;
if its output matches an existing deployment, deployment is reused. If the CLI
request outcome is uncertain, inspect Vercel before retrying. There is no automatic
retry of deploy/promote commands or silent replacement of a failed candidate.

## Required GitHub setup

Create a GitHub Actions environment named `production`. Restrict its deployment
branch to `main`. To keep promotion automatic, do not require manual reviewers or
wait timers for that environment. Put these secrets in that environment:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | New portfolio/team-scoped Vercel token with project-read, deployment-read/list, deployment-create and production-promotion permission. Use an expiry and rotate it; never reuse customer credentials. |
| `VERCEL_ORG_ID` | Owner/team ID of the independent Vercel project. |
| `VERCEL_PROJECT_ID` | Independent frontend project ID, not a project name or the Sanity project ID. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Required for this protected staging pipeline and checked before deployment. Use the project's Protection Bypass for Automation secret. |

`GITHUB_TOKEN` is supplied by Actions with `contents: read`. No personal GitHub
token, Sanity token, CMS import token or `VITE_*` secret is needed. Vercel IDs
are identifiers, but stored as GitHub Secrets as requested. Secrets are not
available to the verification/build job. Failed browser checks upload diagnostics.

Keep `main` as the only long-lived branch. Restrict who can push to main and edit
workflows, disable force pushes/deletion, and use the least Actions permissions.
No branches, rules or environment settings were changed during preparation.

## Required Vercel setup before the first push

1. Verify the secrets refer to the independent frontend project in the intended
   team. Root Directory: repository root; Node: 24.x; framework: Vite; build
   command: `npm run build`; output: `dist`; install: `npm ci --ignore-scripts`.
   These settings support manual diagnosis; the workflow uploads prebuilt static
   output and does not request a remote build or deploy Studio.
2. Disable automatic Git deployments for this project before enabling the
   Actions release. The committed `vercel.json` sets
   `git.deploymentEnabled: false` for all branches; this replaces deprecated
   `github.enabled`. Do not leave a second workflow, deploy hook, integration or
   separate repository deploying the same project. Disable/remove unused hooks
   in the dashboard after review. No such cloud change has been performed here.
   Disable Rolling Releases and resolve any pending promotion before activation;
   the release helper rejects these states instead of queueing a later domain change.
3. Production branch: `main`. Keep Auto-assign Custom Production Domains **off**.
   Check production domains/DNS belong to this independent portfolio project.
   The workflow's `--skip-domain` also explicitly stages without domain assignment;
   `promote` is the only release step that changes the current production target.
4. Keep Production `VITE_CONTENT_SOURCE=sanity`; set section overrides to `sanity`
   or remove conflicting local overrides. The workflow explicitly fixes those
   public values at build time and does not download Vercel environment files.
   New build-time variables must be reviewed and added to CI deliberately.
5. If staging URLs are protected, configure Protection Bypass for Automation and
   the required GitHub production-environment secret. Preflight rejects an empty
   value before staging. Do not disable protection just to pass the check.
6. Confirm the production origin already has the required independent Sanity
   access/CORS configuration. It was not changed. Live content/CORS availability
   is not proven by mocked browser tests; staged static-file checks do not write
   CMS data. Studio publication remains a separate process.

## Deployment discovery

`release.js lookup` verifies the configured project/owner and uses the read-only
Vercel deployment API with explicit project and team IDs plus repository/commit
metadata. It avoids CLI account/team display lookup, which failed with
PROJECT_UNAUTHORIZED in commit `0032fa9` despite a successful scoped project read.
The token must allow deployment listing. An authorization/network/invalid-response
error blocks release; it is never converted into an empty result or a duplicate
upload. See [RELEASE_DISCOVERY_REPORT.md](RELEASE_DISCOVERY_REPORT.md) for evidence,
regression coverage and the limits of the non-debug log diagnosis.

## Concurrency and limits

New main pushes cancel an older verification job. Release jobs use a separate
shared concurrency group with cancellation disabled, so an accepted external
promotion is not interrupted and an older release cannot complete after a newer
release has already promoted through this workflow. Queue order is not relied
on: the current remote main SHA is checked before both mutations. Stale reruns
fail closed; a failed newest commit never causes an older commit to be released.

GitHub and Vercel do not offer a transaction spanning a branch ref and a deployment
request. A push arriving after the final SHA check or after Vercel accepts a
request cannot revoke that in-flight operation. The serialization prevents a
later successful production release being overwritten by an older workflow;
absolute instantaneous cancellation on every push would require a coordinated
external release controller. Keep manual/dashboard releases and other deployment
clients out of this pipeline. Test/CLI failure leaves the previous production
version active unless a promotion request had already been accepted; inspect the
project before retries or rollback. Never add an automatic rollback on cancellation.

## Validation and activation

Prepared locally only. No commit, push, workflow dispatch, deploy, promote or
cloud configuration write was performed. Application source, existing tests,
Sanity schemas/data, dependencies/locks, fonts and design were preserved.

| Local check | Result |
| --- | --- |
| actionlint 1.7.12 | Passed |
| Vercel Git config against official property schema | Passed |
| Pinned Vercel CLI help/version | Proposed flags supported |
| ESLint, including after packaging | Passed |
| CMS-mode Vite build | Passed |
| Release packaging/identity/SHA-256 checks | Passed locally; no cloud project link created |
| E2E desktop/mobile matrix | 101 passed; 4 intentional skips |
| CMS fixtures | 73 passed |
| SDK transport | 8 passed |
| CMS mobile WebKit | 16 passed |
| Actual production CMS build, desktop/mobile | 8 passed |
| Offline maintenance plus release guards | 39 passed |
| git diff --check | Passed |

In total, 206 browser tests and 39 offline tests passed. Browser checks ran on
Windows with CI-like settings, temporary localhost servers and configurations;
repository test definitions were not weakened or changed. The new built-output
suite was added separately. No production domain or live CMS was contacted by
these tests. The generated `.vercel/output` is ignored by both Git and ESLint so
local rechecks do not lint compiled bundles.

Changed files: `.github/workflows/ci.yml`, `.github/scripts/release.js`,
`.github/scripts/release.test.js`, `vercel.json`, `playwright.release.config.js`,
`tests/release/cms-build.spec.js`, `eslint.config.js`, `README.md`, and this guide.
All existing application, CMS schema, test-definition, font, asset and lockfile
hashes match the task baseline. The original historical project and this
repository's Git index/HEAD/config were preserved.

The public Vercel schema currently declares an older schema draft while some
unrelated function/service definitions use newer keywords. Validation therefore
used its official `git` property definition for every setting in this minimal
`vercel.json`; no application/function/service settings were added. GitHub/Linux
and authenticated Vercel deployment/promotion still need their first controlled
run after the secrets/settings are configured and publication is authorized.
The existing Linux paired-heading test failure remains a release blocker if it
recurs; this workflow does not ignore or weaken it. A subsequent local fitting
correction and regression tests are documented in [HERO_FIT_REPORT.md](HERO_FIT_REPORT.md).
The unchanged assertion reproduced on the existing Linux commit; the local fix
still needs confirmation on the next authorized Linux run.

## Official references

- [Vercel staged production deployment](https://vercel.com/docs/cli/deploying-from-cli)
- [Vercel promotion](https://vercel.com/docs/cli/promote)
- [Disabling Git deployments](https://vercel.com/docs/project-configuration/git-configuration)
- [Static Build Output API files](https://vercel.com/docs/build-output-api/primitives)
- [Build Output API configuration](https://vercel.com/docs/build-output-api/configuration)
- [Deployment lookup metadata](https://vercel.com/docs/cli/list)
- [Automation protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
- [GitHub job concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

## Staging protection investigation: run #4 (11 November 2026)

[Run 43093900605](https://github.com/Vlacno/exil-type-portfolio/actions/runs/43093900605)
verified commit `1ae195d70567859c787fed5a28ba8910756efd3d` and created the
READY staged deployment
`https://exil-type-portfolio-headaa6rp-baronbaks-projects.vercel.app`.
Promotion was never reached.

The complete release-job log shows the CLI warning that Vercel Authentication
is enabled and the smoke step's `VERCEL_AUTOMATION_BYPASS_SECRET` environment
value is empty. The Vercel API token authenticates deployment-management API
calls; it does not authenticate ordinary requests to a protected deployment.

A read-only GET of the failing
`/assets/1-C6xQYD2F.jpg` returned HTTP 302 to Vercel's `/sso-api`, with
`Content-Type: text/plain` and a 263-byte authentication redirect body,
not JPEG bytes. The patched checker reproduced this and reported
`Vercel Authentication redirect blocked; no hash comparison performed`.
The original checker combined HTTP failure and SHA-256 mismatch into the same
error. Its historical HTTP status, headers and response digest were not logged;
the current 302 must not be represented as that missing historical measurement.

Deployment protection with a missing automation credential is the confirmed
access blocker. There is no observed JPEG response demonstrating CDN image
transformation or corrupted stored bytes. Fix authentication before assessing
any remaining artifact mismatch; no image replacement or recompression is justified.

### Byte-comparison evidence and limits

- The run downloaded artifact `13889204403`,
  `portfolio-1ae195d70567859c787fed5a28ba8910756efd3d-1`. GitHub's metadata
  and the release log agree on ZIP SHA-256
  `5b43cee51f82934fc75d43a0810d27158ae8314b434a2e96c8b1450b94ed925c`.
  The log confirms that `release.js verify` validated its commit identity,
  inventory and file hashes before upload.
- The local source JPEG, local Vite output `assets/1-C6xQYD2F.jpg` and the
  pre-existing local packaged asset have identical SHA-256
  `fbbd68a1c46be968b93d062a273560b83a6a11340fbe86cce6c85190dd1732cd`;
  the JPEG is 335,847 bytes. This is local evidence, not a fresh CI-artifact
  extraction: the pre-existing local release manifest identifies commit
  `8afb18773079a1434fa32fad8603c39c2cd2b56f`.
- Attempts to download this run's ZIP through the GitHub connector timed out;
  no archive was successfully extracted during this investigation.
- Protected staging returned authentication bytes, so the actual deployed
  JPEG could not be retrieved. An exact CI-file-versus-stored-JPEG hash
  comparison initially required both artifact retrieval and authorized staging
  access. The follow-up below resolves access; the CI archive remains unavailable.

### Prepared correction and required configuration

The release environment now supplies `VERCEL_AUTOMATION_BYPASS_SECRET` to the
preflight as well as the smoke check. All preflights require it before creating
a deployment or promoting one, since this project's staged URLs are protected.
Populate that secret in GitHub's `production` environment (or an accessible
repository secret) with an existing, valid Protection Bypass for Automation
value from this independent Vercel project. Never use a customer token, a Vercel
API token as the bypass value, or a `VITE_*` variable for the credential.

No secret was generated, reset or copied during this work. Use an existing
secret compatible with the staged deployment; changing/revoking secrets can
affect existing deployments. Do not disable deployment protection or rerun the
release workflow just to diagnose access: that workflow can promote. Once
authorized access is available, perform only an isolated `smoke` check against
the existing immutable URL and the downloaded, verified artifact.

The checker now reports HTTP status separately from expected/received SHA-256
and byte count. Redirects are inspected with `redirect: 'manual'` and always
rejected; none are followed. Bypass values remain request headers only.
Provider bodies, raw errors and redirect URLs/query strings are not logged.
Every static file, including images, fonts and licenses, still requires the
original exact SHA-256. Scoped discovery/reuse, artifact identity checks,
live-main guards, serial releases and explicit promotion remain intact.

Validation: ESLint passed; 14 release regression tests passed; all 50 offline
maintenance/release tests passed; actionlint passed. Coverage includes all
static asset categories, authentication failures, blocked redirects, changed
JPEG bytes, HTML masquerading as an asset, and safe error diagnostics.
No application, CMS, asset, dependency or Git metadata changes were made.
No commit, push, workflow rerun, deployment or promotion was performed.

### Follow-up: authenticated read-only image check

After the owner created the automation bypass and supplied it through the ignored
`.env.release.local`, a header-authenticated GET of the same immutable image URL
returned HTTP 200, `Content-Type: image/jpeg`, and 335,847 bytes. Its SHA-256 was
`fbbd68a1c46be968b93d062a273560b83a6a11340fbe86cce6c85190dd1732cd`, exactly
matching the local built JPEG byte for byte. The authentication blocker is
resolved for this read-only request; there is no observed byte transformation
or corruption of this image relative to the local build.

The GitHub artifact download still timed out. This follow-up does not establish
equality with the exact run #4 archive or claim that every staged file passed
its CI manifest. The GitHub secret's value cannot be read back, so local success
does not independently verify that GitHub contains the same value.

The secret was not printed or added to tracked files. Only an authenticated GET
was sent to the existing immutable deployment. No release job was rerun, and no
deploy, promotion, commit or push was performed.
