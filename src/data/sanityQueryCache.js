import { client } from '../sanityClient'

// Tab-local only: a full reload always starts with a fresh request.
const entries = new Map()
const freshFor = 30_000
const maxEntries = 100
const empty = Object.freeze({ data: null, hasData: false, error: false, refreshing: false })

export function getQueryEntry(query, paramsJson) {
  const key = `${query}:${paramsJson}`
  if (!entries.has(key)) entries.set(key, { query, paramsJson, snapshot: empty, listeners: new Set(), updatedAt: 0, failedAt: 0, promise: null })
  return entries.get(key)
}

function publish(entry, snapshot) {
  entry.snapshot = snapshot
  entry.listeners.forEach((listener) => listener())
}

function prune() {
  if (entries.size <= maxEntries) return
  for (const [key, entry] of entries) {
    if (!entry.listeners.size && !entry.promise) entries.delete(key)
    if (entries.size <= maxEntries) break
  }
}

export function fetchQueryEntry(entry, force = false) {
  if (entry.promise) return entry.promise
  // A route loader and its newly mounted consumer share the same error result.
  // Explicit Retry bypasses this brief cooldown.
  if (!force && entry.snapshot.error && Date.now() - entry.failedAt < 1000) return Promise.resolve()
  if (!force && entry.snapshot.hasData && Date.now() - entry.updatedAt < freshFor) return Promise.resolve()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  publish(entry, { ...entry.snapshot, error: false, refreshing: true })
  // Keep shared requests alive when one consumer unmounts (including prefetch).
  entry.promise = Promise.resolve().then(() => client.fetch(entry.query, JSON.parse(entry.paramsJson), { signal: controller.signal })).then(
    (data) => {
      entry.updatedAt = Date.now()
      publish(entry, { data, hasData: true, error: false, refreshing: false })
    },
    () => {
      entry.failedAt = Date.now()
      publish(entry, { ...entry.snapshot, error: !entry.snapshot.hasData, refreshing: false })
    },
  ).finally(() => {
    clearTimeout(timeout)
    entry.promise = null
    prune()
  })
  return entry.promise
}

export function prefetchSanityQuery(query, params = {}) {
  return fetchQueryEntry(getQueryEntry(query, JSON.stringify(params)))
}
