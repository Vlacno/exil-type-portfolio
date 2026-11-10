# Sanity Studio: Research, Publications, Typefaces and About

Target: independent project `e1din49w`, dataset `production`, from `../shared/sanityConfig.js`.

Run `npm ci --ignore-scripts`, then `npm run dev` in this directory. `npm run build` checks the Studio build; it does not deploy Studio or import content.

## Content model

- `aboutPage`: singleton with ordered accordion sections, rich text/images and optional contact email. See [the About guide](ABOUT.md).

- `researchArticle`: title, slug, summary, heading font, catalogue order, body, credits, copyright, sources.
- `researchBody`: Portable Text paragraphs, h2/h3 headings, quotes, lists, bold/italic text, links, and `researchImage` objects.
- `researchImage`: image asset with crop/hotspot, required alt text, optional caption and credit.
- `publication`: title, slug, cover, place, year/period, language, Portable Text description, catalogue order.
- `typeface`: name, slug, connected font family, body/images, tester texts, facts and catalogue order. See [the Typefaces guide](TYPEFACES.md).

Publications has its own switch, `VITE_PUBLICATIONS_SOURCE=sanity`. See
[the Publications rollout guide](PUBLICATIONS.md) for all 18 existing slugs,
field mapping, cover uploads and the manual activation checklist.

Slugs must be unique within Research (Sanity's standard slug validation), lowercase Latin letters, numbers and hyphens. Preserve existing frontend slugs during migration. Changing a published slug later requires a redirect plan.

The homepage is managed in frontend code, not in Studio. Its Research preview
reuses the first two catalogue entries. The legacy `homePage` schema is retained
read-only for compatibility with existing cloud documents, excluded from Studio
navigation and creation templates, and no longer queried by the website.
Existing cloud documents have not been deleted or modified.

## Current boundary

The frontend defaults to local content. Research uses `VITE_RESEARCH_SOURCE=sanity`,
Publications uses `VITE_PUBLICATIONS_SOURCE=sanity`, and Typefaces uses
`VITE_TYPEFACES_SOURCE=sanity`, independently at
build/dev-server startup. Each catalogue, its homepage preview and its detail
pages use the selected source. About uses its own `VITE_ABOUT_SOURCE=sanity`
switch and a singleton document; publish it before enabling CMS mode.
Publishing a document does not update a local-content deployment.

Before enabling CMS content:

1. Confirm editors and dataset access in Sanity; do not put a write token in the frontend.
2. When cloud writes are authorized, create new Research articles; do not import customer content.
3. Check catalogue order: the first two published articles also appear on the homepage.
4. Enable CMS mode locally and verify live project access/CORS. Published queries and the Portable Text renderer are implemented; no browser token is used.
5. Check long titles, missing optional fields, image captions/alt, unknown slugs, and mobile/desktop layouts.
6. Only then switch Research to CMS data and deploy.

Studio now lives in `studio/` inside the website's Git repository. Its dependencies and deployment remain separate from the website. Studio is built explicitly with `npm run studio:build` from the root. Root CI does not build or deploy Studio. No document, asset, role, token, CORS origin or dataset is created automatically.
