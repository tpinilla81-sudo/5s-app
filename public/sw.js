// Self-Destructing Service Worker v3
// This SW does NOTHING except unregister itself and clear all caches.
// It exists so that OLD registered SWs get replaced by this no-op version.

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait
  self.skipWaiting();
  
  // Clear ALL caches
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map(name => caches.delete(name)));
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients and clear all caches
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    ])
  );
  
  // Self-unregister after activation
  self.registration.unregister().then(() => {
    console.log('[SW] Self-unregistered successfully');
  });
});

// Pass through ALL requests to network — no caching whatsoever
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
