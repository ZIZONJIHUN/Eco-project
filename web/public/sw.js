// 효명 급식 탄소 서비스 워커
// - 화면(HTML): 네트워크 먼저, 4초 안에 안 오거나 끊기면 저장해 둔 화면
// - 빌드 파일·글꼴·아이콘: 저장해 둔 것 먼저 (파일 이름에 해시가 있어 바뀌지 않는다)
// - /api/data: 네트워크 먼저, 끊기면 저장해 둔 데이터
// - 클라이언트 이동용 RSC 요청은 건드리지 않는다. 실패하면 Next.js 가 일반 이동으로 바꾸고, 그때 저장된 화면을 준다.
const VERSION = 'v1'
const PAGES = `hm-pages-${VERSION}`
const ASSETS = `hm-assets-${VERSION}`
const PRECACHE = ['/', '/meals', '/insights', '/settings', '/install', '/manifest.webmanifest', '/icon.svg', '/pwa-icons/icon-192.png']
const NETWORK_TIMEOUT = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.endsWith(VERSION)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

const pageKey = (url) => new Request(new URL(url.pathname, self.location.origin).href)

async function networkFirst(event, cacheName, key, fallbackKey) {
  const cache = await caches.open(cacheName)
  const net = fetch(event.request).then((res) => {
    if (res.ok && res.type === 'basic') cache.put(key, res.clone())
    return res
  })
  const timer = new Promise((resolve) => setTimeout(() => resolve('timeout'), NETWORK_TIMEOUT))
  try {
    const first = await Promise.race([net, timer])
    if (first !== 'timeout') return first
    const cached = await cache.match(key)
    if (cached) {
      event.waitUntil(net.catch(() => {}))
      return cached
    }
    return await net
  } catch (err) {
    const cached = (await cache.match(key)) || (fallbackKey && (await cache.match(fallbackKey)))
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(event.request)
  if (hit) return hit
  const res = await fetch(event.request)
  if (res.ok) cache.put(event.request, res.clone())
  return res
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event, PAGES, pageKey(url), new Request(new URL('/', self.location.origin).href)))
    return
  }
  if (url.pathname === '/api/data') {
    event.respondWith(networkFirst(event, PAGES, pageKey(url)))
    return
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/pwa-icons/') || url.pathname === '/icon.svg') {
    event.respondWith(cacheFirst(event))
  }
})
