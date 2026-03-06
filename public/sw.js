/* =========================================
   Service Worker — Outo Traveling App PWA
   [Ver2.4] 策略改為 Network First（本地資源）
   確保每次部署後自動載入最新版本
   ========================================= */

const CACHE_NAME = 'outo-v2.5';

// 需要預快取的核心資源
const PRE_CACHE = [
  '/',
  '/index.html',
];

// 外部可快取資源（字體、CDN 等不常變的資源用 Cache First）
const CACHEABLE_CDN = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// 需要即時資料的 API（完全跳過快取）
const SKIP_CACHE_HOSTS = [
  'maps.googleapis.com',
  'docs.google.com',
  'sheets.googleapis.com',
  'api.qrserver.com',
  'api.exchangerate',
  'api.open-meteo.com',
  'geocoding-api.open-meteo.com',
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

// ── Activate：清除所有舊版本快取 ──
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

// ── Fetch 路由 ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 跳過非 GET 請求
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) API 和即時資料：直接 Network（不快取）
  if (SKIP_CACHE_HOSTS.some((h) => url.hostname.includes(h))) {
    return; // 讓瀏覽器自行處理，不攔截
  }

  // 2) 外部 CDN 資源（字體等）：Cache First（這些幾乎不會變）
  if (CACHEABLE_CDN.some((cdn) => url.hostname.includes(cdn))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3) 圖片（Unsplash 等）：Cache First
  if (
    request.destination === 'image' ||
    url.hostname.includes('images.unsplash.com')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4) 同源本地資源（HTML/JS/CSS）：Network First
  //    這是關鍵改動——確保每次部署後自動載入最新版本
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// ── 快取策略：Cache First（CDN、圖片）──
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
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// ── 快取策略：Network First（本地資源）──
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
    // 離線時導航請求回傳首頁
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
