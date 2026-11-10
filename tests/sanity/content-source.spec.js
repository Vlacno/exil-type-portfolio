import { test, expect } from '../fixtures'
import { usesSanitySource } from '../../src/data/contentSource'
import { sanityProject } from '../../shared/sanityConfig'

for (const section of ['research', 'publications', 'typefaces', 'about']) {
  test(`${section}: local by default, independent opt-in and global switch`, () => {
    const key = `VITE_${section.toUpperCase()}_SOURCE`
    expect(usesSanitySource(section, {})).toBe(false)
    expect(usesSanitySource(section, { VITE_CONTENT_SOURCE: 'local' })).toBe(false)
    expect(usesSanitySource(section, { [key]: 'sanity' })).toBe(true)
    expect(usesSanitySource(section, { VITE_CONTENT_SOURCE: 'sanity' })).toBe(true)
    expect(usesSanitySource(section, { VITE_CONTENT_SOURCE: 'sanity', [key]: 'local' })).toBe(false)
    expect(usesSanitySource(section, { [key]: 'invalid' })).toBe(false)
    expect(usesSanitySource(section, { DEV: false, VITE_CMS_MOCK_TESTS: 'true' })).toBe(false)
    expect(usesSanitySource(section, { DEV: true, VITE_CMS_MOCK_TESTS: 'true' })).toBe(true)
  })
}

test('the public target is the independent project and contains no credentials', () => {
  expect(sanityProject).toEqual({ projectId: 'e1din49w', dataset: 'production' })
})
