# Apply reviewed Research links

`migration/scripts/apply-research-links.js` applies the **exact reviewed plan**
in [research-source-links.json](research-source-links.json), restricted to
`e1din49w / production`. Preparation ran connected dry-run only, without
writes, draft creation or publication.

## Connected dry-run

From the repository root:

```sh
npm run research-links -- --dry-run
```

Without flags, the script also defaults to dry-run. It reads only the five
exact published IDs, types, slugs, revisions and source fields from the plan.
The public dataset permits anonymous verification of these published records.
Drafts and unrelated records are not queried or substituted for missing records.

The preparation snapshot confirmed:

| Check | Result |
| --- | ---: |
| Published Research documents | 5 |
| Sources | 10 |
| Planned citation/URL fields | 18 |
| Matching original document revisions | 5 |
| Fields matching before values | 18 |
| Conflicts | 0 |
| Cloud writes performed | 0 |

Reports are stored in the ignored `migration/generated/research-links/` folder:

- `report.json`: IDs, expected/current revisions, old/new field-match results,
  review hash, fresh plan hash, counters and mode.
- `last-run.json`: latest run ID and status.
- `error.json`: safe error code/stage on failure; archived after a completed check.
- `before-apply.json`: checked state before a future authorized transaction.

Use `--out <path>` for another local folder. Output omits tokens, SDK response
bodies and headers. Full citation values remain in the reviewed plan rather
than being repeated in reports. Exit 1 means a conflict or failure; exit 0 means
the check completed. Dry-run does not establish a future token's write rights.

## Scope protection

The reviewed plan's pinned checksum is
`0506279043ebd409fddc86125d31ace5e9460b7bea5628e1e4e05e8005a58fb6`.
Both JSON content and its reviewHash must match. Recomputing the file's own hash
cannot authorize new IDs, fields, values, revisions or destinations. A revised
plan requires another explicit review and pinned checksum; revisions are never
automatically rebased.

Validation also requires the plan format, five unique published IDs, 10 sources
and 18 unique changes. Only exact `sources[_key=="..."].citation` and `.url`
paths are accepted. New strings must differ solely by the reviewed URL
replacement. The JSON patch is checked against changes; the transaction payload
is rebuilt from those verified changes.

Each published record must exist at its exact ID, have type researchArticle,
the expected slug and exactly one source for every selected key. The script
does not find substitute IDs or drafts.

## Future application

These steps were not executed during preparation. All of the following are
required before a write:

1. A separate `SANITY_IMPORT_TOKEN` issued for the independent project and
   supplied through the current process environment. No customer tokens, Studio
   login, environment files, Vercel credentials or token CLI arguments are used.
   The script cannot determine an opaque token's issuer; create it in the new
   project. Transport is restricted to that project's dataset.
2. `--apply`.
3. The exact phrase `--confirm "APPLY RESEARCH URL FIXES e1din49w/production 5"`.
4. `--plan-hash <planHash from the reviewed connected dry-run>`.

Dry-run and apply are mutually exclusive. CLI options cannot change the target,
ID list or plan file. The confirmation phrase does not replace separate user
authorization for the workflow.

The script reads current state again before writing. A changed plan hash blocks
the whole run with PLAN_CHANGED. Any changed revision or nonmatching old value
blocks it with PREFLIGHT_BLOCKED. Even an edit to an unrelated field with a new
revision is not automatically accepted or overwritten.

The write is **one atomic transaction** containing exact patch.set operations
and revision guards for every ready document. A concurrent revision change
rejects the entire transaction. There are no create, replace, delete or unset
operations, array replacements, publication actions or draft operations.
Published IDs remain published. Sanity updates revision/timestamp metadata;
other fields are not set.

The checked state is saved locally before sending the transaction. A disk failure
at that point stops the write. The script then reads the same IDs back and
verifies all replacement values. Reports include the transaction and result.

If the connection fails after submission, TRANSACTION_FAILED_OR_UNKNOWN does
not assert that nothing happened on the server. There is no automatic retry:
a fresh dry-run must establish the actual state. POSTCHECK_FAILED retains the
transaction ID and affected IDs after a successful response but failed
verification; editor changes are not rolled back.

A document whose planned fields all equal after receives already-applied and
is skipped, including when other fields were edited later. Partial or different
values require review. No new published records, copies or drafts are created.

## Validation and implementation

`npm run test:research-links` passed **13 offline tests** covering the pinned
plan, values/revisions, unrelated records/drafts, CLI gates, atomic concurrency
failure, preserved fields, keyed paths after array reordering, reruns,
pre-write disk failure, lost responses and post-check recovery. Tests use the
installed SDK's patch serialization with an in-memory commit implementation;
they do not send cloud mutations. Lint passed.

Implementation: `migration/scripts/apply-research-links.js`,
`migration/tests/research-links.test.js` and root commands `research-links` and
`test:research-links`. No dependencies were added. Preparing this script did not
change the reviewed JSON, frontend, Header, design, fonts, schema definitions,
CI/CD or other scripts, and did not deploy, commit or push.
