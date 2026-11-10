import { contentSources } from './contentSource'
import { defineQuery } from 'groq'

const publicationFields = `_id, "id": slug.current, title, place, year, language,
  cover { alt, crop, hotspot, asset->{_id, metadata{dimensions}} }`

export const publicationCatalogueQuery = defineQuery(`
  *[_type == "publication" && defined(slug.current)] | order(order asc, title asc, _id asc) {
    ${publicationFields}
  }
`)

export const publicationDetailQuery = defineQuery(`
  *[_type == "publication" && slug.current == $slug][0] {
    ${publicationFields}, description[]{_key, _type, style, children, markDefs}
  }
`)

const text = (value) => typeof value === 'string' ? value.trim() : ''
export function normalizePublication(value) {
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.id) || !text(value.title)) return null
  return {
    ...value, title: text(value.title), place: text(value.place),
    year: text(value.year), language: text(value.language),
    description: Array.isArray(value.description) ? value.description : [],
  }
}

export const publicationsUseSanity = contentSources.publications
