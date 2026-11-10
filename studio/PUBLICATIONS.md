# Publications CMS guide

## Scope and source inventory

Source: `src/data/content.js` (`publicationEntries`), 18 local records, one cover
each in `src/assets/publications/1.jpg` through `18.jpg`. No draft, locale, or
scheduled-publication model exists in that source. Each record owns its metadata
and cover; there are no cross-document references to migrate.

Target: independent portfolio Sanity project `e1din49w`, dataset `production`, new `publication`
document type. No existing Research documents or cloud assets are changed by this
implementation. This guide covers manual editing. For automated initial content
population, use [the import guide](../migration/README.md) and review its write safeguards.

## Field mapping

| Local value | Studio field | Notes |
| --- | --- | --- |
| `id` | `slug.current` | Preserve existing links exactly |
| `title` | `title` | Also used when cover alt is empty |
| `imageId` | `cover` asset | Upload the corresponding local JPG, not its numeric ID |
| `place` | `place` | Shared Place filter values; keep spelling consistent |
| `year` | `year` | String; supports years and periods |
| `language` | `language` | Displayed on the detail page |
| `description` | `description` | Paste into Portable Text as one or more paragraphs |
| array position | `order` | Use 1–18 to preserve the current order |

The image has only optional alt text, not duplicate caption/credit inputs.
New documents use Sanity-generated IDs; route identity is the slug, not `_id`.
The automated importer uses reviewed stable IDs and asset deduplication; its
write mode requires separate authorization. Route identity remains the slug.

## Existing routes and assets

| Slug | Cover file |
| --- | --- |
| satirikon | 1.jpg |
| ukrainske-slovo | 2.jpg |
| morskoy-zhurnal | 3.jpg |
| zhittya | 4.jpg |
| russkiy-magazin | 5.jpg |
| podderzhka | 6.jpg |
| kadora | 7.jpg |
| rul | 8.jpg |
| ukrainskiy-skitalets | 9.jpg |
| belaruski-student | 10.jpg |
| ogni | 11.jpg |
| yunost | 12.jpg |
| ocherki | 13.jpg |
| volya-rossii-vi-vii | 14.jpg |
| volya-rossii-i-iii | 15.jpg |
| belarusian-tribune | 16.jpg |
| kiev | 17.jpg |
| novoe-slovo | 18.jpg |

## Activation and cutover

1. Start local Studio (`npm run studio:dev`). When content writes are authorized,
   create a test record in Publications. Studio hosting is separate from local use.
2. Fill the fields, upload the JPG, and Publish. Drafts do not appear on the site.
3. Set `VITE_PUBLICATIONS_SOURCE=sanity` in the website `.env.local` and restart
   Vite. Without this switch the existing local catalogue remains unchanged.
4. Confirm catalogue filters, detail text, the cover lightbox and the homepage
   preview. The homepage automatically shows the first 12 catalogue records.
5. Finish entering the real records; compare record and asset counts, title and
   metadata samples, and all existing slugs above. If all 18 records are wanted,
   verify all 18 before production cutover. Missing slugs show Not Found, not a
   replacement publication. A changed slug requires an explicit redirect plan.
6. Source switches are explicit environment settings; there is no automatic CMS
   branch deployment. Unpublished content produces an empty catalogue. Allow
   the frontend origin in the independent project's CORS settings; no browser
   token is used.
7. Enable CMS mode for the intended environment after content and responsive
   checks. Hosting and repository publication are separate operations.

`npm run test:cms` uses mocked Sanity data to test catalogue filters, homepage
reuse, detail rendering, unsafe links, errors/retry, empty/missing records,
incomplete assets, and mobile overflow. It does not prove live dataset access or
content completeness. No TypeGen step is needed for this JavaScript project.
