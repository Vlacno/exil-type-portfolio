import { PortableText } from '@portabletext/react'
import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from '../sanityClient'
import ContentImage from './ContentImage'
import { imageDimensions } from '../data/imageDimensions'

const imageBuilder = createImageUrlBuilder(client)
const safeLink = (href) => typeof href === 'string' && /^(https?:\/\/|mailto:)/i.test(href)

function isEmptyParagraph(block) {
  return block?._type === 'block'
    && (!block.style || block.style === 'normal')
    && !block.listItem
    && Array.isArray(block.children)
    && block.children.every((child) => child._type === 'span' && typeof child.text === 'string' && !child.text.trim())
}

function ResearchImage({ value, onOpen }) {
  if (!value.image?.asset) return null
  let src
  let large
  try {
    src = imageBuilder.image(value.image).width(1200).fit('max').auto('format').url()
    large = imageBuilder.image(value.image).width(2400).fit('max').auto('format').url()
  } catch { return null }
  return <figure className="research-article__figure">
    <button type="button" className="research-article__image-button" onClick={() => onOpen(large, value.alt || '')} aria-label={`Open ${value.alt || 'image'} full screen`}>
      <ContentImage src={src} alt={value.alt || ''} {...imageDimensions(value.image)} />
    </button>
    {(value.caption || value.credit) && <figcaption>{value.caption}{value.caption && value.credit && ' — '}{value.credit}</figcaption>}
  </figure>
}

export default function ResearchBody({ article, onOpen }) {
  const components = {
    block: {
      normal: ({ children }) => <p className="research-article__paragraph">{children}</p>,
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
      blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    },
    list: {
      bullet: ({ children }) => <ul>{children}</ul>,
      number: ({ children }) => <ol>{children}</ol>,
    },
    marks: {
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      link: ({ children, value }) => safeLink(value?.href) ? <a href={value.href}>{children}</a> : <>{children}</>,
    },
    types: { researchImage: ({ value }) => <ResearchImage value={value} onOpen={onOpen} /> },
  }
  const sources = (article.sources || []).filter((source) => source?.citation)
  const hasSources = Boolean(article.credits || article.copyright || sources.length)
  const body = Array.isArray(article.body) ? article.body : []
  let end = body.length
  // The editor can retain a trailing paragraph after an image. Do not mutate CMS data.
  while (end > 0 && isEmptyParagraph(body[end - 1])) end -= 1
  return <>
    <div className={`research-article__rich-text${hasSources ? '' : ' research-article__rich-text--standalone'}`}>
      <PortableText value={body.slice(0, end)} components={components} />
    </div>
    {hasSources && <section className="research-article__sources">
      <div className="research-article__credit">
        {article.credits && <p>{article.credits}</p>}
        {article.copyright && <p>{article.copyright}</p>}
      </div>
      {sources.length > 0 && <ol className="research-article__references">
        {sources.map((source) => <li key={source._key}>{source.citation}{safeLink(source.url) && <> <a href={source.url}>Source</a></>}</li>)}
      </ol>}
    </section>}
  </>
}
