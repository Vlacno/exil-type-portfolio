export const publicationImages = import.meta.glob('../assets/publications/*.jpg', {
  eager: true,
  import: 'default',
  query: '?url',
})

export function getPublicationImage(imageId) {
  return publicationImages[`../assets/publications/${imageId}.jpg`]
}
