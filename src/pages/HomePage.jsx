import Hero from '../components/Hero'
import ResearchPreview from '../components/ResearchPreview'
import PublicationsPreview from '../components/PublicationsPreview'
import TypefacesPreview from '../components/TypefacesPreview'

function HomePage({ navigate }) {
  return (
    <>
      <Hero />
      <hr className="section-divider" />
      <ResearchPreview navigate={navigate} />
      <hr className="section-divider" />
      <PublicationsPreview navigate={navigate} />
      <hr className="section-divider" />
      <TypefacesPreview navigate={navigate} />
    </>
  )
}

export default HomePage
