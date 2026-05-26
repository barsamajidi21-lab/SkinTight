const CACHE_NAME = 'skin-tight-cache-v2026.05.26.2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/theone.jpg'
];

self.addEventListener('install', (event) => {
  // Immediately activate after installation (skipWaiting)
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core assets...');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[Service Worker] Pre-cache warning (usually safe to ignore):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim control of all active clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. DO NOT intercept or cache API requests, Firebase requests, or OneSignal SDK workers/requests
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('onesignal') ||
    url.pathname.includes('OneSignal')
  ) {
    return;
  }

  // 3. Prevent aggressive caching of HTML & navigation documents: Always try Network first, fallback to Cache
  const isHtmlRequest = event.request.mode === 'navigate' || 
                        url.pathname === '/' || 
                        url.pathname.endsWith('.html') || 
                        event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone response and cache it for offline use code path
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, serve from cached list
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback for sub-routes or single page app router fallback
            return caches.match('/');
          });
        })
    );
    return;
  }

  // 4. Cache-First with Network fallback for safe static assets (CSS, JS, images, icons etc.)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const contentType = networkResponse.headers.get('content-type') || '';
          const isCacheableAsset = 
            contentType.includes('javascript') ||
            contentType.includes('css') ||
            contentType.includes('image/') ||
            contentType.includes('font/') ||
            url.pathname.includes('/assets/') ||
            url.pathname.endsWith('.json') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.ico');

          if (isCacheableAsset) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return new Response(null, { status: 404 });
        });
    })
  );
});
