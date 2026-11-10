# Typefaces CMS guide

## Boundary and inventory

Five catalogue entries containing six open font families: `unbounded` (3 styles), `roboto-condensed-russo-one` (2), `source-serif-4` (8),
`ruslan-display` (1), `inter` (4). Font files are in `src/assets/fonts`, CSS faces in
`src/index.css`, character styles in `TypefaceDetailPage.jsx`, and glyph coverage
and metrics in `src/data/glyphCoverage*`. Shared style definitions are in
`shared/typefaceStyles.js`. Those are technical definitions, not
editorial CMS data. Uploading a new font binary does not automatically configure
these systems and is deliberately not offered in this phase.

Source content lives in `src/data/content.js` and `TypefaceDetailPage.jsx`:
names, a shared legacy placeholder article with one image, six specimen texts,
and three fact columns. There are no source drafts, translations or schedules.
Destination is the independent portfolio Sanity project `e1din49w`, dataset `production`.
No cloud records or assets are modified by this implementation.

## Model and manual filling

One `typeface` document per page, with a Sanity-generated document ID:

| Field | Purpose |
| --- | --- |
| name | Catalogue/home label and hero title |
| slug | URL identity; preserve one of the five existing paths above |
| fontKey | Whitelisted technical family, independent of slug and display name |
| order | Catalogue order |
| body | Portable Text story, paragraphs, headings, lists, images and captions |
| testerMode | Custom list or the legacy six testers |
| testerBlocks | Ordered list: text, optional mobile text, desktop/mobile parameters |
| samples | Read-only legacy starting texts, retained without data loss |
| releaseDate, version, formats, variableFile, designer | First facts column |
| openTypeFeatures | Second column, multiline text |
| supportedLanguages, trialInfo | Third column |

Images belong to the body and are uploaded to Sanity. Each has alt text and one
optional visible caption; no duplicate credit input is required. Font count is
computed from real character styles, not an editor-entered number. CMS mode does
not reuse the legacy placeholder article, image, facts, or specimen prose. Empty
sample text uses the generic invitation "Type your text here".

## Configurable testers

In the tester settings, select the custom block list (`testerMode: custom`). New documents use this
mode by default. Older documents without a mode retain their six legacy blocks;
their `samples` data remains read-only and is never removed. Switch back to the
legacy mode to view that version. Switching modes does not automatically copy
texts into the new list: add blocks and paste any legacy text you want to retain.

Each list item has stable Sanity `_key` identity and can be added, reordered or
deleted. An empty custom list (including an unset array) renders no testers.
Settings include font family, real style, exact size in px (12–1000), line-height
multiplier (0.85–2), letter spacing in em (-0.08–0.1), left/center alignment and
1–3 text columns. The font family may differ from the page family. Supported
styles are validated against the same shared definitions used by the frontend.

Desktop applies above 800px. At 800px and below, only defined mobile overrides
are applied; missing values inherit desktop settings, including zero spacing.
Mobile text is optional. Changing viewport mode remounts a tester with that
mode's initial values (and clears unsaved visitor edits). Reset restores text,
style, size, spacing, line height and alignment for the current viewport.
Configured blocks do not use legacy automatic font sizing or shortened mobile
samples by default. Long text wraps instead; oversized fonts are the editor's choice.

The `autoFit` checkbox next to font size enables adaptive
fitting separately for desktop/mobile. Fixed font size is ignored in this mode;
the longest explicit line fills the available tester width, up to 1000px font
size. The full text is preserved on mobile, explicit newlines are retained, and
text uses a single column. Resize, font/style changes and visitor text edits
recalculate the size. Reset restores the initial text and fitted size. An absent
mobile boolean inherits desktop; explicit `false` disables fitting on mobile.

The homepage remains code-managed: it reuses published Unbounded and Source Serif 4 records
from the catalogue. No homepage settings document is queried. Unknown technical
font keys are excluded; a detail record with one shows Not Found rather than an
unrelated font. Names and slugs do not select CSS families or glyph metadata.

For Roboto Condensed/Russo One, catalogue specimens, styles and glyph menus retain
both actual families. The detail heading uses the same two-family treatment in
local and CMS modes, selected by the technical fontKey rather than the slug.

This guide covers manual editing. Automated initial population is documented in
[the local import guide](../migration/README.md), including snapshots, asset
deduplication, rerun behavior and explicit write authorization.
Before production, review legacy placeholder prose for accuracy rather than
blindly importing the same historical article/facts into all five families.

## Local test and online rollout

1. Run local Studio (`npm run studio:dev`); create a Typefaces record, select an
   existing family, fill body/facts/specimens, and Publish.
2. Add `VITE_TYPEFACES_SOURCE=sanity` to the website `.env.local`, **save**, and
   restart Vite. No Git push or Studio deployment is needed for a local test.
3. Verify title, images/lightbox, configured tester order/settings, Reset, supported styles,
   glyph selection, mobile layout, catalogue shared sizing, and homepage reuse.
4. Studio is started and built separately. Root CI does not build or deploy it.
   Publishing Studio is a separate hosting action, not a prerequisite for local use.
5. Source switches are explicit environment settings; there is no automatic CMS
   branch deployment. An empty CMS deliberately produces an empty catalogue.
6. Before production cutover, compare the five intended records and all original
   slugs, metadata/asset samples and mobile/desktop rendering. Preserve existing
   URLs; any renamed slug needs an explicit redirect plan. Then enable the switch
   for the intended environment only after reviewing the published content.
   Hosting and repository publication remain separate operations.

Tests use mocked data, not the live dataset. They verify custom slugs, editable
body/images/captions, Reset, all 18 styles across five families, async card sizing,
homepage reuse, missing/unsupported records, errors/retry, safe links and mobile.
The project uses JavaScript, so TypeGen is not part of this rollout.
