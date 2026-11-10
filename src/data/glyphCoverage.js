import { glyphFontData } from './glyphCoverageData.js'

const basicLatin = Array.from({ length: 52 }, (_, index) =>
  index < 26 ? 65 + index : 97 + index - 26,
)
const fallbackMetrics = { unitsPerEm: 1000, capHeight: 700, xHeight: 480, descent: 220 }

export function getGlyphMetrics(typefaceId, styleName) {
  return glyphFontData[typefaceId]?.[styleName]?.metrics ?? fallbackMetrics
}

export function getGlyphGroups(typefaceId, styleName) {
  const codePoints = glyphFontData[typefaceId]?.[styleName]?.codePoints ?? basicLatin
  const isUppercase = (code) => /\p{Lu}/u.test(String.fromCodePoint(code))
  const isLowercase = (code) => /\p{Ll}/u.test(String.fromCodePoint(code))
  const groups = [
    ['Uppercase', (code) => code >= 65 && code <= 90],
    ['Lowercase', (code) => code >= 97 && code <= 122],
    ['Uppercase accents', (code) => code >= 0xc0 && code <= 0x024f && isUppercase(code)],
    ['Lowercase accents', (code) => code >= 0xc0 && code <= 0x024f && isLowercase(code)],
    ['Cyrillic uppercase', (code) => code >= 0x0400 && code <= 0x052f && isUppercase(code)],
    ['Cyrillic lowercase', (code) => code >= 0x0400 && code <= 0x052f && isLowercase(code)],
    ['Numbers', (code) => code >= 48 && code <= 57],
    ['Combining marks', (code) => /\p{M}/u.test(String.fromCodePoint(code))],
    ['Currency & math', (code) => code === 181 || /[\p{Sc}\p{Sm}]/u.test(String.fromCodePoint(code))],
    ['Punctuation & symbols', () => true],
  ]
  const remaining = new Set(codePoints)

  return groups.map(([title, matches]) => {
    const characters = [...remaining].filter((code) => matches(code)).sort((a, b) => a - b)
    characters.forEach((code) => remaining.delete(code))
    return { title, characters: characters.map((code) => String.fromCodePoint(code)) }
  }).filter((group) => group.characters.length > 0)
}
