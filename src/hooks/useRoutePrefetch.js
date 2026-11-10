import { useEffect } from 'react'
import { prefetchRouteData } from '../data/routeData'

export default function useRoutePrefetch() {
  useEffect(() => {
    const prefetch = (event) => {
      const connection = navigator.connection
      if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return
      const link = event.target.closest?.('a[href^="#/"]')
      if (!link || link.getAttribute('href') === window.location.hash) return
      prefetchRouteData(link.getAttribute('href').slice(1))
    }
    document.addEventListener('pointerover', prefetch)
    document.addEventListener('focusin', prefetch)
    return () => {
      document.removeEventListener('pointerover', prefetch)
      document.removeEventListener('focusin', prefetch)
    }
  }, [])
}
