# Import plan ordering failure: 453f8a1

Date: 11 November 2026. Scope: the independent portfolio checkout.

## Exact failure

[Verify frontend job](https://github.com/Vlacno/exil-type-portfolio/actions/runs/43092066064/job/130771406308)
failed in the offline step on commit `453f8a1`. The complete 162,991-character job
log was retrieved and saved outside the repository as
`github-453f8a1-complete.log`; the failure was not diagnosed from the shortened
GitHub annotation. The release job was correctly skipped by its verification gate.

- Test: `plan maps the active local data and all image references deterministically`.
- Definition: `migration/tests/import-local.test.js:50`.
- Assertion: line 63, `assert.deepEqual((await buildPlan()).plan, plan)`.
  With `node:assert/strict`, its operator is `deepStrictEqual`.
- CI result: 41 passed, 1 failed out of 42 offline tests. All 8 release guard
  tests, including the deployment discovery regressions, passed.

The differing approval hashes were:

| Value | SHA-256 |
| --- | --- |
| Actual, second build | `a15d992b9072e6ffcd944096bf166bb6c01eaa281f572c86dc321d4b1b85aae8` |
| Expected, initial build | `6021af7e430af61661f47aefc0f091c18fced4a19c7c3907b65e8d20e3510fee` |

The two Research image records swapped their first/second asset positions:

| Record | File in `src/assets/` | Bytes | Width x height |
| --- | --- | ---: | --- |
| Actual first / expected second | `a24fe08a748229d6c5de2718ff1858629ee7f1dd.png` | 4,390,893 | 2360 x 1488 |
| Expected first / actual second | `99f67873ca8ae801763203e2ce91d459134f0778.png` | 2,009,962 | 2434 x 1582 |

Their respective asset-key SHA-256 suffixes were
`c6924c9fbb5209e5e320ee96e07805728353bdc6308247975314564caa426346` and
`88cf4aa2d1dad05349c5252abc4edac068652e8271a909fa53a497f273a21b90`.
Image bytes, dimensions, source fingerprints, document mappings and references
did not change. The unequal array order changed the JSON used for approval hashing.

## Root cause and local reproduction

`richBody()` launches image work with `Promise.all()`. Its returned rich-text array
retains source order, but `image()` also mutates a shared Map after awaiting
filesystem reads. Those Map insertions follow I/O completion order. The planner
then serialized `assets.values()` directly, exposing that nondeterministic order
in both the asset manifest and approval hash. Deduplicated path aliases had the
same risk within an asset's `paths` array.

Two real image reads were gated locally and released in chosen opposite orders,
without sleep-based timing. This reproduced the exact two CI approval hashes on
Windows Node 24.13.1. The new full-plan regression failed against the unchanged
planner and passed after the fix. This is an asynchronous planner-ordering bug,
not a Linux path separator, line-ending, locale, outdated fixture or production
content issue. Linux filesystem timing exposed a race that can occur elsewhere.
No remote workflow was rerun because a successful verification could activate
its dependent release job, contrary to the no-deploy instruction.

## Fix and regression coverage

`buildPlan()` now sorts the completed asset manifest by content-derived key and
sorts copied path aliases before validation and approval hashing. Key ordering
uses deterministic string comparisons rather than locale-dependent collation.
Concurrent reads remain enabled. Document order, catalogue order, Portable Text,
content-derived IDs, references, image bytes, mappings and approval validation
are preserved. The original full equality assertion is unchanged.

New tests compare complete `{plan, snapshot}` outputs under opposite real-read
completion orders. A second test supplies identical image bytes in memory to
exercise deduplication and alias ordering; it does not change any source asset.
Mocks are restored, including built-in ESM bindings. No flags, network service,
production dataset or cloud credentials are required.

## Validation and scope

- ESLint: passed.
- Full offline maintenance and release suite: **44 passed**, no failures/skips.
- Both new scheduling regressions failed before the fix and passed afterward.
- Two real CLI dry-runs with network transports disabled produced byte-identical
  `plan.json` files and the same approval hash.
- Counts remain 29 documents: 5 Research, 18 Publications, 5 Typefaces, 1 About;
  21 unique images and 33 document image references.
- The Vercel discovery implementation, workflow, release guards, application,
  source content/assets, schemas, dependencies and Git metadata are unchanged.
- `git diff --check`: passed. No commit, push, deployment or cloud write occurred.

Changed files only:

1. `migration/scripts/plan-local.js` ? canonical asset/alias ordering.
2. `migration/tests/plan-order.test.js` ? controlled completion-order regressions.
3. `migration/README.md` ? deterministic ordering and reviewed-plan guidance.
4. `migration/PLAN_ORDER_DIAGNOSIS.md` ? this report.

Canonicalization changes the approval hash of newly generated plans. Existing
reviewed/generated files were not overwritten: dry-runs used separate OS-temp
directories. Regenerate and review an old plan before any separately authorized
import; never bypass the exact plan-hash guard to reuse an obsolete approval.

References: [Map insertion order](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
[Node built-in ESM binding synchronization](https://nodejs.org/docs/latest-v24.x/api/module.html#modulesyncbuiltinesmexports).
