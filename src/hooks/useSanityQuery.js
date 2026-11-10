import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { fetchQueryEntry, getQueryEntry } from '../data/sanityQueryCache'

const disabledSnapshot = Object.freeze({ data: null, hasData: false, error: false })

export default function useSanityQuery(query, params, enabled = true) {
  const paramsJson = JSON.stringify(params)
  const entry = enabled ? getQueryEntry(query, paramsJson) : null
  const subscribe = useCallback((listener) => {
    if (!entry) return () => {}
    entry.listeners.add(listener)
    return () => entry.listeners.delete(listener)
  }, [entry])
  const getSnapshot = useCallback(() => entry?.snapshot || disabledSnapshot, [entry])
  const result = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    if (!entry) return
    fetchQueryEntry(entry)
    const revalidate = () => { if (document.visibilityState === 'visible') fetchQueryEntry(entry) }
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', revalidate)
    return () => {
      window.removeEventListener('focus', revalidate)
      document.removeEventListener('visibilitychange', revalidate)
    }
  }, [entry])

  return {
    data: result.data,
    loading: enabled && !result.hasData && !result.error,
    error: enabled && result.error,
    retry: () => { if (entry) fetchQueryEntry(entry, true) },
  }
}
