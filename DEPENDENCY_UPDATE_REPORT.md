# Dependency security update

Date: 10 November 2026. Node 24.13.1; npm 11.10.1. Separate frontend and Studio lockfiles were reviewed against the npm registry.

## Results

| Scope | Before | After |
| --- | --- | --- |
| Frontend | 7 (3 high, 4 moderate) | 0 |
| Studio | 19 (3 high, 16 moderate) | 0 |

No critical findings were present. Counts include affected parent packages; they are not counts of independent advisories. Zero findings means no currently reported npm advisories for these resolved trees, not a guarantee against undiscovered vulnerabilities.

## Targeted updates

| Tree | Package | Before | After |
| --- | --- | --- | --- |
| Frontend | Vite | 8.1.5 | 8.3.7 |
| Frontend | source-map-js | 1.2.1 | 1.2.2 |
| Frontend | zod | 4.4.3 | 4.6.7 |
| Frontend | minimatch | 10.2.5 | 11.0.1 |
| Studio | js-yaml | 3.13.1 | 3.15.2 |
| Studio | smol-toml under @vercel/frameworks | 1.5.2 | 1.9.1 (deduplicated) |
| Studio | undici | 7.29.1 / 7.30.0 | 7.30.2 (deduplicated) |
| Studio | minimatch | 10.2.6 | 11.0.1 |
| Studio | uuid under typeid-js | 10.0.0 | 11.1.1 |

React, Sanity 6.18.0, ESLint 10.7.0 and the pinned frontend @sanity/client 8.9.0 were retained. Vite stayed on major 8; its direct minimum is now ^8.3.7. Its required CSS/bundler packages received compatible updates in the lockfile. No direct dependency was added. Lifecycle scripts were disabled during installation; no --force or automatic ESLint downgrade was used.

## Every original audit finding

### Frontend: 7 findings

