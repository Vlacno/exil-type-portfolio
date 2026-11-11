# Local content import

The importer is restricted to **Sanity `e1din49w` / `production`**. This guide
describes the import preparation and its operating constraints. Preparation
used dry-run only; it did not modify cloud data or access settings. The frontend
defaults to local data unless its environment switches enable CMS content.

## Inventory and mapping

| Source | Sanity type | Count | Mapping |
| --- | --- | ---: | --- |
| `researchArticles` in `src/data/content.js` and the local branch of `src/pages/ResearchArticlePage.jsx` | `researchArticle` | 5 | `id` to `slug.current`; title, summary and font; index to order; nine paragraphs and two images to body; credits/copyright; six sources |
| `publicationEntries` in `src/data/content.js` | `publication` | 18 | `id` to slug; title, place, year and language; index to order; description to Portable Text; imageId to `src/assets/publications/{imageId}.jpg` |
| `typefaceEntries` and the local article/tester texts in `src/pages/TypefaceDetailPage.jsx` | `typeface` | 5 | `id` to slug/fontKey; name, order and available facts; description, three shared paragraphs, image and OFL link to body; six samples with `testerMode: legacy` |
| `aboutSections` in `src/data/aboutSections.js` | `aboutPage` | 1 | Canonical singleton `aboutPage`; five sections with stable keys, titles, Portable Text and optional email |
| Local PNG/JPEG images used by these pages | `sanity.imageAsset` | 21 | Eighteen covers, two Research images and one Typeface image; content-based deduplication; 33 document references |

A fresh dataset can receive **29 content documents** and up to **21 image asset
documents**. Images total 13,505,764 bytes, approximately 12.88 MiB. Existing
destination records and assets determine the actual number of new documents;
an offline plan cannot establish that count.

The duplicate display arrays `researchItems`, `researchPageItems` and
`publications` are excluded. The older Publications array has only 12 cards.
The code-managed homepage does not need a `homePage` document. Studio schema
definitions are unchanged.

The schemas do not define Research-to-Publication or Typeface-to-Research
relationships, so the importer does not invent them. Images use
`image.asset._ref`; article images use the existing `researchImage` and
`typefaceImage` objects with alt text and captions.

## Free font families

Five Typeface documents represent Source Serif 4, Inter, Unbounded,
Roboto Condensed / Russo One and Ruslan Display. The paired CMS record uses the
full name `Roboto Condensed / Russo One`. Only current fontKey and heading-font
values are accepted. Font binaries, removed commercial files and old family
names are excluded. Technical styles, families, glyphs and responsive parameters
stay in code; the importer transfers existing Latin/Cyrillic tester content.

The historical journal title **Molode Zhyttya** remains bibliographic content
in Publications. It is not a reference to the removed commercial font.

## Dry-run

After installing dependencies, run from the repository root:

```sh
npm run import:local -- --dry-run
npm run test:import-local
```

Running without arguments also selects dry-run. It does not read `.env`, Studio
login, Vercel credentials or old tokens. Even if `SANITY_IMPORT_TOKEN` is set,
dry-run neither uses nor prints it.

Generated files are stored in the Git-ignored `migration/generated/` directory:

- `source-snapshot.json`: extracted content and relative asset paths, without
  binaries or secrets.
- `plan.json`: drafts, image manifest, source/schema fingerprints, warnings
  and an `approvalHash`.
- `report.json`: counts, image size and warnings.

Use `--out <path>` for another local directory. Each run replaces its generated
files. Changes to source or content require a new dry-run and review.

The JSX AST extractor reads static content without executing React components.
Image paths must stay inside `src/assets`; formats, dimensions and SHA-256/SHA-1
hashes are checked. Structural validation covers required fields, types, slugs,
unique IDs/keys, Portable Text, allowed fonts and asset references. It does not
check live permissions, existing dataset records or full Studio validation.

Asset records are sorted by their content-derived key, and each asset's local
paths are sorted before the approval hash is computed. This keeps concurrent
image reads from changing the reviewed plan. Document, catalogue and Portable
Text order are preserved. After the deterministic-ordering fix, regenerate and
review any older local plan before applying it; do not reuse or replace its old
approval hash. Existing cloud documents and reviewed files are not rewritten.
See [the ordering diagnosis](PLAN_ORDER_DIAGNOSIS.md).

