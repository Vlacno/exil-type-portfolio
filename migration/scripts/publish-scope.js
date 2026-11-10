// Fixed allowlist from the prepared portfolio import. Never select by type alone
// or derive publication scope from mutable CMS content / CLI ID arguments.
const slugs = {
  researchArticle: [
    'typography-in-emigrant-publications', 'publications-in-prague-archive',
    'typography-shifts', 'white-emigration', 'ukrainska-typografie',
  ],
  publication: [
    'satirikon', 'ukrainske-slovo', 'morskoy-zhurnal', 'zhittya', 'russkiy-magazin',
    'podderzhka', 'kadora', 'rul', 'ukrainskiy-skitalets', 'belaruski-student',
    'ogni', 'yunost', 'ocherki', 'volya-rossii-vi-vii', 'volya-rossii-i-iii',
    'belarusian-tribune', 'kiev', 'novoe-slovo',
  ],
  typeface: ['unbounded', 'roboto-condensed-russo-one', 'source-serif-4', 'ruslan-display', 'inter'],
}

export const PUBLISH_SCOPE = Object.freeze([
  ...Object.entries(slugs).flatMap(([type, entries]) => entries.map((slug) => Object.freeze({
    draftId: `drafts.portfolio-local-${type}-${slug}`,
    publishedId: `portfolio-local-${type}-${slug}`, type, slug,
  }))),
  Object.freeze({ draftId: 'drafts.aboutPage', publishedId: 'aboutPage', type: 'aboutPage' }),
])

if (PUBLISH_SCOPE.length !== 29 || new Set(PUBLISH_SCOPE.map((entry) => entry.publishedId)).size !== 29) {
  throw new Error('Publication allowlist must contain exactly 29 unique portfolio IDs')
}
