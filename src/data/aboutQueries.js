import { contentSources } from './contentSource'
import { defineQuery } from 'groq'

export const aboutUseSanity = contentSources.about
export const aboutPageQuery = defineQuery(`
  *[_type == "aboutPage" && _id == "aboutPage"][0] {
    _id,
    sections[]{_key, title, email,
      body[]{_key, _type, style, listItem, level, children, markDefs,
        _type == "researchImage" => {alt, caption, credit,
          image{crop, hotspot, asset->{_id, metadata{dimensions}}}
        }
      }
    }
  }
`)

export function normalizeAboutSections(data) {
  const keys = new Set()
  return (Array.isArray(data?.sections) ? data.sections : []).flatMap((section) => {
    if (!section || typeof section._key !== 'string' || !section._key || keys.has(section._key)
      || typeof section.title !== 'string' || !section.title.trim()) return []
    keys.add(section._key)
    return [{
      id: section._key, title: section.title.trim(),
      body: Array.isArray(section.body) ? section.body : [],
      email: typeof section.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(section.email.trim()) ? section.email.trim() : '',
    }]
  })
}
