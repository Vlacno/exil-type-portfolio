# Portfolio document publication

The destination is fixed to **`e1din49w` / `production`**. Preparing the
publisher did not publish content or change the frontend, Studio, fonts, Header,
CI/CD or existing published documents.

## Scope

`scripts/publish-scope.js` contains the exact import allowlist: five Research
articles, 18 Publications, five Typefaces and the About singleton, totaling 29.
The publisher does not select every document of a type/prefix or accept
arbitrary IDs through CLI arguments. Tests compare this list with the import plan.

For each draft/published ID pair:

- An existing published ID is skipped together with its draft. Neither version
  is changed, regardless of its current content.
- Metadata is also checked by the allowlisted type and exact slug. A published
  match under another ID is marked `skipped-published` with `resolvedPublishedId`;
  the importer ID is not created as a duplicate. An alternative draft produces
  `alternate-draft`; multiple alternative published IDs produce
  `conflicting-identity`. These IDs never become write targets.
- Missing drafts, mismatched types/slugs, missing revisions, unsupported font
  keys or unresolved image references block the entire publication run.
- About must use the canonical ID and retain the five imported section keys.
  System-managed release documents with `_system` are unsupported.

IDs and structure establish the intended import scope, not cryptographic
provenance. If someone reused those exact IDs for unrelated content, review them
separately. Same-type/same-slug discovery only skips or reports records; it does
not expand the write allowlist.

## Dry-run

From the repository root:

```sh
npm run publish:portfolio -- --dry-run
```

This requires `SANITY_IMPORT_TOKEN` in the current process environment and reads
only the independent CMS. It saves `migration/generated/publish/report.json`.
It does not load tokens from `.env`, Studio login or a customer project, accept
a CLI token, or print credentials. The token needs draft visibility; insufficient
visibility can make records appear missing. Dry-run does not verify write
permissions or run full Studio validation.

For an explicitly offline check without a token:

```sh
npm run publish:portfolio -- --dry-run --offline
```

This creates no SDK client and makes no network requests. All 29 IDs are
`unverified`; draft existence is not asserted, and `planHash` is null.
The initial preparation used this mode because its environment had no token.

A limited connected check can read public published records without a token:

```sh
npm run publish:portfolio -- --dry-run --public-only
```

This reports `verification: connected-public-only`. Records without a visible
published version are `unverified`, not `missing-draft`. This mode cannot
authorize publication: `planHash` is null and `--publish --public-only` is rejected.
The historical diagnosis found 13 published records and 16 unverified drafts;
see [the diagnosis](PUBLICATION_DIAGNOSIS.md). These counts are a snapshot.

Without flags, the publisher defaults to connected dry-run and requires a token.
Use `--out <path>` to change the local output directory. The default output is
covered by the existing `/migration/generated/` Git ignore rule.

## Explicit write confirmation

Review the content/image rights in [the import guide](README.md), obtain separate
authorization and review a connected dry-run before writing. Write mode requires:

```text
--publish
--confirm "PUBLISH e1din49w/production PORTFOLIO 29"
--plan-hash <64-character planHash from the reviewed connected dry-run>
```

The exact CLI phrase is the explicit confirmation; no interactive prompt is
required. Write mode cannot be combined with `--dry-run`, `--offline` or
`--public-only`. The independent project's token must have the necessary
publication and draft permissions. Tokens are not saved in source or reports.

The publisher re-reads the destination before writing. Its hash covers the
target, all 29 statuses, revisions and content hashes. A changed plan requires
another review. Any preflight error stops all transactions; published records
are always excluded from writes.

## Concurrency protection

Each ready draft uses a separate atomic transaction:

1. Patch the draft with `ifRevisionId` while setting its existing slug value
   (or existing sections for About), checking that it has not changed.
2. Use strict `create` for the published ID. If it exists concurrently, the
   entire transaction fails. Neither upsert method is used.
3. Delete only that draft, completing the draft-to-published transition.
   A failed transaction retains the draft.

Content is copied intact; Sanity-managed ID, revision and timestamp fields are
replaced/generated. Assets and unrelated records are untouched. Reruns skip
published IDs. Individual transaction failures do not stop the remaining ready
records, so partial success is possible and is reported.

References: [drafts and versions](https://www.sanity.io/docs/content-lake/drafts-and-versions)
and [transactions and revision guards](https://www.sanity.io/docs/content-lake/transactions).
Strict-create behavior was also checked in the installed SDK's
`src/data/transaction.ts`.

## Reports and recovery

`report.json` includes target, verification mode, exact IDs, statuses, revisions,
hashes, success/skip/error counts and successful transaction IDs. It excludes
full documents and SDK error bodies. Progress is saved after each attempt.
A nonzero exit code indicates a preflight or publication error. Offline exit 0
only means the local allowlist check completed.

General failures create `error.json` while preserving the last progress report.
Errors include a stage, safe code and HTTP status:

| Code | Meaning |
| --- | --- |
| MISSING_TOKEN | Required token absent |
| PREFLIGHT_BLOCKED | Blocking document IDs and statuses |
| PLAN_CHANGED | Reviewed state no longer matches |
| OPERATION_FAILED | Other SDK/file failure, with stage but no raw error body |

Authorization failures are also saved; argument parsing errors go to stderr.
After a completed check, the previous error file is archived as
`previous-error-*.json`. Request details, authorization headers and tokens are
omitted. SDK retries are disabled.

A network failure can leave a transaction's outcome unknown. Run a new dry-run
before retrying; it will skip a successfully created published version.
An unavailable local disk can prevent report persistence; the script stops
rather than continuing writes.

## Preparation validation

The implementation passed 13 offline publisher tests and lint. Offline and
public-only connected dry-runs were performed separately during preparation and
diagnosis. Tests cover the exact allowlist, confirmation/token/hash gates,
read-only checks, existing published/draft records, alternate IDs/conflicts,
unrelated records/assets, reruns, concurrency, missing drafts/images, wrong
destinations, changed plans, structured authorization errors, limited public
visibility and a real offline CLI run with networking disabled.

Implementation: `scripts/publish-scope.js`, `scripts/publish-portfolio.js`,
`tests/publish-portfolio.test.js` and the root npm commands. No dependency was added.
