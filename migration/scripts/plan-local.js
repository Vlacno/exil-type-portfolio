import { readFile, realpath } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { resolve, relative, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sanityProject } from '../../shared/sanityConfig.js'
import { characterStyles } from '../../shared/typefaceStyles.js'
import { extractLocal } from './extract-local.js'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const TARGET = Object.freeze({ projectId: 'e1din49w', dataset: 'production' })
export const hash = (value, algorithm = 'sha256') => createHash(algorithm).update(value).digest('hex')
const portable = (value) => value.split(sep).join('/')
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const allowedHeadingFonts = new Set(['source-serif-4', 'inter', 'unbounded', 'roboto-condensed', 'russo-one', 'ruslan-display'])
const schemaFiles = ['researchArticle', 'researchBody', 'researchImage', 'publication', 'typeface', 'aboutPage', 'testerBlocks']

export function assertTarget(target) {
  if (target?.projectId !== TARGET.projectId || target?.dataset !== TARGET.dataset) throw new Error('Import target must be e1din49w / production')
}

export function imageInfo(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 8 < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker')
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xda || marker === 0xd9) break
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue
      const length = bytes.readUInt16BE(offset)
      if (length < 2) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mimeType: 'image/jpeg', height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) }
      }
      offset += length
    }
  }
  throw new Error('Only valid local PNG/JPEG images may be uploaded; font files are excluded')
}

export function paragraph(text, key) {
  return { _type: 'block', _key: key, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'text', text, marks: [] }] }
}

