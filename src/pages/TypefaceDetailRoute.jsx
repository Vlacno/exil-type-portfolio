import { typefaceEntries } from '../data/content'
import { normalizeTypeface, typefaceDetailQuery, typefacesUseSanity } from '../data/typefaceQueries'
import useSanityQuery from '../hooks/useSanityQuery'
import ContentStatus from '../components/ContentStatus'
import TypefaceDetailPage from './TypefaceDetailPage'

export default function TypefaceDetailRoute({ slug, navigate }) {
  const { data, loading, error, retry } = useSanityQuery(typefaceDetailQuery, { slug }, typefacesUseSanity)
  if (loading || error) return <main className="typeface-detail"><ContentStatus variant="article" resource="Typefaces" loading={loading} error={error} retry={retry} /></main>
  const typeface = typefacesUseSanity ? normalizeTypeface(data) : typefaceEntries.find((entry) => entry.id === slug)
  if (!typeface) return <main className="typeface-detail"><ContentStatus>
    <h1>Typeface not found</h1><p>This typeface is unavailable, unsupported or has not been published.</p>
    <a href="#/typefaces" onClick={(event) => { event.preventDefault(); navigate('/typefaces') }}>Back to typefaces</a>
  </ContentStatus></main>
  return <TypefaceDetailPage key={typeface.slug || typeface.id} typeface={typeface} fromCms={typefacesUseSanity} />
}
