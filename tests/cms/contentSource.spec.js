import { test, expect } from '../fixtures'
import { isCmsMockMode } from '../../src/data/contentSource'

for (const { name, env, expected } of [
  { name: 'default environment', env: {}, expected: false },
  { name: 'development default', env: { DEV: true }, expected: false },
  { name: 'old CMS switches', env: { DEV: true, VITE_RESEARCH_SOURCE: 'sanity', VITE_PUBLICATIONS_SOURCE: 'sanity', VITE_TYPEFACES_SOURCE: 'sanity', VITE_ABOUT_SOURCE: 'sanity' }, expected: false },
  { name: 'dedicated mock server', env: { DEV: true, VITE_CMS_MOCK_TESTS: 'true' }, expected: true },
  { name: 'production ignores mock switch', env: { DEV: false, VITE_CMS_MOCK_TESTS: 'true' }, expected: false },
]) {
  test(`Local content isolation: ${name}`, () => {
    expect(isCmsMockMode(env)).toBe(expected)
  })
}

test('the retained adapter rejects CMS access outside the mock server', async () => {
  const { client } = await import('../../src/sanityClient')
  await expect(client.fetch('*[]')).rejects.toThrow('CMS access is disabled')
})
