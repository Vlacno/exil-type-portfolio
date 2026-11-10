import { useEffect, useState } from 'react'
import { PortableText } from '@portabletext/react'
import PublicationCover from '../components/PublicationCover'
import FontReady from '../components/FontReady'
import { publicationCoverUrl } from '../data/publicationCoverUrl'
import './PublicationDetailPage.css'

function PublicationDetailPage({ publication }) {
  const [isImageOpen, setIsImageOpen] = useState(false)
  const imageSrc = publicationCoverUrl(publication, 2400)

  useEffect(() => {
    if (!isImageOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsImageOpen(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isImageOpen])

  return (
    <main className="publication-detail">
      <span className="eyebrow publication-detail__label">Title</span>
      <hr className="publication-detail__rule" />
      <FontReady><h1 className="publication-detail__title">{publication.title}</h1></FontReady>
      <div className="publication-detail__metadata">
        <span>{publication.place}</span><span>{publication.year}</span><span>{publication.language}</span>
      </div>
      <hr className="publication-detail__rule publication-detail__rule--bottom" />
      <section className="publication-detail__content">
        <div className="publication-detail__image-panel">
          <button className="publication-detail__image-button" type="button" disabled={!imageSrc} onClick={() => setIsImageOpen(true)} aria-label={`Open ${publication.title} full screen`}>
            <PublicationCover publication={publication} width={1200} sizes="(max-width: 900px) 85vw, 45vw" loading="eager" fetchPriority="high" />
          </button>
        </div>
        <FontReady><div className="publication-detail__description">
          {Array.isArray(publication.description)
            ? <PortableText value={publication.description} components={{ marks: {
              link: ({ children, value }) => typeof value?.href === 'string' && /^(https?:\/\/|mailto:)/i.test(value.href)
                ? <a href={value.href}>{children}</a> : <>{children}</>,
            } }} />
            : <p>{publication.description}</p>}
        </div></FontReady>
      </section>
      {isImageOpen && (
        <div className="publication-image-modal" role="dialog" aria-modal="true" aria-label={`${publication.title} full screen`} onClick={() => setIsImageOpen(false)}>
          <button className="publication-image-modal__close" type="button" aria-label="Close image" onClick={() => setIsImageOpen(false)}>×</button>
          <img src={imageSrc} alt={publication.cover?.alt || publication.title} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </main>
  )
}

export default PublicationDetailPage
