import { useState } from 'react'
import { aboutSections } from '../data/aboutSections'
import { aboutPageQuery, aboutUseSanity, normalizeAboutSections } from '../data/aboutQueries'
import useSanityQuery from '../hooks/useSanityQuery'
import ContentStatus from '../components/ContentStatus'
import AboutBody from '../components/AboutBody'
import FontReady from '../components/FontReady'
import ImageLightbox from '../components/ImageLightbox'
import './AboutPage.css'

function AboutSections({ sections }) {
  const [openSections, setOpenSections] = useState(() => new Set(sections.length ? [sections[0].id] : []))
  const [image, setImage] = useState(null)
  const toggle = (id) => setOpenSections((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  return <>
    {sections.map(({ id, title, paragraphs, body, email }) => {
      const isOpen = openSections.has(id)
      return <section className="about-page__section" key={id}>
        <h2 className="about-page__heading">
          <button type="button" id={`about-trigger-${id}`} className="about-page__trigger"
            aria-expanded={isOpen} aria-controls={`about-panel-${id}`} onClick={() => toggle(id)}>
            <span>{title}</span>
            <svg className="about-page__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5" /></svg>
          </button>
        </h2>
        <div id={`about-panel-${id}`} className="about-page__panel" role="region" aria-labelledby={`about-trigger-${id}`} hidden={!isOpen}>
          <FontReady><div className="about-page__content">
            {body ? <AboutBody body={body} onOpen={setImage} /> : paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {email && <p><a href={`mailto:${email}`}>{email}</a></p>}
          </div></FontReady>
        </div>
      </section>
    })}
    {image && <ImageLightbox {...image} onClose={() => setImage(null)} />}
  </>
}

function AboutPage() {
  const { data, loading, error, retry } = useSanityQuery(aboutPageQuery, {}, aboutUseSanity)
  const sections = aboutUseSanity ? normalizeAboutSections(data) : aboutSections
  return <main className="about-page" aria-label="About the project">
    {loading || error ? <ContentStatus resource="About" loading={loading} error={error} retry={retry} />
      : sections.length ? <AboutSections sections={sections} />
        : <ContentStatus>No About content has been published yet.</ContentStatus>}
  </main>
}

export default AboutPage
