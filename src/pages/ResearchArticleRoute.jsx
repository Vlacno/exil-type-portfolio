import { researchArticles } from '../data/content'
import { normalizeResearchArticle, researchArticleQuery, researchUsesSanity } from '../data/researchQueries'
import useSanityQuery from '../hooks/useSanityQuery'
import ContentStatus from '../components/ContentStatus'
import ResearchArticlePage from './ResearchArticlePage'

export default function ResearchArticleRoute({ slug, navigate }) {
  const { data, loading, error, retry } = useSanityQuery(researchArticleQuery, { slug }, researchUsesSanity)
  if (loading || error) return <main className="research-article"><ContentStatus variant="article" loading={loading} error={error} retry={retry} /></main>
  const article = researchUsesSanity
    ? normalizeResearchArticle(data)
    : researchArticles.find((item) => item.id === slug)
  if (!article) return <main className="research-article">
    <ContentStatus><h1>Article not found</h1><p>This article is unavailable or has not been published.</p>
      <a href="#/research" onClick={(event) => { event.preventDefault(); navigate('/research') }}>Back to research</a>
    </ContentStatus>
  </main>
  return <ResearchArticlePage key={article.id} article={article} fromCms={researchUsesSanity} />
}
