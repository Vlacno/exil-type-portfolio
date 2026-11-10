import { useCallback, useRef, useState } from 'react'
import './ContentImage.css'

function ImageSlot({ src, alt, width, height }) {
  const [status, setStatus] = useState('loading')
  const currentImage = useRef(null)
  const finish = useCallback(async (image) => {
    if (!image?.complete || !image.naturalWidth) return
    try { await image.decode() } catch { /* A loaded image can still be displayed. */ }
    if (currentImage.current === image) setStatus('ready')
  }, [])
  const imageRef = useCallback((image) => {
    currentImage.current = image
    if (image?.complete) {
      if (image.naturalWidth) finish(image)
      else setStatus('error')
    }
  }, [finish])

  return <span className={`content-image${width && height ? ' content-image--sized' : ''}`} data-image-status={status}
    style={width && height ? { '--content-image-ratio': `${height / width * 100}%` } : undefined}>
    {status === 'error'
      ? <span className="content-image__missing" role="img" aria-label={alt || 'Image unavailable'}>Image unavailable</span>
      : <img ref={imageRef} src={src} alt={alt} width={width} height={height}
        loading="lazy" decoding="async" onLoad={(event) => finish(event.currentTarget)} onError={() => setStatus('error')} />}
  </span>
}

// A source change starts its own readiness cycle, without hiding surrounding text.
export default function ContentImage(props) {
  return <ImageSlot key={props.src} {...props} />
}
