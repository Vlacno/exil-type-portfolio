import useResearchCatalogue from '../hooks/useResearchCatalogue'
import ContentStatus from '../components/ContentStatus'
import './ResearchPage.css'
import ClampedResearchTitle from '../components/ClampedResearchTitle'
import FontReady from '../components/FontReady'

function ResearchPage({ navigate }) {
  const { articles, loading, error, retry } = useResearchCatalogue()
  return (
    <main className="research-page">
      <div className="research-page__grid">
        {articles.map((item) => (
          <FontReady key={item.id}><a
            className={`research-page-card research-page-card--${item.style} research-page-card--${item.font}`}
            key={item.id}
            href={`#/research/${item.id}`}
            onClick={(event) => { event.preventDefault(); navigate(`/research/${item.id}`) }}
          >
            <span className="eyebrow research-page-card__label">Title</span>
            <hr className="research-page-card__rule research-page-card__rule--header" />
            {item.font === 'ruslan-display'
              ? <ClampedResearchTitle className="research-page-card__title" title={item.title} />
              : <h1 className="research-page-card__title">{item.title}</h1>}
            <hr className="research-page-card__rule research-page-card__rule--title" />
            <div className="research-page-card__bottom">
              <span className="eyebrow research-page-card__label">Summary</span>
              <hr className="research-page-card__rule" />
              <p className="research-page-card__summary">{item.summary}</p>
            </div>
          </a></FontReady>
        ))}
      </div>
      {(loading || error || !articles.length) && <ContentStatus loading={loading} error={error} retry={retry}>No research articles have been published yet.</ContentStatus>}
    </main>
  )
}

export default ResearchPage
