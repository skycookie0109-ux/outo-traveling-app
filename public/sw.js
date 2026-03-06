/* =========================================
   Service Worker — Outo Traveling App PWA
   策略：Cache First + Network Fallback
   ========================================= */

const CACHE_NAME = 'outo-v2.2.0';

// 需要預快取的核心資源（Vite build 後的檔案由 install 時快取）
const PRE_CACHE = [
  '/',
  '/index.html',
];

// 需要快取的外部資源 pattern
const CACHEABLE_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// ── Install：預快取核心資源 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core resources');
      return cache.addAll(PRE_CACHE);
    })
  );
  self.skipWaiting();
});

// ── Activate：清除舊版本快取 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch：Cache First + Network Fallback ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳過非 GET 請求
  if (request.method !== 'GET') return;

  // 跳過 Google Maps API 和 Google Sheets（這些需要即時資料）
  const url = new URL(request.url);
  if (
    url.hostname.includes('maps.googleapis.com') ||
    url.hostname.includes('docs.google.com') ||
    url.hostname.includes('sheets.googleapis.com') ||
    url.hostname.includes('api.qrserver.com') ||
    url.hostname.includes('api.exchangerate')
  ) {
    // 這些用 Network First 策略
    event.respondWith(networkFirst(request));
    return;
  }

  // 外部可快取資源（字體、CDN）和本地資源：Cache First
  if (
    url.origin === self.location.origin ||
    CACHEABLE_ORIGINS.some((origin) => url.hostname.includes(origin))
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 圖片：Cache First（Unsplash 等）
  if (
    request.destination === 'image' ||
    url.hostname.includes('images.unsplash.com')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});

// ── 快取策略：Cache First ──
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 離線時回傳快取的首頁
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// ── 快取策略：Network First ──
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
