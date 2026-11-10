# Independent Sanity connection report

Date: 10 November 2026. This report records the initial connection work; its
CORS observations and test counts are historical, not a live status check.

The React/Vite frontend and standalone Sanity Studio were configured for project
`e1din49w`, dataset `production`. Document schemas, fields, Studio structure,
fonts, images and layout were preserved. The customer's project ID was removed
from active source, documentation and rebuilt frontend/Studio output.

## Changes

| File | Change |
| --- | --- |
| `shared/sanityConfig.js` | Shared public project ID and dataset; no credentials |
| `studio/sanity.config.js`, `studio/sanity.cli.js` | Studio and CLI use the shared target; schema definitions and structure preserved |
| `src/sanityClient.js` | Official `@sanity/client` SDK restored for anonymous published reads; adapter exposes no mutation methods |
| `src/data/contentSource.js` | Local default, global and per-section CMS switches, separate mock mode |
| `src/data/aboutQueries.js`, `researchQueries.js`, `publicationQueries.js`, `typefaceQueries.js` | Existing GROQ queries retained; content source selected independently |
| `package.json`, `package-lock.json` | `@sanity/client` 8.9.0, Studio commands and SDK checks |
| `.env.example` | Public source switches documented; no token required |
| `playwright.sanity.config.js`, `tests/sanity/content-source.spec.js`, `tests/sanity/connection.spec.js` | Target, source selection, published perspective, credential isolation and image URL tests |
| Root and Studio documentation | Instructions updated for the independent project |

Existing component tests kept their localhost mock requests and images. The SDK
loads only when a CMS-enabled section requests content; local mode does not load
the SDK or query Sanity.

## Run Studio

From the repository root with Node.js 24.x:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run studio:install
npm.cmd run studio:dev
```

Open `http://localhost:3333` and sign in with an account that has access to
`e1din49w`. Account membership and permissions were neither verified nor copied
from another project. Starting Studio does not import content. Creating or
publishing documents and uploading images are separate cloud writes.

To check the Studio build locally:

```powershell
npm.cmd run studio:build
```

A Studio deployment is not required for local use and was not performed.

## Frontend content sources

Without an environment override, the frontend uses bundled local content:

```dotenv
VITE_CONTENT_SOURCE=local
```

After preparing published CMS content, enable all sections:

```dotenv
VITE_CONTENT_SOURCE=sanity
```

Or enable one section independently:

```dotenv
VITE_CONTENT_SOURCE=local
VITE_RESEARCH_SOURCE=sanity
```

The other overrides are `VITE_PUBLICATIONS_SOURCE`, `VITE_TYPEFACES_SOURCE` and
`VITE_ABOUT_SOURCE`. A section override takes precedence over the global setting.
Restart Vite or rebuild after changing variables. Source selection does not
change schemas or local fonts. An empty or failed CMS query displays its empty
or error state without silently substituting local records.

## Initial validation and CORS observations

| Check | Result during connection work |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed; SDK emitted as lazy-loaded chunks |
| `npm run studio:build` | Passed without deployment or import |
| `npm run test:e2e:quick` | 21 passed |
| `npm run test:cms` | 72 passed with localhost fixtures |
| `npm run test:sanity` | 8 passed; SDK requests intercepted by Playwright |
| Checksums | Design, fonts, images, schema definitions, existing tests and CI preserved |

The only live requests during this initial step were anonymous GET requests for
the GROQ constant `1`. Dataset content, tokens, roles and access settings were
not read or transferred.

| Origin | API response during the initial check |
| --- | --- |
| No Origin header, server-side GET | 200, result `1` |
| `http://localhost:3333` (Studio) | 200; CORS origin and credentials allowed |
| `http://localhost:5173` (frontend development) | 403; origin not yet allowed |
| `http://localhost:4173` (frontend preview) | 403; origin not yet allowed |

These responses describe that initial check. Later browser verification confirmed
CMS access from `http://localhost:5173`; this report does not establish the
current status of any other origin.

Browser CMS access requires the exact frontend origin in Sanity Manage,
project `e1din49w`, API > CORS origins. Anonymous frontend reads do not require
credentials or wildcard origins. CORS changes are cloud configuration writes
and were not made during this step. Anonymous browser reads also require a
public dataset; editor membership and dataset visibility were not independently
verified at that point.

No customer tokens, content or access settings were copied. No cloud writes,
dataset creation, CORS/role changes, import, publication, deployment, commit or
push were performed during the connection work. Git history and the existing
remote were unchanged; historical customer identifiers were not removed from
earlier commits.
