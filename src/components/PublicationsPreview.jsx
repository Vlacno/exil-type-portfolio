import SectionHeader from './SectionHeader'
import usePublicationCatalogue from '../hooks/usePublicationCatalogue'
import PublicationCover from './PublicationCover'
import ContentStatus from './ContentStatus'
import './PublicationsPreview.css'

function PublicationsPreview({ navigate }) {
  const { publications, loading, error, retry } = usePublicationCatalogue()
  return (
    <section className="publications">
      <SectionHeader title="Publications" path="/publications" navigate={navigate} />

      <div className="publications__grid">
        {publications.slice(0, 12).map((pub) => (
          <a
            key={pub.id}
            href={`#/publications/${pub.id}`}
            className="pub-thumb"
            aria-label={pub.title}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/publications/${pub.id}`)
            }}
          >
            <PublicationCover
              publication={pub}
              className="pub-thumb__image"
            />
          </a>
        ))}
      </div>
      {(loading || error || !publications.length) && <ContentStatus resource="Publications" loading={loading} error={error} retry={retry}>No publications have been published yet.</ContentStatus>}
    </section>
  )
}

export default PublicationsPreview
