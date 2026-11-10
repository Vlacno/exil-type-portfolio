import { contentSources } from './contentSource'
import { defineQuery } from 'groq'
import { typefaceEntries } from './content'

const cardFields = `_id, "slug": slug.current, name, fontKey`
export const typefaceCatalogueQuery = defineQuery(`
  *[_type == "typeface" && defined(slug.current)] | order(order asc, name asc, _id asc) { ${cardFields} }
`)
export const typefaceDetailQuery = defineQuery(`
  *[_type == "typeface" && slug.current == $slug][0] {
    ${cardFields}, samples, releaseDate, version, formats, variableFile, designer,
    openTypeFeatures, supportedLanguages, trialInfo, testerMode,
    testerBlocks[]{_key, text, mobileText,
      desktop{fontKey, style, fontSize, autoFit, lineHeight, letterSpacing, align, columns},
      mobile{fontKey, style, fontSize, autoFit, lineHeight, letterSpacing, align, columns}
    },
    body[]{ _key, _type, style, listItem, level, children, markDefs,
      _type == "typefaceImage" => { alt, caption, image { crop, hotspot, asset->{_id, metadata{dimensions}} } }
    }
  }
`)

// Only technical properties are reused, never local editorial content.
export function normalizeTypeface(value) {
  const technical = typefaceEntries.find((entry) => entry.id === value?.fontKey)
  if (!technical || typeof value.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || typeof value.name !== 'string' || !value.name.trim()) return null
  const normalized = {
    _id: value._id, id: technical.id, fontKey: technical.id, slug: value.slug, name: value.name.trim(),
    weights: technical.weights, family: technical.family,
    body: Array.isArray(value.body) ? value.body : [],
    samples: value.samples && typeof value.samples === 'object' ? value.samples : {},
    testerMode: value.testerMode || (Array.isArray(value.testerBlocks) ? 'custom' : 'legacy'),
    testerBlocks: Array.isArray(value.testerBlocks) ? value.testerBlocks.filter((block) => block && typeof block._key === 'string') : [],
  }
  for (const key of ['releaseDate', 'version', 'formats', 'variableFile', 'designer', 'openTypeFeatures', 'supportedLanguages', 'trialInfo']) {
    normalized[key] = typeof value[key] === 'string' ? value[key].trim() : ''
  }
  return normalized
}

export const typefacesUseSanity = contentSources.typefaces
