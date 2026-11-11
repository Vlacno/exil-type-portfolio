# EXIL Type Portfolio

A typography and editorial portfolio built with **React 19 and Vite 8**, with
an optional **Sanity CMS** and a standalone editing Studio. Adapted from a
commercial website into an independent portfolio project.

## Engineering highlights

- **React/Vite:** responsive hash-based routes, interactive font specimens,
  image lightboxes and local WOFF2 assets.
- **Sanity:** published-content queries, Portable Text, responsive image URLs
  and independent source selection for Research, Publications, Typefaces and About.
- **Data layer:** shared query caching, route prefetching, cancellation handling
  and explicit loading, empty and error states.
- **Playwright:** local-content E2E tests, CMS fixtures and SDK transport checks;
  desktop and mobile Chromium, Firefox and WebKit coverage.
- **GitHub Actions:** lint, one CMS production build and Playwright checks on
  pushes to `main`, followed by a gated Vercel staged deployment and explicit
  promotion of the same verified build.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `src/pages/`, `src/components/` | Routes, editorial layouts and specimen controls |
| `src/data/`, `src/hooks/` | Source selection, GROQ queries, normalization and caching |
| `shared/` | Public CMS target and technical font-style definitions |
| `studio/` | Standalone Sanity Studio and content schemas |
| `tests/` | E2E, CMS component and SDK transport tests |
| `migration/` | Reviewed import, publication and URL maintenance tools |
| `src/assets/fonts/` | Six Google Fonts families with separate OFL licenses |

The clean checkout defaults to bundled local content. CMS mode reads published
records from the independent project `e1din49w`, dataset `production`. The
frontend adapter exposes read operations only; an empty or failed CMS request
never silently falls back to local records.

## Run locally

Requires **Node.js 24.x**.

```sh
npm ci --ignore-scripts
npm run dev
```

No CMS account or environment file is required for local mode. To enable CMS
content, copy `.env.example` to `.env.local` and set:

```dotenv
VITE_CONTENT_SOURCE=sanity
```

Per-section overrides are `VITE_RESEARCH_SOURCE`, `VITE_PUBLICATIONS_SOURCE`,
`VITE_TYPEFACES_SOURCE` and `VITE_ABOUT_SOURCE`; each accepts `local` or `sanity`.
Restart Vite after changing them. Anonymous CMS reads require a public dataset
and the exact frontend origin allowed in the independent project's CORS settings.
Never place tokens in `VITE_*` variables.

To run the optional Studio:

```sh
npm run studio:install
npm run studio:dev
```

Studio runs separately at `http://localhost:3333` and requires an authorized
Sanity account. See [the Studio guide](studio/README.md). Starting or building
Studio does not import content.

## Verify

```sh
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e:quick
npm run test:cms
npm run test:sanity
node --test migration/tests/*.test.js
```

For all browser profiles, install them with `npm run test:e2e:install`, then run
`npm run test:e2e`. CMS tests intercept or mock network traffic; they do not
modify a live dataset.

## Deployment workflow

Pushes to `main` run ESLint, offline safety tests and Playwright checks, including
an actual CMS-mode production-build check. A successful run uploads that single
verified build to Vercel without assigning domains, verifies the staged files,
and explicitly promotes the same deployment to production.

Deployments use GitHub Secrets and reject stale commits. Vercel Git deployments
must be disabled to avoid a second deployment bypassing CI. Production uses
`VITE_CONTENT_SOURCE=sanity`; Studio hosting and content publication stay separate.

See [DEPLOYMENT.md](DEPLOYMENT.md) for required secrets, Vercel settings,
concurrency guarantees and activation checks. Preparing this workflow does not
activate it until committed/pushed and configured in GitHub/Vercel.

See the [import guide](migration/README.md),
[publication guide](migration/PUBLISHING.md) and
[reviewed URL patch guide](migration/review/APPLY_RESEARCH_LINKS.md) for guarded
maintenance workflows; their write modes require explicit authorization.

## Copyright and publication

Copyright © 2026 Ivan Zhevachevskyi. All rights reserved. Source code is
available for portfolio review only; commercial reuse requires written
permission. See [COPYRIGHT.md](COPYRIGHT.md).

The six font families retain their separate **SIL Open Font License 1.1** terms;
see [font provenance and licenses](src/assets/fonts/README.md). Third-party
images, text and branding are not covered by the source-code notice.

Before making a repository public, resolve the blockers in the
[publication audit](PUBLICATION_AUDIT.md) and follow the
[fresh-repository instructions](PUBLICATION.md). Do not publish the existing
Git history.
