import { contentSources } from './contentSource'
import { defineQuery } from 'groq'

const cardFields = `_id, "id": slug.current, title, summary, font`

export const researchCatalogueQuery = defineQuery(`{
  "articles": *[_type == "researchArticle" && defined(slug.current)] | order(order asc, title asc, _id asc) { ${cardFields} }
}`)

export const researchArticleQuery = defineQuery(`
  *[_type == "researchArticle" && slug.current == $slug][0] {
    ${cardFields}, credits, copyright, sources[]{_key, citation, url},
    body[]{
      _key, _type, style, listItem, level, children, markDefs,
      _type == "researchImage" => {
        alt, caption, credit,
        image { crop, hotspot, asset->{_id, url, metadata{dimensions}} }
      }
    }
  }
`)

const fonts = new Set(['source-serif-4', 'unbounded', 'roboto-condensed', 'russo-one', 'inter', 'ruslan-display'])
export function normalizeResearchArticle(article) {
  if (!article || typeof article.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id) || typeof article.title !== 'string' || !article.title.trim()) return null
  return { ...article, summary: article.summary || '', font: fonts.has(article.font) ? article.font : 'source-serif-4' }
}

export const researchUsesSanity = contentSources.research