export async function buildPlan(root = ROOT) {
  assertTarget(sanityProject)
  const extracted = await extractLocal(root)
  const assets = new Map()
  const assetsRoot = await realpath(resolve(root, 'src/assets'))
  async function image(path, alt) {
    const actual = await realpath(path)
    const inside = relative(assetsRoot, actual)
    if (inside.startsWith('..') || isAbsolute(inside) || !/\.(png|jpe?g)$/i.test(actual)) throw new Error('Image path must stay inside src/assets')
    const bytes = await readFile(actual)
    const info = imageInfo(bytes)
    if (!(info.width > 0 && info.height > 0)) throw new Error('Invalid image dimensions')
    const sha256 = hash(bytes)
    const key = `pending-image-${sha256}`
    const pathRelative = portable(relative(root, actual))
    if (!assets.has(key)) assets.set(key, { key, sha256, sha1: hash(bytes, 'sha1'), bytes: bytes.length, ...info, paths: [] })
    if (!assets.get(key).paths.includes(pathRelative)) assets.get(key).paths.push(pathRelative)
    return { _type: 'image', alt, asset: { _type: 'reference', _ref: key } }
  }
  async function richBody(template, imageType) {
    return Promise.all(template.map(async (block, index) => {
      if (block.kind === 'paragraph') return paragraph(block.text, `paragraph-${index}`)
      if (block.kind !== 'image') throw new Error('Unsupported rich text block')
      return { _type: imageType, _key: `image-${index}`, alt: block.alt, caption: block.caption, image: await image(block.path, undefined) }
    }))
  }
  const documents = []
  const researchBody = await richBody(extracted.researchTemplate.body, 'researchImage')
  for (const [order, entry] of extracted.researchArticles.entries()) {
    documents.push({
      _id: `drafts.portfolio-local-researchArticle-${entry.id}`, _type: 'researchArticle',
      title: entry.title, slug: { _type: 'slug', current: entry.id }, summary: entry.summary, font: entry.font, order,
      body: structuredClone(researchBody), credits: extracted.researchTemplate.credits, copyright: extracted.researchTemplate.copyright,
      sources: extracted.researchTemplate.sources.map((source, index) => ({ _type: 'researchSource', _key: `source-${index}`, ...source })),
    })
  }
  for (const [order, entry] of extracted.publicationEntries.entries()) {
    documents.push({
      _id: `drafts.portfolio-local-publication-${entry.id}`, _type: 'publication', title: entry.title,
      slug: { _type: 'slug', current: entry.id }, place: entry.place, year: entry.year, language: entry.language, order,
      cover: await image(resolve(root, `src/assets/publications/${entry.imageId}.jpg`), entry.title),
      description: [paragraph(entry.description, 'description')],
    })
  }
  const typefaceBody = await richBody(extracted.typefaceTemplate.body, 'typefaceImage')
  for (const [order, entry] of extracted.typefaceEntries.entries()) {
    const doc = {
      _id: `drafts.portfolio-local-typeface-${entry.id}`, _type: 'typeface',
      name: entry.id === 'roboto-condensed-russo-one' ? 'Roboto Condensed / Russo One' : entry.name,
      slug: { _type: 'slug', current: entry.id }, fontKey: entry.id, order,
      body: [paragraph(entry.description, 'font-description'), ...structuredClone(typefaceBody)],
      testerMode: 'legacy', samples: { ...extracted.typefaceTemplate.samples },
    }
    for (const field of ['releaseDate', 'version', 'formats', 'variableFile', 'designer', 'openTypeFeatures', 'supportedLanguages', 'trialInfo']) {
      if (entry[field]) doc[field] = entry[field]
    }
    if (entry.licenseUrl) doc.body.push({ ...paragraph('SIL Open Font License 1.1', 'font-license'), markDefs: [{ _key: 'license', _type: 'link', href: entry.licenseUrl }], children: [{ _type: 'span', _key: 'text', text: 'SIL Open Font License 1.1', marks: ['license'] }] })
    documents.push(doc)
  }
  documents.push({
    _id: 'drafts.aboutPage', _type: 'aboutPage', sections: extracted.aboutSections.map((section) => ({
      _type: 'aboutSection', _key: section.id, title: section.title,
      body: section.paragraphs.map((text, index) => paragraph(text, `${section.id}-${index}`)),
      ...(section.email ? { email: section.email } : {}),
    })),
  })
  const fingerprints = {}
  for (const file of ['src/data/content.js', 'src/data/aboutSections.js', 'src/pages/ResearchArticlePage.jsx', 'src/pages/TypefaceDetailPage.jsx', 'shared/typefaceStyles.js', 'shared/sanityConfig.js', ...schemaFiles.map((name) => `studio/schemas/${name}.js`)]) {
    fingerprints[file] = hash(await readFile(resolve(root, file)))
  }
  const warnings = [
    { code: 'RIGHTS_REVIEW', message: 'Research text has an explicit all-rights-reserved notice. Image upload/redistribution rights are unverified; font OFL licenses do not cover these images or texts. Draft image assets are not a private archive.' },
    { code: 'SHARED_RESEARCH_BODY', message: 'All five Research routes currently render the same shared JSX article, images, credits and bibliography. Each draft preserves that content, but its relevance to each title must be reviewed.' },
    { code: 'SHARED_TYPEFACE_BODY', message: 'All five Typeface routes reuse a shared historical article and image. Drafts include the local font description followed by that shared article and a license link; the extra introduction is newly visible in CMS mode.' },
    { code: 'LEGACY_TESTERS', message: 'Six real tester texts per Typeface are stored in the existing legacy samples fields to preserve responsive behavior. Those fields are read-only in Studio; conversion to editable custom testerBlocks is a separate content/design decision.' },
    { code: 'CONTENT_REVIEW', message: 'Publication descriptions and dates are local demo copy. Research summaries repeat; one bibliography entry has a relative/incomplete source path. Alt texts derived from existing captions/titles need editorial review.' },
    { code: 'ABOUT_CLAIMS', message: 'About retains existing PhD, institutional support and contact claims. Confirm these statements are appropriate for this independent portfolio.' },
  ]
  // Concurrent reads must not make the reviewed manifest depend on I/O timing.
  // Canonicalize assets and aliases without reordering documents or rich text.
  const assetManifest = [...assets.values()]
    .map((asset) => ({ ...asset, paths: [...asset.paths].sort() }))
    .sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  const plan = {
    format: 'exil-local-import-v1', target: { ...TARGET }, mode: 'drafts-only-create-missing',
    sourceFingerprints: fingerprints, documents, assets: assetManifest, warnings,
    counts: Object.fromEntries(['researchArticle', 'publication', 'typeface', 'aboutPage'].map((type) => [type, documents.filter((doc) => doc._type === type).length])),
  }
  validatePlan(plan)
  plan.approvalHash = hash(JSON.stringify(plan))
  // Snapshot is portable and does not copy binaries, font files, credentials or environment variables.
  const snapshot = JSON.parse(JSON.stringify(extracted), (key, value) => key === 'path' && typeof value === 'string' ? portable(relative(root, value)) : value)
  return { plan, snapshot }
}

export function assetReferences(value) {
  if (!value || typeof value !== 'object') return []
  if (value._type === 'reference') return [value._ref]
  return Object.values(value).flatMap(assetReferences)
}

