// Retry on real content/layout changes instead of a fixed delay after navigation.
export function restoreScroll(position, onComplete) {
  const x = Number.isFinite(position.x) ? Math.max(0, position.x) : 0
  const y = Number.isFinite(position.y) ? Math.max(0, position.y) : 0
  let stopped = false
  let frame
  let stableFrame

  const cleanup = () => {
    stopped = true
    cancelAnimationFrame(frame)
    cancelAnimationFrame(stableFrame)
    resize.disconnect()
    mutations.disconnect()
    document.removeEventListener('load', schedule, true)
    document.removeEventListener('error', schedule, true)
    document.fonts.removeEventListener('loadingdone', schedule)
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchstart', cancel)
    window.removeEventListener('keydown', onKeyDown)
  }
  const finish = () => { cleanup(); onComplete() }
  const cancel = () => { if (!stopped) finish() }
  const onKeyDown = (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) cancel()
  }
  const attempt = () => {
    if (stopped) return
    window.scrollTo({ top: y, left: x, behavior: 'instant' })
    const loading = document.querySelector('[data-scroll-pending="true"]')
    const pendingImages = Array.from(document.images).some((image) => !image.complete && image.getBoundingClientRect().top <= window.innerHeight)
    if (!loading && !pendingImages && document.fonts.status === 'loaded') {
      stableFrame = requestAnimationFrame(() => {
        if (!stopped) {
          window.scrollTo({ top: y, left: x, behavior: 'instant' })
          finish()
        }
      })
    }
  }
  function schedule() {
    if (stopped) return
    cancelAnimationFrame(frame)
    cancelAnimationFrame(stableFrame)
    frame = requestAnimationFrame(attempt)
  }
  const resize = new ResizeObserver(schedule)
  resize.observe(document.body)
  const mutations = new MutationObserver(schedule)
  mutations.observe(document.querySelector('.site__content') || document.body, { childList: true, subtree: true, attributes: true })
  document.addEventListener('load', schedule, true)
  document.addEventListener('error', schedule, true)
  document.fonts.addEventListener('loadingdone', schedule)
  window.addEventListener('wheel', cancel, { passive: true })
  window.addEventListener('touchstart', cancel, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  attempt()
  return cleanup
}
