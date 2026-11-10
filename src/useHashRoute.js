import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { restoreScroll } from './scrollRestoration'
import { prepareRouteData } from './data/routeData'

const storageKey = 'outland-scroll-positions-v1'
const historyKey = 'outlandScrollKey'
const readPath = () => window.location.hash.replace(/^#/, '') || '/'
const coordinates = () => ({ x: window.scrollX, y: window.scrollY })

function readPositions() {
  try { return JSON.parse(sessionStorage.getItem(storageKey)) || {} } catch { return {} }
}

function getEntry() {
  let key = window.history.state?.[historyKey]
  if (typeof key !== 'string') {
    key = crypto.randomUUID()
    window.history.replaceState({ ...window.history.state, [historyKey]: key }, '')
  }
  return { path: readPath(), key }
}

function initialRoute() {
  const entry = getEntry()
  return { ...entry, position: readPositions()[entry.key] || null }
}

export function useHashRoute() {
  const [route, setRoute] = useState(initialRoute)
  const [pending, setPending] = useState(false)
  const transition = useRef(0)
  const positions = useRef(readPositions())
  const active = useRef({ key: route.key, path: route.path })
  const restoring = useRef(false)
  const cancelRestore = useRef(null)

  const commitWhenReady = useCallback((nextRoute) => {
    const request = ++transition.current
    const ready = prepareRouteData(nextRoute.path)
    if (!ready) {
      setPending(false)
      setRoute(nextRoute)
      return
    }
    setPending(true)
    ready.then(() => {
      if (transition.current !== request) return
      setPending(false)
      setRoute(nextRoute)
    })
  }, [])

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(Object.entries(positions.current).slice(-200))))
    } catch { /* Storage restrictions must not break navigation. */ }
  }, [])

  const save = useCallback(() => {
    if (!restoring.current) positions.current[active.current.key] = coordinates()
  }, [])

  useLayoutEffect(() => {
    restoring.current = true
    const complete = () => {
      restoring.current = false
      save()
    }
    if (route.position) {
      cancelRestore.current = restoreScroll(route.position, complete)
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      complete()
    }
    return () => cancelRestore.current?.()
  }, [route, save])

  useEffect(() => {
    const previousMode = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const onHistoryChange = () => {
      let entry = getEntry()
      if (entry.key === active.current.key && entry.path === active.current.path) return
      save()
      persist()
      cancelRestore.current?.()
      // Native hash links can inherit the preceding entry's history state.
      if (entry.key === active.current.key) {
        entry = { ...entry, key: crypto.randomUUID() }
        window.history.replaceState({ ...window.history.state, [historyKey]: entry.key }, '')
      }
      active.current = entry
      restoring.current = true
      commitWhenReady({ ...entry, position: positions.current[entry.key] || null })
    }
    const onPageHide = () => { save(); persist() }
    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('popstate', onHistoryChange)
    window.addEventListener('hashchange', onHistoryChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      transition.current += 1
      window.history.scrollRestoration = previousMode
      window.removeEventListener('scroll', save)
      window.removeEventListener('popstate', onHistoryChange)
      window.removeEventListener('hashchange', onHistoryChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [save, persist, commitWhenReady])

  const navigate = useCallback((nextPath) => {
    save()
    persist()
    cancelRestore.current?.()
    const entry = { key: crypto.randomUUID(), path: nextPath }
    if (nextPath === readPath()) {
      window.history.replaceState({ ...window.history.state, [historyKey]: entry.key }, '', `#${nextPath}`)
    } else {
      window.history.pushState({ ...window.history.state, [historyKey]: entry.key }, '', `#${nextPath}`)
    }
    active.current = entry
    restoring.current = true
    commitWhenReady({ ...entry, position: null })
  }, [save, persist, commitWhenReady])

  return { path: route.path, navigate, pending }
}
