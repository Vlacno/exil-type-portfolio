# Proposed Research source links

**Review proposal only. These changes have not been applied to Sanity.**

Target: `e1din49w / production`. The [JSON plan](research-source-links.json)
contains field-level proposals for five existing published Research documents,
read anonymously with the published perspective and `useCdn: false`.
The later [application guide](APPLY_RESEARCH_LINKS.md) describes the guarded
script; preparing it did not apply the proposal.

## Verified replacements

| Source | Previous URL | Replacement |
| --- | --- | --- |
| Berlin, Die kaiserliche Reichshauptstadt | `https://www.berlin.de/berlin-im-ueberblick/geschichte/die-kaiserliche-reichshauptstadt/` | [The same article on Berlin.de](https://www.berlin.de/geschichte/8479394-3689745-die-kaiserliche-reichshauptstadt.html) |
| Bauer/Reichardt, Chronik der Schriftgießereien | `http://www.klingspor-museum.de/KlingsporKuenstler/` | [Official PDF](https://www.klingspor-museum.de/KlingsporKuenstler/ChronikSchriftgiessereien/ChronikderSchriftgiesserei.pdf) |

Both replacement URLs returned **HTTP 200** to GET requests during preparation:
HTML for Berlin and PDF for Klingspor. The
[official Berlin history index](https://www.berlin.de/geschichte/) links to the
same titled article. The [Klingspor chronology page](https://www.klingspor-museum.de/ChronikSchriftgiessereien.html)
links to the PDF. Its title page identifies Friedrich Bauer, Offenbach 1928,
with Hans Reichardt's additions, Frankfurt 2011; it has 148 pages. The old
Klingspor URL was a directory, while the exact cited PDF remains available.
No unrelated topical or archival replacement was substituted.

Only the two URL strings in the local Research citations were changed.
Other wording, dates, authorship, markup and references were preserved.
Future import preparation extracts the new URLs, but the idempotent importer
does not overwrite existing CMS records.

## Proposed CMS changes

| Existing document ID | Fields |
| --- | ---: |
| `81caac71-be85-4b50-9ae5-bbc06151d1d5` | 2 |
| `portfolio-local-researchArticle-publications-in-prague-archive` | 4 |
| `portfolio-local-researchArticle-typography-shifts` | 4 |
| `portfolio-local-researchArticle-ukrainska-typografie` | 4 |
| `portfolio-local-researchArticle-white-emigration` | 4 |

Total: **five documents, 10 sources, 18 fields**. Each document changes only the
URLs inside two keyed citation fields. The four imported documents also update
their corresponding keyed URL fields. The UUID document has no populated URL
fields; the proposal preserves that state without adding interface elements.

The JSON contains exact before/after values, paths using actual source keys,
revisions and `patch.set`. It does not replace documents or entire source
arrays. Article bodies, titles, summaries, images, authorship, access dates and
other citations remain intact. It creates no copies, drafts or publications.

Future application requires separate authorization, a fresh read of exact IDs,
and matching revisions/old values. Each patch includes `ifRevisionID`; changed
documents require a new review. The review hash identifies the proposal, not
permission to write. Proposal preparation performed **zero cloud mutations**.

## Paired Typeface heading fix

Normalization retains the technical `fontKey`. The fitted hero selects its
families by that key, falling back to the existing technical ID for local data.
The former check for a missing slug was removed. Roboto Condensed uses
SemiBold 600 and Russo One uses Regular 400. Element structure, CSS, sizing and
the fitting mechanism were preserved; CMS and local headings now share the
same two-family treatment.

Validation at that step passed lint, build, 11 Typeface Playwright tests
(including a custom CMS slug at 1440/390/320 px), and eight offline importer tests.
Live published content also confirmed both families/weights and no horizontal
overflow at those widths.

On Windows, a temporary Playwright config reused the running test Vite server
to avoid a shutdown delay; repository configs were unchanged. The test server
was stopped and the user's localhost:5173 server retained.

Changed during that step: the Typeface page/normalizer, Research page, Typeface
tests and this review directory. Header, schema definitions, other text and
styles were preserved. No deployment, commit or push was performed.
