# About CMS

About is a singleton document, opened directly from the About entry in Studio.
On first creation, its draft starts with the five current website sections and
their existing text. Review and click **Publish**; nothing is imported or
published automatically, and existing cloud documents are never overwritten.

- Add, remove or drag sections to reorder them.
- Each section has a title, rich text (including links, lists and images),
  and an optional contact email displayed below the text.
- The first section is initially open. All sections can be toggled independently.
- Image alt text is for accessibility; caption/credit are shown below the image.
- Page layout, typography and accordion behavior remain managed in code.

## Test locally

1. Start Studio with `npm run studio:dev` from the repository root.
2. Open About, review the prefilled draft and publish it.
3. Add `VITE_ABOUT_SOURCE=sanity` to `.env.local`, save the file, then restart
   `npm run dev`. Other source switches remain independent.
4. Open `/#/about`; test editing, section order and mobile layout.

With CMS mode on, unpublished/empty content shows an empty state, and request
failures show a retry button. Neither silently falls back to local text.
Without the switch, the existing local page remains available.

## Local independent Studio

Run `npm run studio:dev` from the repository root. The target is `e1din49w` /
`production`. The frontend stays local until its source switches are explicitly
enabled. Studio deployment, publishing documents and cloud settings changes are
separate actions requiring authorization. No preview deployment is automatic.
