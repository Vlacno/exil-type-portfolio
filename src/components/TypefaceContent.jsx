import { PortableText } from '@portabletext/react'
import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from '../sanityClient'
import ContentImage from './ContentImage'
import FontReady from './FontReady'
import { imageDimensions } from '../data/imageDimensions'

const builder = createImageUrlBuilder(client)

function TypefaceImage({ value, onOpen }) {
  if (!value.image?.asset) return null
  let src, large
  try {
    src = builder.image(value.image).width(1200).fit('max').auto('format').url()
    large = builder.image(value.image).width(2400).fit('max').auto('format').url()
  } catch { return null }
  return <figure>
    <button type="button" className="typeface-detail__image-button" aria-label={`Open ${value.alt || 'image'} full screen`} onClick={() => onOpen({ src: large, alt: value.alt || '' })}>
      <ContentImage src={src} alt={value.alt || ''} {...imageDimensions(value.image)} />
    </button>
    {value.caption && <figcaption>{value.caption}</figcaption>}
  </figure>
}

export default function TypefaceContent({ body, onOpen }) {
  if (!body.length) return null
  return <FontReady><article className="typeface-detail__article"><PortableText value={body} components={{
    marks: { link: ({ children, value }) => typeof value?.href === 'string' && /^(https?:\/\/|mailto:)/i.test(value.href) ? <a href={value.href}>{children}</a> : <>{children}</> },
    types: { typefaceImage: ({ value }) => <TypefaceImage value={value} onOpen={onOpen} /> },
  }} /></article></FontReady>
}
