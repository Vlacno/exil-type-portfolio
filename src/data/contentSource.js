// Local content is the default in development and production. The explicit
// localhost-only mock switch takes precedence during component tests.
export function isCmsMockMode(env) {
  return env.DEV === true && env.VITE_CMS_MOCK_TESTS === 'true'
}

export function usesSanitySource(section, env) {
  if (isCmsMockMode(env)) return true
  const source = env[`VITE_${section.toUpperCase()}_SOURCE`] || env.VITE_CONTENT_SOURCE || 'local'
  return source === 'sanity'
}

const env = import.meta.env || {}
export const cmsMockMode = isCmsMockMode(env)
export const contentSources = Object.fromEntries(
  ['research', 'publications', 'typefaces', 'about'].map((section) => [section, usesSanitySource(section, env)]),
)
