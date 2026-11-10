import { useCallback, useRef, useState } from 'react'
import { publicationCoverUrl } from '../data/publicationCoverUrl'
import { imageDimensions } from '../data/imageDimensions'
import './PublicationCover.css'

const decoded = new Set()
const remember = (src) => {
  decoded.add(src)
  if (decoded.size > 200) decoded.delete(decoded.values().next().value)
}

function CoverImage({ src, publication, width, sizes, className = '', loading = 'lazy', ...props }) {
  const [status, setStatus] = useState(() => decoded.has(src) ? 'ready' : 'loading')
  const currentImage = useRef(null)
  const finish = useCallback(async (image) => {
    if (!image?.complete || !image.naturalWidth) return
    try { await image.decode() } catch { /* A loaded image can still be displayed if decode is unsupported. */ }
    if (currentImage.current !== image) return
    remember(src)
    setStatus('ready')
  }, [src])
  const imageRef = useCallback((image) => {
    currentImage.current = image
    if (image?.complete) {
      if (image.naturalWidth) finish(image)
      else setStatus('error')
    }
  }, [finish])
  const srcSet = publication.cover ? [200, 400, 600, 900, 1200].filter((size) => size <= width)
    .map((size) => `${publicationCoverUrl(publication, size)} ${size}w`).join(', ') : undefined
  const dimensions = imageDimensions(publication.cover)
  if (status === 'error') return <span className="publication-cover__missing">Cover unavailable</span>
  return <img {...props} ref={imageRef} src={src} srcSet={srcSet} sizes={sizes}
    width={dimensions?.width} height={dimensions?.height}
    className={`publication-cover ${className}`} data-image-status={status}
    loading={loading} decoding="async" alt={publication.cover?.alt || publication.title}
    onLoad={(event) => finish(event.currentTarget)} onError={() => setStatus('error')} />
}

export default function PublicationCover({ publication, width = 900, sizes = '(max-width: 480px) 34vw, (max-width: 900px) 23vw, (max-width: 1000px) 14vw, 12vw', ...props }) {
  const src = publicationCoverUrl(publication, width)
  if (!src) return <span className="publication-cover__missing">Cover unavailable</span>
  return <CoverImage key={src} src={src} publication={publication} width={width} sizes={sizes} {...props} />
}
