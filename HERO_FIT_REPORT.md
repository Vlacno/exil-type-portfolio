# Paired typeface heading fit investigation

Date: 10 November 2026. Work performed in the independent portfolio checkout.

## Reproduction and diagnosis

The local machine has no installed WSL subsystem, Docker or other Linux runtime.
The existing GitHub Actions test-only job was rerun on its original commit
`8afb18773079a1434fa32fad8603c39c2cd2b56f`; no workflow/source was uploaded or
changed remotely. The Ubuntu Chromium job reproduced the exact failure at
`tests/cms/typefaces.spec.js:84`: 72 CMS tests passed, the paired heading failed.
See [the Linux rerun](https://github.com/Vlacno/exil-type-portfolio/actions/runs/42907639456/job/130169308164).
The rerun contained lint/build/tests only and did not deploy.

The demonstrated defect is in `FittedTypefaceHero`'s size calculation. It measured
text at the base size and applied a single proportional size estimate, assuming
rendered width scales exactly with font size. It never checked the resulting DOM
width. Combined font metrics and platform quantization can violate that assumption;
waiting longer does not correct an already-applied oversized result.

A deterministic regression uses real, fully loaded Roboto Condensed and Russo One
fonts and CSS whole-pixel size quantization to model non-linear rendered widths.
The unchanged fitter failed with **2.875 px overflow**, beyond the existing 2 px
allowance. This is a demonstrated sizing defect; the exact Linux renderer-level
trigger cannot be profiled from the existing job's logs. Platform quantization is
a supported explanation, not a claim that Linux internally applies that test CSS.

Font loading was checked separately. Delaying each face by 500 ms and by 5 seconds,
including the existing 4-second fallback timeout, produced fitted fallback text and
refitted loaded text. New regression tests suppress `loadingdone` and cover the same
late-font recovery. No font-loading timeout, test polling timeout, CSS typography,
font asset or layout breakpoint was changed.

## Fix

- Measure the complete direct heading spans, preserving the two font families.
- Keep the existing proportional font size when its rendered width already fits.
- If it still exceeds the same container width minus 2 px, perform at most 14
  DOM-measured bisection steps and retain a size that actually fits.
- Preserve the original resize/font-ready triggers and cleanup.

No clipping, ellipsis, hidden overflow, forced line wrapping, altered tracking,
new breakpoints, synthetic weights, smaller fixed heading size or widened test
tolerance was introduced. The original failing test file is byte-identical to the
task baseline. Existing Header changes and prepared CI/CD changes were preserved.

## Design and validation

Saved normal-rendering heading sizes and widths at 1440, 390 and 320 px were exactly
unchanged before/after, with both normal and integer-positioning Chromium flags.
A total of 6,774 fitted container-width samples had no overflow. New browser tests
cover 1440, 390, 320 and 768 px, including late fonts and viewport resizing.

| Check | Result |
| --- | --- |
| Linux baseline rerun, existing commit | Same assertion reproduced: 72 CMS passed, 1 failed |
| New deterministic regression before the fix | Failed: 2.875 px overflow |
| New deterministic regression after the fix | Passed in Chromium, Firefox and WebKit |
| Original assertion plus late-font regressions, three engines | 12 passed |
| ESLint | Passed |
| Sanity-mode Vite production build | Passed |
| Full desktop/mobile E2E matrix | 101 passed; 4 intentional viewport-matrix skips |
| Full CMS component suite | 76 passed, including all 3 new regressions |
| SDK transport suite | 8 passed |
| Additional CMS mobile WebKit suite | 16 passed |
| Production-build CMS suite | 8 passed |
| Original overflow assertion / CSS / assets / font files | Byte-identical to the task baseline |
| Existing fit geometry at the sampled desktop/mobile widths | Unchanged |
| Original historical project and Git metadata | Unchanged |
| git diff --check | Passed |

The complete local browser run passed 209 tests with 4 intentional existing skips
and no failures or retries. The focused 12-check engine matrix is reported
separately because it overlaps those suites. CSS quantization support is asserted
and both real faces are explicitly loaded before the deterministic regression.
Font-timeout tests use the same existing 4-second behavior with loadingdone
suppressed; no longer polling timeout was introduced in the original assertion.
Temporary localhost servers/configurations isolated all tests and blocked
unmatched external requests. No live CMS data was read or changed.

## Scope and remaining verification

Changed source: `src/pages/TypefaceDetailPage.jsx` only. Added
`tests/cms/hero-fitting.spec.js` and this report; added a follow-up note to
`DEPLOYMENT.md`. No existing assertions were changed or skipped.

The old failure is reproduced on Linux. The fixed code has been tested locally on
Windows in Chromium, Firefox and WebKit. Running the updated code on the GitHub Linux
runner requires a separately authorized commit/push; no such action was performed.
The next Linux Actions run must confirm the actual fix before production release.
No commit, push, deployment, CMS write, schema change, dependency update or original
historical-directory modification was performed.
