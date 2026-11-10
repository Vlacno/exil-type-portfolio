import SectionHeader from './SectionHeader'
import { typefaceItalicWeights } from '../data/content'
import useTypefaceCatalogue from '../hooks/useTypefaceCatalogue'
import ContentStatus from './ContentStatus'
import './TypefacesPreview.css'
import PreparedTypefaceGrid from './PreparedTypefaceGrid'

const weightMap = {
  Light: 300,
  Regular: 400,
  Medium: 500,
  Bold: 700,
  Black: 900,
}

function TypefacesPreview({ navigate }) {
  const { typefaces, loading, error, retry } = useTypefaceCatalogue()
  const featured = typefaces.filter((tf) => tf.id === 'unbounded' || tf.id === 'source-serif-4')
  const contentKey = JSON.stringify(featured.map(({ id, name, weights }) => [id, name, weights]))
  return (
    <section className="typefaces">
      <SectionHeader title="Typefaces" path="/typefaces" navigate={navigate} />

      <PreparedTypefaceGrid className="typefaces__grid" contentKey={contentKey}>
        {featured.map((tf) => (
          <a
            key={tf.slug || tf.id}
            href={`#/typefaces/${tf.slug || tf.id}`}
            className={`typeface-card typeface-card--${tf.id}${typefaceItalicWeights[tf.id] ? ' typeface-card--with-italic' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/typefaces/${tf.slug || tf.id}`)
            }}
          >
            <span className="eyebrow typeface-card__label">Typeface name</span>
            <hr className="typeface-card__rule" />
            <div className="typeface-card__samples">
              {tf.weights.map((weight) => (
                <span
                  data-typeface-sample
                  key={weight}
                  className={`typeface-card__sample font-${tf.id}`}
                  style={{ fontWeight: weightMap[weight] || 400 }}
                >
                  {tf.name} {weight}
                  {typefaceItalicWeights[tf.id]?.includes(weight) && <> <em>Italic</em></>}
                </span>
              ))}
            </div>
          </a>
        ))}
      </PreparedTypefaceGrid>
      {(loading || error || !featured.length) && <ContentStatus resource="Typefaces" loading={loading} error={error} retry={retry}>No featured typefaces have been published yet.</ContentStatus>}
    </section>
  )
}

export default TypefacesPreview