| Package | Severity | Cause and disposition |
| --- | --- | --- |
| `@eslint/config-array` | moderate | `minimatch`. Resolved in the updated lockfile. |
| `@eslint/js` | moderate | `eslint`. Resolved in the updated lockfile. |
| `eslint` | moderate | `@eslint/config-array`; `minimatch`. Resolved in the updated lockfile. |
| `minimatch` | moderate | [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). Resolved in the updated lockfile. |
| `source-map-js` | high | [source-map-js allows event-loop denial of service through indexed source-map section offsets](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Resolved in the updated lockfile. |
| `vite` | high | [launch-editor: escapeCmdArgs() omits % escaping on Windows](https://github.com/advisories/GHSA-698v-4r3x-3vcv); [launch-editor: Editor CLI flag misinterpretation causing arbitrary command execution for some editors](https://github.com/advisories/GHSA-r825-w8mm-5pxw); [launch-editor: `fs.existsSync()` existence check can be bypassed on Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm); [Vite: Cross origin script execution through Vite custom middleware](https://github.com/advisories/GHSA-9jrq-w75r-8gcw); [Vite: Files outside `server.fs.allow` could be served when project paths match system paths on non-Windows machine](https://github.com/advisories/GHSA-rq7h-c2jc-7f22). Resolved in the updated lockfile. |
| `zod` | high | [Zod can exhaust memory while validating oversized constrained collections](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Resolved in the updated lockfile. |

### Studio: 19 findings

| Package | Severity | Cause and disposition |
| --- | --- | --- |
| `@module-federation/dts-plugin` | moderate | `undici`. Resolved in the updated lockfile. |
| `@module-federation/vite` | moderate | `@module-federation/dts-plugin`. Resolved in the updated lockfile. |
| `@oclif/core` | moderate | `minimatch`. Resolved in the updated lockfile. |
| `@oclif/plugin-help` | moderate | `@oclif/core`. Resolved in the updated lockfile. |
| `@oclif/plugin-not-found` | moderate | `@oclif/core`. Resolved in the updated lockfile. |
| `@sanity-labs/oclif-plugin-skills-flag` | moderate | `@oclif/core`. Resolved in the updated lockfile. |
| `@sanity/cli` | moderate | `@oclif/core`; `@oclif/plugin-help`; `@oclif/plugin-not-found`; `@sanity/cli-build`; `@sanity/cli-core`; `@sanity/runtime-cli`; `@sanity/workflow-cli`; `@vercel/frameworks`; `typeid-js`. Resolved in the updated lockfile. |
| `@sanity/cli-build` | moderate | `@oclif/core`; `@sanity/cli-core`. Resolved in the updated lockfile. |
| `@sanity/cli-core` | moderate | `@oclif/core`. Resolved in the updated lockfile. |
| `@sanity/runtime-cli` | moderate | `@oclif/core`; `@oclif/plugin-help`; `@sanity-labs/oclif-plugin-skills-flag`; `@sanity/cli-build`; `@sanity/cli-core`. Resolved in the updated lockfile. |
| `@sanity/workbench-cli` | moderate | `@module-federation/vite`; `@sanity/cli-core`. Resolved in the updated lockfile. |
| `@sanity/workflow-cli` | moderate | `@oclif/core`; `@oclif/plugin-help`; `@sanity/cli-core`. Resolved in the updated lockfile. |
| `@vercel/frameworks` | moderate | `js-yaml`; `smol-toml`. Resolved in the updated lockfile. |
| `js-yaml` | high | [js-yaml has prototype pollution in merge (<<)](https://github.com/advisories/GHSA-mh29-5h37-fv8m); [JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases](https://github.com/advisories/GHSA-h67p-54hq-rp68); [js-yaml: YAML merge-key chains can force quadratic CPU consumption](https://github.com/advisories/GHSA-52cp-r559-cp3m); [JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj); [js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources](https://github.com/advisories/GHSA-2883-xcg3-v3hh). Resolved in the updated lockfile. |
| `minimatch` | moderate | [minimatch has potential denial of service via globparts amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). Resolved in the updated lockfile. |
| `smol-toml` | high | [smol-toml: Denial of Service via TOML documents containing thousands of consecutive commented lines](https://github.com/advisories/GHSA-v3rj-xjv7-4jmq); [smol-toml: Denial of Service via malformed TOML documents](https://github.com/advisories/GHSA-7w5x-hrqm-74c2); [smol-toml: Quadratic-time parse() from parseKey rescanning to end of document on each key line](https://github.com/advisories/GHSA-r4xh-jqrq-34v2). Resolved in the updated lockfile. |
| `typeid-js` | moderate | `uuid`. Resolved in the updated lockfile. |
| `undici` | high | [undici vulnerable to Denial of Service via unbounded memory in the EventSource parser](https://github.com/advisories/GHSA-4qv8-2p9j-2685); [undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens](https://github.com/advisories/GHSA-f72v-6w45-q472); [undici vulnerable to Denial of Service via unhandled error on excessive content-encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c); [undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects](https://github.com/advisories/GHSA-4w7w-5xrc-9h26); [undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent](https://github.com/advisories/GHSA-2m5v-pch6-74hx); [undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm); [undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering](https://github.com/advisories/GHSA-9fm3-97px-rjf6); [undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor](https://github.com/advisories/GHSA-55wc-3pg8-jfw6). Resolved in the updated lockfile. |
| `uuid` | moderate | [uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Resolved in the updated lockfile. |

## Compatibility and residual risks

- Scoped overrides apply minimatch 11.0.1 only to ESLint/config-array and @oclif/core. The [upstream changelog](https://github.com/isaacs/minimatch/blob/main/changelog.md) lists removed makeRe/AST/internal methods and changed glob edge cases. Installed consumers were inspected: they use Minimatch.match, pattern and minimatch(), not the removed APIs. Lint and Sanity command discovery/build exercise those callers. Reassess the overrides when upstream supports a patched dependency natively.
- typeid-js still requests uuid 10. Its scoped override uses the patched CommonJS-compatible uuid 11.1.1, avoiding the CommonJS removal in uuid 12. The [uuid changelog](https://github.com/uuidjs/uuid/blob/main/CHANGELOG.md) describes changed option/state semantics in v11. The installed caller uses v7(undefined, buffer), stringify and validate; 1,000 unique IDs and UUID roundtrips passed. No IDs or documents were created in Sanity.
- @vercel/frameworks pins vulnerable parsers even in its latest inspected release; overrides stay within js-yaml 3 and smol-toml 1. This is transitive Sanity CLI framework detection, not a configured Vercel deployment.
- @module-federation/dts-plugin pins undici; a scoped 7.30.2 override retains major 7. Other Studio undici consumers update within their existing ranges.
- Most affected packages are development/build/CLI tooling. Untrusted patterns, documents and network responses can still matter during local development or CI. Studio tools were never exposed publicly and no exploit was executed.
- Necessary transitive major overrides carry upstream compatibility risk despite passing local checks; no application API, schema, UI or functionality was intentionally changed. No remaining known vulnerabilities were reported by either full audit.

## Validation

| Check | Result |
| --- | --- |
| Separate full npm audit (frontend) | 0 vulnerabilities; exit 0 |
| Separate full npm audit (Studio) | 0 vulnerabilities; exit 0 |
| npm run lint | Passed |
| npm run build | Passed with Vite 8.3.7 |
| npm run studio:build | Passed with Sanity 6.18.0 |
| Full E2E matrix: Chromium, Firefox, WebKit, mobile Chrome/Safari | 101 passed; 4 intentional viewport-matrix skips; no retries/failures |
| CMS tests | 73 passed |
| SDK transport tests | 8 passed |
| Additional CMS mobile WebKit suite | 16 passed |
| Offline migration/publication/URL-patch tests | 34 passed |
| typeid-js/uuid compatibility smoke check | 1,000 unique IDs; all UUID roundtrips passed |
| Sanity CLI command discovery | Passed |
| npm ls --all in both trees | Passed; no invalid dependencies |
| Clean npm ci --ignore-scripts --no-audit installs in two temporary directories | Passed: frontend 156 packages; Studio 892 packages |
| Baseline hash comparison | Only the four dependency files and publication audit changed; this report is new |
| git diff --check | Passed |

Playwright ran the existing test definitions with temporary configurations and isolated localhost Vite servers. CMS responses were intercepted or external requests blocked. No project test configurations were edited. All temporary test servers were closed.

The first sandboxed Studio build failed during OS user lookup (uv_os_get_passwd ENOMEM); the same build passed outside the sandbox with telemetry disabled. npm also warned that an obsolete Rolldown native binary directory was locked during cleanup; the active build and both clean temporary installs passed. No unrelated running process was stopped.

The registry audits used full dependency trees (not --omit=dev). Commands: npm audit --json and npm audit --prefix studio --json. Update commands used npm update vite source-map-js zod --ignore-scripts and npm update undici --prefix studio --ignore-scripts, after adding the scoped overrides. Both package-lock.json files were regenerated by npm. Temporary clean installs verified that the committed file candidates are reproducible without relying on the previous node_modules directories.

## Scope

Changed: package.json, package-lock.json, studio/package.json, studio/package-lock.json, this report and the dependency status in PUBLICATION_AUDIT.md. Existing application files, Header.jsx/Header.css edits, schemas, assets, font licenses, test definitions, infrastructure configuration, environment and Git metadata were preserved. No commit, push, deployment or cloud data write was performed.

Unrelated publication blockers concerning customer/content/asset rights and exporting without old Git history still apply; see [PUBLICATION_AUDIT.md](PUBLICATION_AUDIT.md).
