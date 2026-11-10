import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parse } from '@babel/parser'
import { researchArticles, publicationEntries, typefaceEntries } from '../../src/data/content.js'
import { aboutSections } from '../../src/data/aboutSections.js'

export function descendants(node, predicate) {
  const result = []
  function visit(value) {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach(visit)
    if (typeof value.type === 'string' && predicate(value)) result.push(value)
    for (const [key, child] of Object.entries(value)) {
      if (!['loc', 'extra', 'tokens', 'comments'].includes(key)) visit(child)
    }
  }
  visit(node)
  return result
}

const tag = (node) => node?.openingElement?.name?.name
function attribute(node, name) {
  const attr = node.openingElement.attributes.find((value) => value.name?.name === name)
  if (!attr) return undefined
  if (!attr.value) return true
  return attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value.value
}

function jsxWhitespace(value) {
  const lines = value.replace(/\t/g, ' ').replace(/\r/g, '').split('\n')
  const last = lines.findLastIndex((line) => line.trim())
  return lines.map((line, index) => {
    let text = index === 0 ? line : line.trimStart()
    if (index !== lines.length - 1) text = text.trimEnd()
    return text && index < last ? `${text} ` : text
  }).join('')
}

export function staticText(node) {
  if (node.type === 'JSXText') return jsxWhitespace(node.value)
  if (node.type === 'StringLiteral') return node.value
  if (node.type === 'JSXExpressionContainer' && node.expression.type === 'StringLiteral') return node.expression.value
  if (node.type === 'JSXElement' || node.type === 'JSXFragment') return node.children.map(staticText).join('')
  throw new Error(`Unsupported dynamic content: ${node.type}; update the extractor before importing`)
}

async function readComponent(root, file) {
  const source = await readFile(resolve(root, file), 'utf8')
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] })
  const images = new Map()
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration' && /\.(png|jpe?g)$/i.test(node.source.value)) {
      images.set(node.specifiers[0].local.name, resolve(root, dirname(file), node.source.value))
    }
  }
  return { ast, images }
}

export async function extractLocal(root) {
  const research = await readComponent(root, 'src/pages/ResearchArticlePage.jsx')
  const conditional = descendants(research.ast, (node) => node.type === 'ConditionalExpression' && node.test.name === 'fromCms')[0]
  if (!conditional || conditional.alternate.type !== 'JSXFragment') throw new Error('Research template changed')
  const researchBody = []
  const sourceSection = conditional.alternate.children.find((node) => tag(node) === 'section')
  for (const node of conditional.alternate.children) {
    if (node.type === 'JSXText') continue
    if (tag(node) === 'Paragraph') researchBody.push({ kind: 'paragraph', text: staticText(node) })
    else if (tag(node) === 'Figure') {
      const path = research.images.get(attribute(node, 'src')?.name)
      if (!path) throw new Error('Research image import could not be resolved')
      researchBody.push({ kind: 'image', path, caption: attribute(node, 'caption'), alt: attribute(node, 'caption') })
    } else if (node !== sourceSection) throw new Error(`Unsupported Research block: ${tag(node)}`)
  }
  if (!sourceSection) throw new Error('Research credits/sources are missing')
  const credit = descendants(sourceSection, (node) => tag(node) === 'p').map(staticText)
  if (credit.length !== 2) throw new Error('Research credit structure changed')
  const sources = descendants(sourceSection, (node) => tag(node) === 'li').map((node) => {
    const citation = staticText(node)
    const url = citation.match(/https?:\/\/[^\s<>]+/)?.[0]
    return { citation, ...(url ? { url } : {}) }
  })

  const typefaces = await readComponent(root, 'src/pages/TypefaceDetailPage.jsx')
  const article = descendants(typefaces.ast, (node) => tag(node) === 'article' && attribute(node, 'className') === 'typeface-detail__article')[0]
  if (!article) throw new Error('Typeface article template changed')
  const typefaceBody = []
  for (const node of article.children) {
    if (node.type === 'JSXText') continue
    if (tag(node) === 'p') typefaceBody.push({ kind: 'paragraph', text: staticText(node) })
    else if (tag(node) === 'figure') {
      const image = descendants(node, (value) => tag(value) === 'img')[0]
      const caption = descendants(node, (value) => tag(value) === 'figcaption')[0]
      const path = typefaces.images.get(attribute(image, 'src')?.name)
      if (!path || !caption) throw new Error('Typeface image/caption could not be resolved')
      typefaceBody.push({ kind: 'image', path, caption: staticText(caption), alt: attribute(image, 'alt') })
    } else throw new Error(`Unsupported Typeface block: ${tag(node)}`)
  }
  const constants = new Map(descendants(typefaces.ast, (node) => node.type === 'VariableDeclarator' && node.init?.type === 'StringLiteral').map((node) => [node.id.name, node.init.value]))
  const samples = {}
  for (const node of descendants(typefaces.ast, (value) => tag(value) === 'Tester')) {
    const expression = attribute(node, 'initialText')
    if (expression?.type !== 'CallExpression' || expression.callee.name !== 'sample') continue
    const [key, fallback] = expression.arguments
    if (key.type !== 'StringLiteral') throw new Error('Unsupported tester key')
    const value = fallback.type === 'StringLiteral' ? fallback.value : constants.get(fallback.name)
    if (typeof value !== 'string') throw new Error(`Missing sample: ${key.value}`)
    samples[key.value] = value
  }
  if (Object.keys(samples).length !== 6) throw new Error('Expected six legacy tester samples')
  return {
    researchArticles, publicationEntries, typefaceEntries, aboutSections,
    researchTemplate: { body: researchBody, credits: credit[0], copyright: credit[1], sources },
    typefaceTemplate: { body: typefaceBody, samples },
  }
}
