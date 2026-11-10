# Local Google Fonts

All bundled fonts use the SIL Open Font License 1.1. Each family directory
contains its complete, unmodified `OFL.txt` and copyright notice. Copies in
`public/licenses/fonts/` are included in static builds.

| Family | Bundled files | Specimen styles |
| --- | --- | --- |
| Source Serif 4 | Normal and italic variable WOFF2, 200-900 | 400, 500, 700, 900, each with italic |
| Inter | Normal and italic variable WOFF2, 100-900 | 400, 700, each with italic |
| Unbounded | Normal variable WOFF2, 200-900 | 300, 400, 700 |
| Roboto Condensed | Normal variable WOFF2, 100-900 | 600 in the paired specimen |
| Russo One | Static regular WOFF2 | 400 |
| Ruslan Display | Static regular WOFF2 | 400 |

Roboto Condensed and Russo One share one catalogue card. They remain separate
families with separate licenses.

`SOURCES.json` records the pinned Google Fonts commit, source URLs, original TTF
hashes and bundled WOFF2 hashes. Compression uses `fontTools.ttLib.woff2.compress`.
No glyphs were removed, outlines changed, variable fonts instanced or metadata
renamed. Full Latin and Cyrillic coverage is retained. See
[OFL FAQ, section 2.2](https://openfontlicense.org/ofl-faq/) for WOFF/WOFF2 compression.

CSS controls optical sizing and `size-adjust` to match text widths. These rendering
settings do not change the font binaries or their authorship.

To regenerate and check the character overview, run from the repository root:

```sh
py -m pip install -r scripts/requirements.txt
npm run glyphs:update
npm run glyphs:check
```
