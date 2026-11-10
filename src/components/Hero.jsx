import { useEffect, useRef } from 'react'
import FontReady from './FontReady'
import './Hero.css'

function Hero() {
  const bannerRef = useRef(null)
  const descriptionRef = useRef(null)

  useEffect(() => {
    const mobileWidth = window.matchMedia('(max-width: 1000px)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let touchStartY = null
    let isSnapping = false
    let unlockTimer
    const blockWheelDuringSnap = (event) => event.preventDefault()

    const scrollToDescription = () => {
      if (isSnapping || !descriptionRef.current) return

      isSnapping = true
      window.addEventListener('wheel', blockWheelDuringSnap, { passive: false })
      const headerHeight = document.querySelector('.header')?.offsetHeight ?? 0
      const descriptionTop = window.scrollY + descriptionRef.current.getBoundingClientRect().top
      window.scrollTo({
        top: Math.max(0, descriptionTop - headerHeight - 16),
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      })
      unlockTimer = window.setTimeout(() => {
        isSnapping = false
        window.removeEventListener('wheel', blockWheelDuringSnap)
      }, reducedMotion.matches ? 0 : 800)
    }

    const onWheel = (event) => {
      if (!mobileWidth.matches || event.deltaY <= 0 || window.scrollY >= 20) return
      event.preventDefault()
      scrollToDescription()
    }

    const onTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? null
    }

    const onTouchMove = (event) => {
      if (!mobileWidth.matches || touchStartY === null || event.touches.length !== 1) return
      if (touchStartY - event.touches[0].clientY > 4 && (isSnapping || window.scrollY < 20)) {
        event.preventDefault()
        scrollToDescription()
      }
    }

    const onTouchEnd = () => { touchStartY = null }

    const onKeyDown = (event) => {
      if (!mobileWidth.matches || (window.scrollY >= 20 && !isSnapping) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (!['ArrowDown', 'PageDown', ' '].includes(event.key)) return
      if (event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea, [contenteditable]')) return
      event.preventDefault()
      scrollToDescription()
    }

    const banner = bannerRef.current
    banner.addEventListener('wheel', onWheel, { passive: false })
    banner.addEventListener('touchstart', onTouchStart, { passive: true })
    banner.addEventListener('touchmove', onTouchMove, { passive: false })
    banner.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      banner.removeEventListener('wheel', onWheel)
      banner.removeEventListener('touchstart', onTouchStart)
      banner.removeEventListener('touchmove', onTouchMove)
      banner.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('wheel', blockWheelDuringSnap)
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(unlockTimer)
    }
  }, [])

  return (
    <section className="hero">
      <div ref={bannerRef} className="hero__banner">
        <FontReady><h1 className="hero__title" aria-label="ÉMIGRÉ">
          <span className="hero__letter hero__letter--source-serif-4" aria-hidden="true">É</span>
          <span className="hero__letter hero__letter--unbounded" aria-hidden="true">M</span>
          <span className="hero__letter hero__letter--source-serif-4" aria-hidden="true">I</span>
          <span className="hero__letter hero__letter--unbounded" aria-hidden="true">G</span>
          <span className="hero__letter hero__letter--inter" aria-hidden="true">R</span>
          <span className="hero__letter hero__letter--ruslan-display" aria-hidden="true">É</span>
        </h1></FontReady>
      </div>

      <FontReady><p ref={descriptionRef} className="hero__description">
        A research project and typeface exploring Cyrillic <strong>ÉMIGRÉ</strong> periodicals of the first half of the twentieth century, examining how emigrant communities preserved cultural identity abroad through print and reinterpreting these historical models in a contemporary typeface.
      </p></FontReady>
    </section>
  )
}

export default Hero
