import { publicationEntries } from '../data/content'
import { normalizePublication, publicationDetailQuery, publicationsUseSanity } from '../data/publicationQueries'
import useSanityQuery from '../hooks/useSanityQuery'
import ContentStatus from '../components/ContentStatus'
import PublicationDetailPage from './PublicationDetailPage'

export default function PublicationDetailRoute({ slug, navigate }) {
  const { data, loading, error, retry } = useSanityQuery(publicationDetailQuery, { slug }, publicationsUseSanity)
  if (loading || error) return <main className="publication-detail"><ContentStatus variant="article" resource="Publications" loading={loading} error={error} retry={retry} /></main>
  const publication = publicationsUseSanity ? normalizePublication(data) : publicationEntries.find((entry) => entry.id === slug)
  if (!publication) return <main className="publication-detail">
    <ContentStatus><h1>Publication not found</h1><p>This publication is unavailable or has not been published.</p>
      <a href="#/publications" onClick={(event) => { event.preventDefault(); navigate('/publications') }}>Back to publications</a>
    </ContentStatus>
  </main>
  return <PublicationDetailPage key={publication.id} publication={publication} />
}
