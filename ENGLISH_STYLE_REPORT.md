# Technical English audit

## Outcome

Technical documentation and source comments now use English. Technical messages,
test names, script commands and program identifiers were already English and
were preserved. No files, functions, variables, exports, routes or environment
variables were renamed.

The audit covered 206 non-ignored project files and a checksum of the local
environment file. Existing uncommitted changes were preserved. Dependencies,
generated reports, build output and Git history were excluded from editing.

## Documentation changes

All 13 existing Markdown files were reviewed and updated:

- Root README: clarified setup and maintenance commands; separated historical
  CORS observations from current instructions.
- `SANITY_CONNECTION_REPORT.md` and `FONT_REPLACEMENT_REPORT.md`: English
  translations retaining the original evidence, scope and limitations.
- `studio/README.md`, `ABOUT.md`, `PUBLICATIONS.md`, `TYPEFACES.md`: English
  instructions using stable field names. Removed outdated automatic Preview
  and Studio CI claims; documented the existing fontKey-based paired heading.
- `migration/README.md`, `PUBLISHING.md`, `PUBLICATION_DIAGNOSIS.md`: English
  import, publication and historical diagnosis guides with unchanged flags,
  confirmation phrases, identifiers and safeguards.
- `migration/review/README.md`, `APPLY_RESEARCH_LINKS.md`: English review and
  application instructions. The pinned JSON proposal was not changed.
- `src/assets/fonts/README.md`: clearer English and repaired weight-range
  punctuation. Font files, provenance and licenses were unchanged.

Historical reports are labeled as snapshots rather than live dataset or CORS
status. Updating these instructions did not change infrastructure settings.

## Comment cleanup

Eight Russian comment nodes were removed or replaced. The local data collection
has a concise English description. Removed obsolete placeholder planning notes,
redundant source-path headers, obvious section labels and an import-path remark.
Retained explanations of font measurement, asynchronous loading, scroll
restoration, caching, atomic writes, revision guards and credential isolation.

Comment-only edits affected:

```text
src/App.jsx
src/components/Footer.jsx
src/components/Header.jsx
src/components/PublicationsPreview.jsx
src/components/ResearchPreview.jsx
src/components/SectionHeader.jsx
src/components/TypefacesPreview.jsx
src/data/content.js
src/pages/HomePage.jsx
src/pages/PlaceholderPage.jsx
src/pages/PublicationsPage.css
src/pages/TypefaceDetailPage.css
studio/sanity.config.js
studio/schemas/homePage.js
```

Pre-edit sources were recovered and verified against the initial SHA-256 hashes.
AST comparison confirmed unchanged executable JS/JSX, including string literals
and JSX text, after excluding comments and source positions. CSS comparison
confirmed unchanged rules after removing comments and formatting whitespace.
All 14 modified code files passed. Header behavior, Studio configuration values
and schema definitions are unchanged.

## Multilingual content retained

The following was preserved under the content and UI constraints:

- Russian placeholder copy displayed by `PlaceholderPage.jsx`.
- Ukrainian/Russian tester text, Cyrillic glyph coverage and Unicode fixtures.
- Czech article titles, historical names, citations and existing route slugs.
- Russian Studio titles, descriptions and validation feedback, which are
  editor-facing UI rather than technical comments.
- Original author names, legal notices and third-party font licenses.
- Published Sanity content and the pinned Research URL proposal.

Ignored content snapshots can contain the same editorial data and were not
translated. Existing technical names such as `ukrainianText`, `fontKey` and
`researchArticle` are clear; renaming them would add import/API risk without a
language benefit.

## Validation

| Check | Result |
| --- | --- |
| Technical comments and Markdown | No remaining Russian, Ukrainian or Czech prose |
| Technical messages and test names | Already English; preserved |
| Local Markdown links | No broken targets |
| Renames | None; imports and route identities preserved |
| Modified executable code and CSS | All 14 files semantically unchanged |
| Reviewed URL plan checksum | Unchanged |
| Infrastructure, environment, dependencies and assets | Unchanged, except comment-only Studio cleanup |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| Offline import, publication and URL patch tests | 34 passed |
| E2E, five browser profiles | 100 passed, 4 intentional skips, 1 WebKit scroll failure |
| Isolated WebKit scroll recheck | 3 passed |
| CMS component tests | 73 passed |
| Sanity SDK tests | 8 passed |
| Additional mobile WebKit CMS tests | 16 passed |
| `git diff --check` | Passed |

The full-run failure was `tests/e2e/scroll.spec.js:21` in desktop WebKit: Back
restored position 0 instead of 250 within the assertion timeout. Three isolated
repetitions passed. This remains an intermittent test result, not a clean full
E2E pass. Neither scroll behavior nor the test was changed to hide it.

Existing Playwright tests ran with temporary configurations and isolated
localhost Vite servers. Repository test configurations were unchanged. Firefox
ran outside the restrictive sandbox because it otherwise cannot create pages.
Fixtures intercept or block external requests; this audit did not read or write
live CMS content. Temporary servers were closed after validation.

No cloud changes, deployment, commit, push, dependency updates or history
rewrites were performed.
