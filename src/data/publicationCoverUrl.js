import { createImageUrlBuilder } from '@sanity/image-url'
import { client } from '../sanityClient'
import { getPublicationImage } from './publicationImages'

const builder = createImageUrlBuilder(client)

export function publicationCoverUrl(publication, width = 600) {
  if (publication.cover) {
    try {
      return builder.image(publication.cover).width(width).fit('max').auto('format').url()
    } catch { return null }
  }
  return publication.imageId ? getPublicationImage(publication.imageId) : null
}