## Applying a reviewed import

Cloud writes require separate authorization. Preparation did not run this mode.

Write mode requires all of: `--apply`, `--confirm-project e1din49w`,
`--plan-hash <reviewed approvalHash>`, `--acknowledge-warnings` and a separately
issued `SANITY_IMPORT_TOKEN`. Use a token for the independent project with only
the required read, image upload and draft creation permissions. It is not saved
or exposed through `VITE_*`. Neither CLI arguments nor environment overrides can
change the destination; a conflicting shared configuration also blocks the run.

An authorized import:

1. Reads only the independent CMS, checking exact IDs, drafts, published versions,
   same-type/same-slug records and the About singleton.
2. Skips existing records, preserving editor changes. Duplicate destination IDs
   for one slug or an invalid About singleton stop the run before uploads.
3. Verifies all required local image bytes before uploading. Existing assets are
   reused by SHA-1; otherwise verified PNG/JPEG files are uploaded. References
   use returned Sanity asset IDs rather than predicted URLs.
4. Creates missing drafts in one `createIfNotExists` transaction. Stable IDs are
   `drafts.portfolio-local-{type}-{local-id}`; About uses `drafts.aboutPage`.
5. Checks created IDs and saves `result.json`. It does not publish content.

Interrupted asset uploads can leave reusable assets, but no partial document
transaction. A later run reuses those assets by hash. Published records are
recognized after manual publication, so a new draft is not recreated. A record
deleted entirely can be restored by another import. This is initial population,
not synchronization: local text changes do not overwrite existing CMS records.

Avoid parallel manual creation of documents with the same slugs during import.
`createIfNotExists` is atomic by ID; Sanity does not enforce arbitrary slug
uniqueness across different IDs. Automatic asset cleanup and deletion-based
rollback are not implemented.

## Content review before authorization

| Location | Issue | Recommended action |
| --- | --- | --- |
| Research article and local images | Explicit all-rights-reserved notice; text/image redistribution rights unverified. OFL covers fonts only. Draft assets are not private archival storage. | Confirm rights or replace material before upload; retain credits and copyright. |
| Research template | All five titles reuse one article, two photographs and six sources. | Check relevance and prepare individual articles where needed. |
| Typeface template and local data | Shared historical prose/image; CMS body adds an introduction and OFL link, changing page length. Image caption needs review. | Review descriptions and captions in drafts before publication. |
| `studio/schemas/typeface.js` | Legacy `samples` is deprecated/read-only. | Preserve current tester behavior; approve conversion to editable testerBlocks separately. |
| Publication data and Research bibliography | Demo dates/descriptions, repeated summaries, an incomplete relative source path, generated alt text. | Review facts, references and accessibility text. Keep incomplete paths as citation text rather than invalid URLs. |
| About sections | Existing PhD, institutional support and contact claims. | Confirm suitability for the independent portfolio. |

## Validation and cutover

Import preparation passed the local dry-run, eight offline tests, lint and build.
Tests cover 29 content documents, 21 assets, 33 references, Latin/Cyrillic text,
reruns, editor changes, published/manual records, conflicts, interrupted uploads,
modified image bytes, destination restrictions and confirmation flags. The CLI
dry-run was also tested with networking disabled and a synthetic token.

After an authorized import, run `npm run studio:dev`, inspect drafts and assets,
review content, and decide separately when to publish. The frontend reads
published content only. Enable `VITE_*_SOURCE=sanity` after published records are
verified, and allow the required frontend origin in the new project's CORS
settings. The importer changes neither CORS nor access permissions. Slugs are
preserved, so imported routes need no new redirects; verify routes and outgoing
links before switching sources.

## Implementation

- `scripts/extract-local.js`: active data and static JSX extraction.
- `scripts/plan-local.js`: mapping, image manifest, Portable Text and validation.
- `scripts/apply-local.js`: guarded import and rerun behavior.
- `scripts/import-local.js`: CLI, reports and write-mode authorization.
- `tests/import-local.test.js`: offline tests with an in-memory client.
- Root package scripts and lockfile: commands and the direct Babel parser
  development dependency.
- Root `.gitignore`: generated import files excluded.

The import preparation preserved the design, Header, fonts, images, CMS schema
definitions and connection, CI/CD and pre-existing tests.
