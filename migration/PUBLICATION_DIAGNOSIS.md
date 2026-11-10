# Publication preflight diagnosis

This report records a historical investigation of `missing-draft`. Only the
independent project **`e1din49w` / `production`** was read. Cloud data was not
changed; the customer's client was not used.

## Published article found

An uncached published query for type `researchArticle` and slug
`typography-in-emigrant-publications` returned:

```text
_id: 81caac71-be85-4b50-9ae5-bbc06151d1d5
_type: researchArticle
slug.current: typography-in-emigrant-publications
title: Typography in Emigrant publications
```

The unprefixed ID and published perspective establish a published version.
The query did not establish who published it or how; authorship history was
not requested.

The earlier preflight only checked:

```text
drafts.portfolio-local-researchArticle-typography-in-emigrant-publications
portfolio-local-researchArticle-typography-in-emigrant-publications
```

It therefore mistook the missing canonical pair for missing content.
The import result recorded 28 creations and one skipped record, consistent with
the importer's same-type/same-slug handling. That result did not record the
skipped ID, so it does not independently establish the article's identity.

Restoring from local content would duplicate an existing article and was not
required. The UUID was not renamed; no document was overwritten or published.

## Fix

The publisher now reads metadata by the allowlisted exact type and slug.
An existing published record under a different ID receives:

```text
status: skipped-published
resolvedPublishedId: 81caac71-be85-4b50-9ae5-bbc06151d1d5
```

Discovery provides a reason to skip, not another writable ID. Alternative
drafts or multiple published matches block publication for review. The fixed
29-ID write scope was preserved.

## Why publication stopped

The connected report saved before the investigation contained:

| Status | Count |
| --- | ---: |
| ready | 16 |
| skipped-published | 12 |
| missing-draft | 1 |

`publishReviewed` rejects any status other than ready/skipped-published before
starting transactions. With a valid plan hash, this report therefore necessarily
blocked on the missing canonical article ID. An outdated hash would have blocked
earlier during the reviewed-plan comparison.

The former catch handler discarded the cause and saved only
`Preflight, reviewed-plan check, request or local report write failed`.
The old error report has no original exception, stage or supplied hash, so the
historical call cannot be conclusively classified as PREFLIGHT_BLOCKED versus
PLAN_CHANGED. The blocking record is established; the generic message alone
also cannot exclude an additional network or disk failure.

Structured errors now distinguish blocking IDs/statuses, changed plans and
missing tokens. Unknown SDK errors retain only stage/HTTP status, without
requests, headers or secrets. Completed dry-runs archive previous error files.

Original evidence was preserved in the ignored local files
`migration/generated/diagnosis/before-report.json` and `before-error.json`.

## Connected public dry-run after the fix

No SANITY_IMPORT_TOKEN was available in the process, user or machine environment
or local environment file during that investigation. The public read check was:

```sh
npm run publish:portfolio -- --dry-run --public-only
```

The resulting snapshot in `migration/generated/publish/report.json` showed:

| Field | Historical result |
| --- | --- |
| verification | connected-public-only |
| Logical portfolio records | 29 |
| Verified published records, skipped | 13 |
| Unverified drafts | 16 |
| missing-draft | 0; draft absence was not asserted without a token |
| Published by this run | 0 |
| planHash | null; cannot authorize publication |

This verified published records only. The 16 ready records in the older report
were not presented as a new authenticated observation. After providing a
new-project token through the environment, the full read-only check is:

```sh
npm run publish:portfolio -- --dry-run
```

At that point, an unchanged dataset was expected to yield 13 skipped-published
and 16 ready records. That was an expectation, not an authenticated result.
Do not reuse the old hash. Publication mode was not run during diagnosis.

## Validation and scope

Thirteen offline publisher tests and lint passed. Added cases covered a published
record under another ID, alternate drafts, multiple published matches, limited
public visibility and structured missing-token errors. Simulated publication
used an in-memory client without cloud mutations.

The investigation changed the publisher, its tests and publication documentation,
and added this report. Frontend, Header, Studio, schema definitions, fonts and
CI/CD were preserved. These observations describe the investigation, not the
dataset's current publication count.
