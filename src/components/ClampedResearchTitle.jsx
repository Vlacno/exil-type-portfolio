import { useLayoutEffect, useRef } from 'react'

// Remove hidden words rather than leaving an overflowing third glyph row.
export default function ClampedResearchTitle({ title, className }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const element = ref.current
    let active = true
    const fit = () => {
      if (!active) return
      const style = getComputedStyle(element)
      const limit = Number.parseInt(style.webkitLineClamp, 10)
      if (!Number.isFinite(limit) || limit <= 0) {
        element.textContent = title
        return
      }
      const width = element.clientWidth
      const context = document.createElement('canvas').getContext('2d')
      if (!context || !width || !limit) return
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const fits = (text) => {
        let line = ''
        let lines = 1
        for (const word of text.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word
          if (line && context.measureText(next).width > width) {
            lines += 1
            line = word
          } else line = next
          if (lines > limit || context.measureText(line).width > width) return false
        }
        return true
      }
      let text = title
      if (!fits(text)) {
        while (text && !fits(`${text.trimEnd()}…`)) text = text.slice(0, -1)
        text = `${text.trimEnd()}…`
      }
      element.textContent = text
    }
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    window.addEventListener('resize', fit)
    window.addEventListener('blockfontsready', fit)
    document.fonts.ready.then(fit)
    document.fonts.addEventListener('loadingdone', fit)
    fit()
    return () => {
      active = false
      observer.disconnect()
      window.removeEventListener('resize', fit)
      window.removeEventListener('blockfontsready', fit)
      document.fonts.removeEventListener('loadingdone', fit)
    }
  }, [title])
  return <h1 ref={ref} className={className} aria-label={title}>{title}</h1>
}
