// Service Worker that aggressively clears all caches
// This forces the browser to re-download everything

const CACHE_VERSION = 'v-' + Date.now();

self.addEventListener('install', (event) => {
  // Skip waiting - activate immediately
  self.skipWaiting();
  // Clear ALL existing caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // For HTML pages: network-only (never cache)
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }
  // For everything else: network first
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => {
      return caches.match(event.request);
    })
  );
});
