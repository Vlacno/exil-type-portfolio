import { useLayoutEffect, useRef, useState } from 'react'

// Fit every specimen with one shared size, using the actual loaded typefaces.
export default function useSharedTypefaceSize(contentKey) {
  const gridRef = useRef(null)
  const [preparedKey, setPreparedKey] = useState(null)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    let frame
    let disposed = false
    let mayMeasure = false

    const measure = () => {
      if (disposed || !mayMeasure) return
      let size = Infinity
      grid.querySelectorAll('[data-typeface-sample]').forEach((row) => {
        const available = row.parentElement.getBoundingClientRect().width
        if (!available) return
        const clone = row.cloneNode(true)
        clone.removeAttribute('data-typeface-sample')
        clone.setAttribute('aria-hidden', 'true')
        Object.assign(clone.style, {
          position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
          display: 'inline-block', width: 'max-content', maxWidth: 'none',
          fontSize: '100px', whiteSpace: 'nowrap', overflowWrap: 'normal',
        })
        row.parentElement.appendChild(clone)
        const width = clone.getBoundingClientRect().width
        clone.remove()
        if (width) size = Math.min(size, (available - 2) * 100 / width)
      })
      if (Number.isFinite(size) && size > 0) {
        grid.style.setProperty('--typeface-sample-size', `${Math.floor(size * 100) / 100}px`)
        setPreparedKey(contentKey)
      }
    }
    const schedule = () => {
      if (disposed) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    const observeCards = () => {
      observer.disconnect()
      observer.observe(grid)
      Array.from(grid.children).forEach((card) => observer.observe(card))
      schedule()
    }
    const mutations = new MutationObserver(observeCards)
    // Direct children only: ignore the temporary measurement clones inside cards.
    mutations.observe(grid, { childList: true })
    observeCards()

    // CMS cards may arrive after the initial document.fonts.ready has resolved.
    // Request every actual face, including italic descendants, before fitting.
    // Safari does not reliably dispatch FontFaceSet's loadingdone event.
    const faces = new Map()
    grid.querySelectorAll('[data-typeface-sample]').forEach((row) => {
      for (const element of [row, ...row.querySelectorAll('em')]) {
        const style = getComputedStyle(element)
        const font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`
        faces.set(font, `${faces.get(font) || ''}${element.textContent}`)
      }
    })
    const finish = () => {
      if (disposed) return
      mayMeasure = true
      schedule()
    }
    // Use measured fallback text if a font stalls. Late faces still trigger a
    // fresh measurement through their own promises, not a browser font event.
    const timeout = setTimeout(finish, 4000)
    const pending = []
    for (const [font, text] of faces) {
      pending.push(document.fonts.load(font, text).then(
        () => { if (mayMeasure) schedule() },
        () => { if (mayMeasure) schedule() },
      ))
    }
    if (pending.length) {
      Promise.allSettled(pending).then(() => { clearTimeout(timeout); finish() })
    } else {
      clearTimeout(timeout)
      finish()
    }
    document.fonts.addEventListener('loadingdone', schedule)
    return () => {
      disposed = true
      clearTimeout(timeout)
      cancelAnimationFrame(frame)
      observer.disconnect()
      mutations.disconnect()
      document.fonts.removeEventListener('loadingdone', schedule)
    }
  }, [contentKey])

  return { gridRef, ready: preparedKey === contentKey }
}
