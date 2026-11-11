// Service worker: makes the app shell open instantly and work offline.
// Data itself lives in IndexedDB (see lib/local) — this only caches the pages and assets.

const CACHE_VERSION = "v1"
const PAGES_CACHE = `pages-${CACHE_VERSION}`
const STATIC_CACHE = `static-${CACHE_VERSION}`
const MAX_STATIC_ENTRIES = 300

const APP_ROUTES = ["/dashboard", "/calendar", "/grocery", "/todos", "/meals"]
const STATIC_ASSETS = ["/manifest.json", "/icon", "/apple-icon", "/api/pwa/icon-192", "/api/pwa/icon-512"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE)
      await Promise.all(APP_ROUTES.map((route) => fetchAndCache(cache, route).catch(() => {})))
      self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES_CACHE, STATIC_CACHE])
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // React Server Component fetches go straight to the network. If they fail offline,
  // Next.js falls back to a full page load, which is served from the cache below.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return

  if (request.mode === "navigate" && APP_ROUTES.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(PAGES_CACHE, url.pathname, request))
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(STATIC_CACHE, url.pathname, request))
  }
})

/** Only cache real pages, never a redirect to /login. */
function isCacheable(response) {
  return response.ok && !response.redirected && response.type === "basic"
}

async function fetchAndCache(cache, key, request = key) {
  const response = await fetch(request)
  if (isCacheable(response)) await cache.put(key, response.clone())
  return response
}

async function staleWhileRevalidate(cacheName, key, request) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(key)
  const network = fetchAndCache(cache, key, request).catch(() => null)
  if (cached) return cached
  const response = await network
  return response ?? Response.error()
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (isCacheable(response)) {
    await cache.put(request, response.clone())
    trimCache(cache)
  }
  return response
}

async function trimCache(cache) {
  const keys = await cache.keys()
  const excess = keys.length - MAX_STATIC_ENTRIES
  for (let i = 0; i < excess; i++) await cache.delete(keys[i])
}
