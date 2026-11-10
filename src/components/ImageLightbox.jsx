import { useEffect } from 'react'
import './ImageLightbox.css'

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`${alt} full screen`} onClick={onClose}>
      <button className="image-lightbox__close" type="button" aria-label="Close image" onClick={onClose}>×</button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} />
    </div>
  )
}

export default ImageLightbox
