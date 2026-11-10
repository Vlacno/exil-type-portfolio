import { useCallback, useLayoutEffect, useRef } from 'react'
import './FontReady.css'

function assignRef(ref, element) {
  if (typeof ref === 'function') return ref(element)
  if (ref) ref.current = element
}

// Keep the original DOM/layout and refs: each block owns its font readiness,
// independent of CMS requests, images, the shell and other prepared blocks.
export default function FontReady({ children }) {
  const rootRef = useRef(null)
  const prepareRef = useRef(null)
  const originalRef = children.props.ref
  const ref = useCallback((element) => {
    rootRef.current = element
    return assignRef(originalRef, element)
  }, [originalRef])

  useLayoutEffect(() => {
    const root = rootRef.current
    let signature = null
    let generation = 0
    let disposed = false
    let timeout
    let firstFrame
    let secondFrame
    const originalInert = root.inert
    const reveal = (version) => {
      if (disposed || version !== generation) return
      // Existing fitting effects and FontFaceSet callbacks get a layout frame
      // before the block is painted. Do not rely on Safari's loadingdone event.
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      firstFrame = requestAnimationFrame(() => {
        root.dispatchEvent(new Event('blockfontsready', { bubbles: true }))
        secondFrame = requestAnimationFrame(() => {
          if (disposed || version !== generation) return
          root.dataset.fontState = 'ready'
          root.removeAttribute('data-scroll-pending')
          root.setAttribute('aria-busy', 'false')
          root.inert = originalInert
        })
      })
    }
    const prepare = () => {
      const faces = new Map()
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim()
        const element = node.parentElement
        if (!text || element.closest('[hidden], script, style')) continue
        const style = getComputedStyle(element)
        if (style.display === 'none') continue
        const font = `${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`
        faces.set(font, `${faces.get(font) || ''}${text}`)
      }
      // Text edits/resizing must not repeatedly blank an already prepared face.
      const next = JSON.stringify([...faces.keys()].sort())
      if (next === signature) return
      signature = next
      const version = ++generation
      clearTimeout(timeout)
      root.dataset.fontState = 'pending'
      root.dataset.scrollPending = 'true'
      root.setAttribute('aria-busy', 'true')
      root.inert = true
      timeout = setTimeout(() => reveal(version), 4000)
      const pending = [...faces].map(([font, text]) => document.fonts.load(font, text))
      Promise.allSettled(pending).then(() => {
        if (disposed || version !== generation) return
        clearTimeout(timeout)
        reveal(version)
      })
    }
    prepareRef.current = prepare
    const observer = new MutationObserver(prepare)
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
    prepare()
    return () => {
      disposed = true
      prepareRef.current = null
      clearTimeout(timeout)
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      observer.disconnect()
      root.inert = originalInert
    }
  }, [])

  // React can change a face without replacing the root DOM node.
  useLayoutEffect(() => { prepareRef.current?.() })
  const Element = children.type
  return <Element {...children.props} ref={ref} data-font-state="pending" aria-busy={true} />
}
