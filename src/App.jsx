import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'
import ResearchPage from './pages/ResearchPage'
import ResearchArticleRoute from './pages/ResearchArticleRoute'
import PublicationsPage from './pages/PublicationsPage'
import PublicationDetailRoute from './pages/PublicationDetailRoute'
import TypefacesPage from './pages/TypefacesPage'
import TypefaceDetailRoute from './pages/TypefaceDetailRoute'
import AboutPage from './pages/AboutPage'
import { useHashRoute } from './useHashRoute'
import useRoutePrefetch from './hooks/useRoutePrefetch'
import './components/NavigationProgress.css'

const pageTitles = {
  research: 'Research',
  publications: 'Publications',
  typefaces: 'Typefaces',
  about: 'About',
}

function renderPage(path, navigate) {
  if (path === '/') {
    return <HomePage navigate={navigate} />
  }

  if (path === '/research') {
    return <ResearchPage navigate={navigate} />
  }

  if (path.startsWith('/research/')) {
    const articleId = path.split('/')[2]
    return <ResearchArticleRoute key={articleId} slug={articleId} navigate={navigate} />
  }

  if (path === '/publications') {
    return <PublicationsPage navigate={navigate} />
  }

  if (path.startsWith('/publications/')) {
    const publicationId = path.split('/')[2]
    return <PublicationDetailRoute key={publicationId} slug={publicationId} navigate={navigate} />
  }

  if (path === '/typefaces') {
    return <TypefacesPage navigate={navigate} />
  }

  if (path.startsWith('/typefaces/')) {
    const typefaceId = path.split('/')[2]
    return <TypefaceDetailRoute key={typefaceId} slug={typefaceId} navigate={navigate} />
  }

  if (path === '/about') {
    return <AboutPage />
  }

  const [, section] = path.split('/')
  const title = pageTitles[section] || 'Page not found'
  return <PlaceholderPage title={title} navigate={navigate} />
}

function App() {
  useRoutePrefetch()
  const { path, navigate, pending } = useHashRoute()

  return (
    <div className="site">
      <Header path={path} navigate={navigate} />
      {pending && <div className="navigation-progress" role="status" aria-label="Loading page"><span className="content-skeleton__label">Loading page</span></div>}
      <div className="site__content" aria-busy={pending}>{renderPage(path, navigate)}</div>
      <Footer />
    </div>
  )
}

export default App
