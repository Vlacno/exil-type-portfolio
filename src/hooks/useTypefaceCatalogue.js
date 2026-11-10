import { typefaceEntries } from '../data/content'
import { normalizeTypeface, typefaceCatalogueQuery, typefacesUseSanity } from '../data/typefaceQueries'
import useSanityQuery from './useSanityQuery'

export default function useTypefaceCatalogue() {
  const result = useSanityQuery(typefaceCatalogueQuery, {}, typefacesUseSanity)
  if (!typefacesUseSanity) return { typefaces: typefaceEntries, loading: false, error: false }
  return { ...result, typefaces: (Array.isArray(result.data) ? result.data : []).map(normalizeTypeface).filter(Boolean) }
}
