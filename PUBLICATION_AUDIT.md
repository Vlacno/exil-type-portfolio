# Publication audit

Date: 10 November 2026. Scope: the current working tree, tracked/indexed text,
asset/font provenance, ignore rules, documentation and dependency lockfiles.
No Git history, index, remote or cloud data was changed.

**Publication is not yet cleared.** Resolve the rights findings
below before making the portfolio public. Dependency findings were subsequently
resolved; see [the dependency update report](DEPENDENCY_UPDATE_REPORT.md).
A copyright notice is not evidence
of permission to publish a customer's work or third-party content.

## Blockers and required decisions

| Priority | Location | Finding | Required action |
| --- | --- | --- | --- |
| Blocker | Original project source and retained branding | This is adapted from a commercial website. The repository does not contain evidence of permission to publish the source, design or customer branding. | Confirm the author's right to release the portfolio copy under its review-only terms and document any required customer consent. |
| Blocker | `src/pages/ResearchArticlePage.jsx`, `src/assets/` | Article text explicitly reserves Ilya Bazhanov's rights. Historical photographs, publication covers, the banner and logos have no verified redistribution record in the repository. | Confirm permission/public-domain status for each asset and the article, or prepare approved replacements. Preserve existing third-party credits. The new source-code copyright does not grant these rights. |
| Resolved | Root `package-lock.json` | The subsequent dependency update reduced 7 findings (3 high, 4 moderate) to zero. | Keep the updated lockfile and review the scoped overrides documented in [DEPENDENCY_UPDATE_REPORT.md](DEPENDENCY_UPDATE_REPORT.md). |
| Resolved | `studio/package-lock.json` | The subsequent dependency update reduced 19 findings (3 high, 16 moderate) to zero. | Keep the standalone Studio lockfile and review the scoped overrides documented in [DEPENDENCY_UPDATE_REPORT.md](DEPENDENCY_UPDATE_REPORT.md). |
| Required export boundary | Existing Git index/history | Eighteen deleted proprietary WOFF2 paths remain in the index; historical commits also contain earlier commercial font variants and deployment logic. Replacement assets and supporting files include untracked additions. | Follow [the fresh-repository guide](PUBLICATION.md). Export existing working files plus untracked additions; never publish/copy the old Git directory, clone its history or archive HEAD. |

Do not remove third-party notices merely to make the repository appear wholly
owned by the portfolio author. The independent Sanity project's public ID and
dataset name are configuration, not credentials or proof of content rights.

## Sensitive information review

- No confirmed literal credentials were found in the checked working-tree and
  index text. Pattern matches were synthetic test tokens and runtime variable
  references in the old indexed workflow. No full secret values were printed.
- No tracked environment/credential files, private-key files, dependency folders,
  build output or generated migration data were found in the current index.
  The local `.env.local` exists and is ignored; it must not enter the new copy.
- The working CI runs frontend checks with read-only repository permissions and
  no deployment/promote job, production token or persisted checkout credentials.
  The old indexed workflow is different, reinforcing the working-tree export rule.
- The current remote uses GitHub without embedded URL credentials. Its exact
  configuration was preserved; the new repository must use a separately chosen
  new remote after authorization.
- Source and documentation still contain public contact/branding and affiliation
  statements, including a customer-domain email in the footer. Review whether
  these should represent the independent portfolio. They were not silently
  rewritten as part of publication preparation.
- No GPS directories or local filesystem/email patterns were found in the
  checked image EXIF/XMP/PNG text metadata; SVG checks found no active scripts or
  local-path patterns. Original metadata was preserved. This is not a complete
  legal, OCR or forensic review of image contents.

The credential review used targeted patterns for common provider tokens,
private-key blocks, embedded URL credentials and literal credential assignments.
It is not a claim that every possible secret format or historical blob was
exhaustively analyzed. No claim is made that the old history is safe to publish.

## Fonts and third-party licenses

The working copy contains eight WOFF2 files for six families: Source Serif 4,
Inter, Unbounded, Roboto Condensed, Russo One and Ruslan Display. All eight hashes
match `src/assets/fonts/SOURCES.json`.

All six original OFL notices are present in `src/assets/fonts/<family>/OFL.txt`.
Each is byte-identical to its copy in `public/licenses/fonts/<family>/OFL.txt`.
These twelve license files and all font binaries were preserved.

No active commercial font declarations, preloads, binary paths or family settings
were found in current source. Two keyword matches in the local publication data
and import guide refer to a historical journal title, not a font family. That
bibliographic title was retained. Historical proprietary binaries remain only
in the old Git state, which must not be imported into the fresh repository.

`COPYRIGHT.md` reserves rights in the author's original source code for portfolio
review and requires written permission for commercial reuse. It explicitly
preserves third-party font and dependency licenses and does not claim ownership
of images, articles or branding.

## Ignore rules

Existing exclusions retain environment files (except `.env.example`), dependencies,
build output, Vercel/Studio state, Playwright output and generated migration files.
Additional rules exclude local cloud/SSH/agent state, npm credentials, common
private-key formats, coverage/cache files and local CMS exports.

Ignore rules do not remove already tracked files or sanitize Git history.
Font files, all license copies, source, tests, documentation and both lockfiles
must remain eligible for the fresh snapshot. A reviewable ignore-aware copy
procedure is provided in `PUBLICATION.md`.

## Original publication-preparation changes

- Replaced the root README with a concise project overview, architecture,
  React/Vite/Sanity setup, Playwright checks and the actual GitHub Actions/manual
  deployment workflow.
- Added `COPYRIGHT.md` with the requested 2026 author notice and third-party carve-outs.
- Hardened `.gitignore` without changing its font/license/source inclusions.
- Added `PUBLICATION.md` with a verified-path, per-file working-tree export and
  fresh-history instructions. These instructions were not executed.
- Added this audit. No application code, design, CMS schemas, infrastructure
  workflow, dependencies, assets or separate font licenses were changed.

## Original publication-preparation validation

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| Chromium E2E checks | 21 passed |
| CMS component checks | 73 passed |
| SDK transport checks | 8 passed |
| Offline import/publication/URL patch checks | 34 passed |
| Ignore-rule positive/negative checks | 58 passed; example env, fonts and licenses remain included |
| Proposed export manifest | 210 existing working-tree files; no forbidden history/font paths or missing required files |
| Fresh-repository PowerShell instructions | Five blocks passed syntax parsing; copy/init commands were not executed |
| Local Markdown links | No broken targets |
| Font hashes and license copies | Eight WOFF2 hashes match provenance; all six source/public/build license copies match |
| Existing Git config, HEAD and index hashes | Unchanged |
| Existing application, schema, workflow, dependency, environment and asset hashes | Unchanged |
| `git diff --check` | Passed |

Playwright used the existing Chromium test files with temporary configurations
and isolated localhost servers, leaving repository test configuration unchanged.
Fixtures intercepted or blocked external browser requests. No live CMS writes
or document reads were required for these tests. Temporary servers were closed.
The full multi-browser matrix was not rerun for these documentation/ignore-only
changes; the preceding language audit records its intermittent WebKit scroll
finding separately.

The original preparation audits queried the registry without changing either
lockfile. A subsequent controlled dependency update resolved those findings;
its validation and compatibility risks are recorded in
[DEPENDENCY_UPDATE_REPORT.md](DEPENDENCY_UPDATE_REPORT.md). The source scan
and proposed export manifest are evidence for this working-tree snapshot, not a
clearance to publish materials with unresolved redistribution rights.

No commit, staging, push, deployment, repository initialization, history removal,
remote modification, automatic dependency fix or CMS write was performed.
