import { publicationEntries } from '../data/content'
import { normalizePublication, publicationCatalogueQuery, publicationsUseSanity } from '../data/publicationQueries'
import useSanityQuery from './useSanityQuery'

export default function usePublicationCatalogue() {
  const result = useSanityQuery(publicationCatalogueQuery, {}, publicationsUseSanity)
  if (!publicationsUseSanity) return { publications: publicationEntries, loading: false, error: false }
  const publications = (Array.isArray(result.data) ? result.data : []).map(normalizePublication).filter(Boolean)
  return { ...result, publications }
}
