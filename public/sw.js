// Rimba Service Worker — Offline 3D Caching & PWA Engine
const CACHE_VERSION = 'rimba-v1.2.0';
const CACHE_STATIC = `rimba-static-${CACHE_VERSION}`;
const CACHE_MODELS = `rimba-models-${CACHE_VERSION}`;
const CACHE_FONTS = `rimba-fonts-${CACHE_VERSION}`;

// Core essential assets pre-cached immediately during service worker installation
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-web.webp',
  '/icon-192.png',
  '/icon-512.png',
  '/models/kenney_nature_kit_tree_oak.glb',
  '/models/kenney_nature_kit_path_stone.glb',
  '/Textures/colormap_cubepets.png',
  '/Textures/colormap_fox.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      // Use individual catches so a single missing optional asset doesn't break the entire install
      return Promise.all(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[Rimba SW] Precache skip:', url, err);
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge old cache versions
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (
              key.startsWith('rimba-') &&
              key !== CACHE_STATIC &&
              key !== CACHE_MODELS &&
              key !== CACHE_FONTS
            ) {
              console.log('[Rimba SW] Removing old cache:', key);
              return caches.delete(key);
            }
            return null;
          })
        );
      }),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Bypass Supabase & Authentication APIs (Strictly Network-Only)
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/')
  ) {
    return;
  }

  // 2. 3D GLB Models & Nature Textures -> Cache First (Zero-lag 3D Island Rendering)
  if (
    url.pathname.endsWith('.glb') ||
    url.pathname.includes('/models/') ||
    url.pathname.includes('/Textures/') ||
    url.pathname.includes('/textures/')
  ) {
    event.respondWith(
      caches.open(CACHE_MODELS).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If network failed and not in cache, fallback
          return cached || new Response('Asset offline unavailable', { status: 503 });
        }
      })
    );
    return;
  }

  // 3. Web Fonts (Google Fonts / gstatic) -> Stale-While-Revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_FONTS).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Next.js Static Chunks -> Cache First (Immutable hashed files)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cached || new Response('Chunk offline', { status: 503 });
        }
      })
    );
    return;
  }

  // 5. HTML Navigation / Page Requests -> Network First with Offline Shell Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_STATIC);
        const cached = await cache.match('/');
        return (
          cached ||
          new Response(
            '<!DOCTYPE html><html><body style="background:#051f18;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><h3>Rimba sedang memuat dari penyimpanan lokal...</h3></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        );
      })
    );
    return;
  }
});
