import SectionHeader from './SectionHeader'
import useResearchCatalogue from '../hooks/useResearchCatalogue'
import ContentStatus from './ContentStatus'
import FontReady from './FontReady'
import './ResearchPreview.css'

function ResearchPreview({ navigate }) {
  const { featured, loading, error, retry } = useResearchCatalogue()
  return (
    <section className="research">
      <SectionHeader title="Research" path="/research" navigate={navigate} />

      <div className="research__grid">
        {featured.map((item) => (
          <FontReady key={item.id}><a
            className={`research-card research-card--${item.style} research-card--${item.font}`}
            key={item.id}
            href={`#/research/${item.id}`}
            onClick={(event) => { event.preventDefault(); navigate(`/research/${item.id}`) }}
          >
            <span className="eyebrow research-card__label">Title</span>
            <hr className="research-card__rule research-card__rule--header" />
            <h3 className="research-card__title">{item.title}</h3>
            <hr className="research-card__rule" />

            <span className="eyebrow research-card__label">Summary</span>
            <hr className="research-card__rule research-card__rule--summary" />
            <p className="research-card__summary">{item.summary}</p>
          </a></FontReady>
        ))}
      </div>
      {(loading || error || !featured.length) && <div className="research__status"><ContentStatus loading={loading} error={error} retry={retry}>No featured research articles yet.</ContentStatus></div>}
    </section>
  )
}

export default ResearchPreview
