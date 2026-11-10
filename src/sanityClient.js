import { sanityProject } from '../shared/sanityConfig'
import { cmsMockMode, contentSources } from './data/contentSource'

// Component fixtures never use the network transport or cloud image CDN.
const mockClient = {
  config: () => ({ projectId: 'portfolio', dataset: 'demo', apiHost: '/__cms_mock__' }),
  async fetch(query, params = {}, { signal } = {}) {
    if (!cmsMockMode || !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      throw new Error('CMS access is disabled in the local portfolio')
    }
    const url = new URL('/__cms_mock__/data/query/demo', window.location.origin)
    url.searchParams.set('query', query)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value))
    const response = await fetch(url, { signal, credentials: 'omit', redirect: 'error' })
    if (!response.ok) throw new Error('Local CMS mock request failed')
    return (await response.json()).result
  },
}

const env = import.meta.env || {}
const sanityConfig = Object.freeze({
  ...sanityProject,
  apiVersion: '2025-02-19',
  perspective: 'published',
  useCdn: env.VITE_SANITY_USE_CDN === 'true' || (env.VITE_SANITY_USE_CDN !== 'false' && !env.DEV),
  withCredentials: false,
})
let liveClient

// Expose only the read operations used by the frontend, never mutation methods.
// The default local mode rejects accidental API reads before any request starts.
export const client = cmsMockMode ? mockClient : {
  config: () => sanityConfig,
  async fetch(...args) {
    if (!Object.values(contentSources).some(Boolean)) {
      throw new Error('CMS access is disabled in the local portfolio')
    }
    // Local mode does not download or initialize the SDK. CMS sections share
    // the same lazily created client once they are explicitly enabled.
    if (!liveClient) {
      const { createClient } = await import('@sanity/client')
      liveClient ||= createClient({ ...sanityConfig })
    }
    return liveClient.fetch(...args)
  },
}
