// Service Worker — aggressive cache-busting & auto-update
// This SW forces network-only for ALL navigations and clears caches on every activation.
// Version: 2026-07-20-v2

const CACHE_NAME = '5s-app-cache-v2';

self.addEventListener('install', (event) => {
  // Skip waiting - activate immediately
  self.skipWaiting();
  // Clear ALL existing caches on install
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache on install:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately and clear all old caches
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache on activate:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For HTML pages (navigation): network-only, never cache
  if (event.request.mode === 'navigate' ||
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Only fallback to cache if network is completely unavailable
          return caches.match(event.request);
        })
    );
    return;
  }

  // For /version endpoint: never cache
  if (url.pathname === '/version') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
    return;
  }

  // For /sw.js: never cache
  if (url.pathname === '/sw.js') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
    return;
  }

  // For _next/static assets: cache-first (these have content hashes so they're safe)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For everything else: network-first, no-store
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
  }
  if (event.data && event.data.type === 'FORCE_UPDATE') {
    self.skipWaiting();
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
    self.clients.claim();
  }
});