export function validatePlan(plan) {
  assertTarget(plan.target)
  if (plan.format !== 'exil-local-import-v1' || plan.mode !== 'drafts-only-create-missing') throw new Error('Unsupported import format or publication mode')
  const ids = new Set(), slugs = new Set(), assetKeys = new Set(plan.assets.map((asset) => asset.key))
  const required = { researchArticle: ['title', 'summary', 'font', 'body'], publication: ['title', 'place', 'year', 'language', 'cover', 'description'], typeface: ['name', 'fontKey', 'body', 'samples'], aboutPage: ['sections'] }
  function rich(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) throw new Error('Required Portable Text is empty')
    const keys = new Set()
    for (const block of blocks) {
      if (!block._key || keys.has(block._key)) throw new Error('Duplicate or missing Portable Text key')
      keys.add(block._key)
      if (block._type === 'block') {
        if (block.style !== 'normal' || !Array.isArray(block.markDefs) || !Array.isArray(block.children) || !block.children.length) throw new Error('Invalid Portable Text block')
        for (const span of block.children) {
          if (span._type !== 'span' || typeof span.text !== 'string' || !Array.isArray(span.marks)) throw new Error('Invalid text span')
          if (span.marks.some((mark) => !['strong', 'em'].includes(mark) && !block.markDefs.some((def) => def._key === mark))) throw new Error('Unresolved text mark')
        }
        for (const mark of block.markDefs) if (mark._type !== 'link' || !/^(https?:\/\/|mailto:)/i.test(mark.href)) throw new Error('Unsafe rich text link')
      } else if (!['researchImage', 'typefaceImage'].includes(block._type) || !block.alt?.trim() || block.image?._type !== 'image') throw new Error('Invalid image block')
    }
  }
  for (const doc of plan.documents) {
    if (!required[doc._type] || !doc._id.startsWith('drafts.') || ids.has(doc._id)) throw new Error('Invalid or duplicate draft ID')
    if (doc._type !== 'aboutPage' && !doc._id.startsWith(`drafts.portfolio-local-${doc._type}-`)) throw new Error('Unexpected import document ID')
    if (doc._type === 'aboutPage' && doc._id !== 'drafts.aboutPage') throw new Error('About singleton ID must be aboutPage')
    ids.add(doc._id)
    for (const field of required[doc._type]) if (doc[field] === undefined || doc[field] === '') throw new Error(`Missing ${doc._type}.${field}`)
    if (doc._type !== 'aboutPage') {
      const slug = doc.slug?.current, key = `${doc._type}:${slug}`
      if (!slugPattern.test(slug || '') || slugs.has(key)) throw new Error('Invalid or duplicate source slug')
      slugs.add(key)
      if (!Number.isInteger(doc.order) || doc.order < 0) throw new Error('Invalid catalogue order')
    }
    if (doc._type === 'researchArticle' && !allowedHeadingFonts.has(doc.font)) throw new Error('Disallowed heading font')
    if (doc._type === 'typeface') {
      if (!characterStyles[doc.fontKey] || doc.testerMode !== 'legacy' || Object.values(doc.samples).some((text) => typeof text !== 'string' || !text.trim()) || Object.keys(doc.samples).length !== 6) throw new Error('Invalid free font or tester samples')
      if (!['Source Serif 4', 'Inter', 'Unbounded', 'Roboto Condensed / Russo One', 'Ruslan Display'].includes(doc.name)) throw new Error('Disallowed typeface name')
    }
    if (doc.body) rich(doc.body)
    if (doc.description) rich(doc.description)
    if (doc._type === 'publication' && (doc.cover._type !== 'image' || !doc.cover.alt)) throw new Error('Missing publication cover/alt')
    if (doc._type === 'aboutPage') {
      if (!Array.isArray(doc.sections) || !doc.sections.length || new Set(doc.sections.map((section) => section._key)).size !== doc.sections.length) throw new Error('Invalid About sections')
      for (const section of doc.sections) {
        if (section._type !== 'aboutSection' || !section._key || !section.title || section.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(section.email)) throw new Error('Invalid About section')
        rich(section.body)
      }
    }
    for (const ref of assetReferences(doc)) if (!assetKeys.has(ref)) throw new Error('Unresolved local asset reference')
  }
  if (assetKeys.size !== plan.assets.length) throw new Error('Duplicate asset manifest key')
  for (const asset of plan.assets) if (!['image/jpeg', 'image/png'].includes(asset.mimeType) || !asset.paths.length || !/^[a-f0-9]{64}$/.test(asset.sha256) || asset.key !== `pending-image-${asset.sha256}`) throw new Error('Invalid asset manifest')
  return plan
}
