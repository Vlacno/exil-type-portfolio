import { typefaceItalicWeights } from '../data/content'
import useTypefaceCatalogue from '../hooks/useTypefaceCatalogue'
import ContentStatus from '../components/ContentStatus'
import './TypefacesPage.css'
import PreparedTypefaceGrid from '../components/PreparedTypefaceGrid'

const weightMap = { Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, Black: 900, 'Russo One Regular': 400 }

function TypefacesPage({ navigate }) {
  const { typefaces, loading, error, retry } = useTypefaceCatalogue()
  const contentKey = JSON.stringify(typefaces.map(({ id, name, weights }) => [id, name, weights]))
  return (
    <main className="typefaces-page">
      <PreparedTypefaceGrid className="typefaces-page__grid" contentKey={contentKey}>
        {typefaces.map((typeface) => (
          <a
            className={`typefaces-page-card typefaces-page-card--${typeface.family}${typefaceItalicWeights[typeface.id] ? ' typefaces-page-card--with-italic' : ''}`}
            key={typeface.slug || typeface.id}
            href={`#/typefaces/${typeface.slug || typeface.id}`}
            onClick={(event) => { event.preventDefault(); navigate(`/typefaces/${typeface.slug || typeface.id}`) }}
          >
            <span className="eyebrow typefaces-page-card__label">Typeface name</span>
            <hr className="typefaces-page-card__rule" />
            <div className="typefaces-page-card__samples">
              {typeface.weights.map((weight) => (
                <span data-typeface-sample className={`font-${weight === 'Russo One Regular' ? 'russo-one' : typeface.id}`} key={weight} style={{ fontWeight: weightMap[weight] || 400 }}>
                  {weight === 'Russo One Regular' ? weight : `${typeface.name} ${weight}`}
                  {typefaceItalicWeights[typeface.id]?.includes(weight) && <> <em>Italic</em></>}
                </span>
              ))}
            </div>
          </a>
        ))}
      </PreparedTypefaceGrid>
      {(loading || error || !typefaces.length) && <ContentStatus resource="Typefaces" loading={loading} error={error} retry={retry}>No typefaces have been published yet.</ContentStatus>}
    </main>
  )
}

export default TypefacesPage
