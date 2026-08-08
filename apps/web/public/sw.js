// Stunity Service Worker - PWA Support
// Version: 1.2.0 — keep Next.js navigation traffic out of the PWA cache

const CACHE_VERSION = 'stunity-v1.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/km/app',
  '/Stunity.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/pwa-512x512-maskable.png',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[SW] Precache skip:', url, err);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
      // Notify open clients that a new SW is active
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
      });
    })()
  );
});

// ─── Messages (skipWaiting from client update toast) ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch Strategy ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Cross-origin / API — network only (never cache auth/API payloads here)
  if (!isSameOrigin(url) || url.pathname.startsWith('/api/')) {
    return;
  }

  // Next.js App Router navigation and build assets already have their own
  // cache semantics. Intercepting Flight/RSC requests can leave a client
  // transition waiting on a stale or unresolved service-worker response.
  // Let the browser and Next.js handle these requests directly.
  if (
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('Next-Router-State-Tree') ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.has('Next-Router-Segment-Prefetch')
  ) {
    return;
  }

  // Never cache the service worker itself or HTML navigations of auth pages deeply
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets — Cache First
  if (
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/Stunity.png'
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // App shell / key navigations — Network First, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE);
            // Cache shell routes for offline reopen
            const path = url.pathname;
            if (
              path === '/' ||
              path.endsWith('/app') ||
              path.endsWith('/feed') ||
              path.endsWith('/learn') ||
              path.endsWith('/reels') ||
              path.endsWith('/clubs') ||
              path.endsWith('/classes') ||
              path.endsWith('/profile') ||
              path === OFFLINE_URL
            ) {
              cache.put(request, response.clone());
            }
          }
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // Images — Stale-While-Revalidate
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkPromise;
      })
    );
    return;
  }

  // Default: network, fall back to cache
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || Response.error();
    })
  );
});

// ─── Push Notifications (ready for VAPID wiring) ────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }
  const options = {
    body: data.body || '',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/km/app' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Stunity', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = event.notification.data?.url || '/km/app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        if ('navigate' in existing) existing.navigate(targetUrl);
        return;
      }
      return clients.openWindow(targetUrl);
    })
  );
});
