import { researchArticles } from '../data/content'
import { normalizeResearchArticle, researchCatalogueQuery, researchUsesSanity } from '../data/researchQueries'
import useSanityQuery from './useSanityQuery'

export default function useResearchCatalogue() {
  const result = useSanityQuery(researchCatalogueQuery, {}, researchUsesSanity)
  if (!researchUsesSanity) return { articles: researchArticles, featured: researchArticles.slice(0, 2), loading: false, error: false }
  const articles = (result.data?.articles || []).map(normalizeResearchArticle).filter(Boolean)
  // The homepage is code-managed and reuses the first two catalogue entries.
  const featured = articles.slice(0, 2)
  return { ...result, articles, featured }
}
