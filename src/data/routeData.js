import { fetchQueryEntry, getQueryEntry } from './sanityQueryCache'
import { researchCatalogueQuery, researchArticleQuery, researchUsesSanity } from './researchQueries'
import { publicationCatalogueQuery, publicationDetailQuery, publicationsUseSanity } from './publicationQueries'
import { typefaceCatalogueQuery, typefaceDetailQuery, typefacesUseSanity } from './typefaceQueries'
import { aboutPageQuery, aboutUseSanity } from './aboutQueries'

const routes = {
  research: { enabled: researchUsesSanity, catalogue: researchCatalogueQuery, detail: researchArticleQuery },
  publications: { enabled: publicationsUseSanity, catalogue: publicationCatalogueQuery, detail: publicationDetailQuery },
  typefaces: { enabled: typefacesUseSanity, catalogue: typefaceCatalogueQuery, detail: typefaceDetailQuery },
  about: { enabled: aboutUseSanity, catalogue: aboutPageQuery },
}

function routeEntries(path) {
  if (path === '/') return ['research', 'publications', 'typefaces'].flatMap((section) => {
    const route = routes[section]
    return route.enabled ? [getQueryEntry(route.catalogue, '{}')] : []
  })
  const match = /^\/([a-z]+)(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(path)
  if (!match) return []
  const [, section, slug] = match
  const route = routes[section]
  if (!route?.enabled || (slug && !route.detail)) return []
  return [getQueryEntry(slug ? route.detail : route.catalogue, JSON.stringify(slug ? { slug } : {}))]
}

export function prefetchRouteData(path) {
  return Promise.all(routeEntries(path).map((entry) => fetchQueryEntry(entry)))
}

export function prepareRouteData(path) {
  // The home page has local content and independent CMS sections. Never hold
  // its hero (or a ready section) behind an unrelated section's request.
  if (path === '/') return null
  // Cached content (including empty results) is immediately usable. Mounted
  // consumers revalidate stale entries in the background as before.
  const missing = routeEntries(path).filter((entry) => !entry.snapshot.hasData
    && !(entry.snapshot.error && Date.now() - entry.failedAt < 1000))
  return missing.length ? Promise.all(missing.map((entry) => fetchQueryEntry(entry))) : null
}
