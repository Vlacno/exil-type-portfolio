import { PortableText } from '@portabletext/react'
import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from '../sanityClient'
import ContentImage from './ContentImage'
import { imageDimensions } from '../data/imageDimensions'

const builder = createImageUrlBuilder(client)

function AboutImage({ value, onOpen }) {
  if (!value.image?.asset) return null
  let src, large
  try {
    src = builder.image(value.image).width(1200).fit('max').auto('format').url()
    large = builder.image(value.image).width(2400).fit('max').auto('format').url()
  } catch { return null }
  return <figure>
    <button className="about-page__image-button" type="button" onClick={() => onOpen({ src: large, alt: value.alt || '' })} aria-label={`Open ${value.alt || 'image'} full screen`}>
      <ContentImage src={src} alt={value.alt || ''} {...imageDimensions(value.image)} />
    </button>
    {(value.caption || value.credit) && <figcaption>{value.caption}{value.caption && value.credit && ' — '}{value.credit}</figcaption>}
  </figure>
}

export default function AboutBody({ body, onOpen }) {
  const components = {
    block: {
      normal: ({ children }) => <p>{children}</p>,
      h2: ({ children }) => <h3>{children}</h3>,
      h3: ({ children }) => <h4>{children}</h4>,
      blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    },
    list: { bullet: ({ children }) => <ul>{children}</ul>, number: ({ children }) => <ol>{children}</ol> },
    marks: {
      link: ({ value, children }) => typeof value?.href === 'string' && /^(https?:\/\/|mailto:)/i.test(value.href)
        ? <a href={value.href}>{children}</a> : <>{children}</>,
    },
    types: { researchImage: ({ value }) => <AboutImage value={value} onOpen={onOpen} /> },
  }
  // Ignore empty editor paragraphs at the end without changing stored content.
  let end = body.length
  while (end > 0) {
    const block = body[end - 1]
    if (block?._type !== 'block' || (block.style && block.style !== 'normal') || block.listItem
      || !Array.isArray(block.children) || !block.children.every((child) => child._type === 'span' && typeof child.text === 'string' && !child.text.trim())) break
    end -= 1
  }
  return <PortableText value={body.slice(0, end)} components={components} />
}
