# Font replacement report

Date: 10 November 2026. This report describes the completed font replacement
step and the validation performed at that time.

Eighteen proprietary WOFF2 files were removed from the working copy. Six Google
Fonts families replaced them in eight local WOFF2 files, including variable
fonts and genuine italics. CSS, preloads, catalogue routes, labels, testers,
style dictionaries and character tables use the replacement families.

| Family | Demo styles | Catalogue |
| --- | --- | --- |
| Source Serif 4 | 400, 500, 700, 900; normal and italic | Separate card |
| Inter | 400, 700; normal and italic | Separate card |
| Unbounded | 300, 400, 700 | Separate card |
| Roboto Condensed | SemiBold 600 | Shared card with Russo One |
| Russo One | Regular 400; no synthetic bold | Shared card with Roboto Condensed |
| Ruslan Display | Regular 400; no synthetic bold | Separate card |

Five cards represent six families, preserving the catalogue structure.

## Files and licenses

- `src/assets/fonts/`: replacement WOFF2 files, each family's `OFL.txt`,
  documentation and `SOURCES.json` with source URLs, a pinned Google Fonts
  commit and SHA-256 hashes.
- `public/licenses/fonts/`: six license copies, also included in `dist`.
- `src/index.css`, `index.html`: local font declarations and preloads;
  external Google Fonts loading removed.
- `shared/typefaceStyles.js`, `src/data/content.js` and page/component styles:
  replacement families, keys, names and supported weights.
- `scripts/generate_glyph_coverage.py`, `src/data/glyphCoverageData.js`:
  character tables regenerated from the new files; guides account for CSS scaling.
- `src/pages/TypefaceDetailPage.jsx`: fitting uses DOM measurements with the
  rendered variable-font CSS settings. Authorship and licensing information
  was updated as part of the replacement.
- `tests/e2e/`, `tests/cms/`: names, routes and loading assertions updated;
  `tests/e2e/local-fonts.spec.js` added.
- `studio/schemas/researchArticle.js`, `studio/schemas/typeface.js`,
  `studio/schemas/testerBlocks.js` and `studio/TYPEFACES.md`: only the
  authorized font names and local font dictionaries were updated.

Sources came from the official Google Fonts repository at commit
`5bb28733cec313b63fbd415b574b5ae35c8aa8b8`.
WOFF2 compression retained all glyphs, outlines and metadata. Copyright notices
and SIL Open Font License 1.1 were preserved.

The complete WOFF2 set is 1,967,820 bytes. These are full fonts rather than
reduced subsets; broad character coverage increases the download size.

## Validation at replacement time

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Glyph generator with `--check` | Generated tables current |
| E2E: Chromium, Firefox, WebKit, mobile Chrome, mobile Safari | 101 passed, 4 intentional skips |
| CMS tests with localhost fixtures | 72 passed |
| Additional mobile WebKit font tests | 16 passed |
| Viewport widths: 320, 390, 768, 1440 px | Catalogue and all typeface pages fit without horizontal overflow |
| Latin, Cyrillic, Ukrainian/Belarusian characters and accented E | Outlines and browser loading checked |
| Source and static-build OFL files | All six license copies match |
| Visual review | Nine pages on desktop/mobile; no page errors or overflow |

The four skips avoid repeating the same viewport matrix in other browser
projects. Chromium runs that matrix; font loading, licenses and ordinary E2E
checks run in all five projects. Browser tests use localhost and block external
requests.

## Visible design differences

1. **The ÉMIGRÉ banner.** M/G and especially the final accented E changed:
   Ruslan Display has a different decorative form and lacks the previous stencil cuts.
2. **Typefaces catalogue and preview.** Longer family names reduce the shared
   fitted specimen size, particularly for Source Serif 4 and the
   Roboto Condensed / Russo One pair. Card dimensions and placement were preserved.
3. **Research.** Unbounded is less heavy and has different proportions.
   Ruslan Display headings have different letterforms and line breaks.
4. **Typeface pages.** Long Source Serif 4 and paired-family headings fit at
   smaller sizes. The facts section became shorter because it now lists the
   actual authors, formats and OFL terms.
5. **Body text and italics.** The hierarchy is preserved, while individual
   shapes, density and line breaks differ. CSS scaling was adjusted for body text.

At 1440 and 390 px, the homepage description and About introduction retained
their original line counts. The homepage description height changed by about
3 px on desktop and 1.7 px on mobile; the About introduction height matched.
No horizontal overflow was found.

## Preserved boundaries

That step did not change CI/CD, npm dependencies, the CMS connection or
infrastructure. Studio field/document definitions were preserved, and cloud
content was neither read nor written. Checksums confirmed preservation of images,
SVG assets and existing Header.jsx/Header.css edits. No deployment, commit or
push was performed.

The historical publication name in Publications was retained because it is
bibliographic content, not a font setting. Git history was not rewritten:
earlier commits still contain the removed commercial files and need a separate
review before publishing the repository history.
