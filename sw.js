// sw.js — GitHub Pages friendly (subpath), supports multi-file app + data
// Works for https://<user>.github.io/Hexer/  (BASE inferred from scope)

const BASE = (self.registration && new URL(self.registration.scope).pathname) || '/Hexer/';
const CACHE = 'hexer-v3-2025-11-13';

// App shell you want instantly available offline.
// List your real files here. Add/remove as your repo changes.
const APP_SHELL = [
  '',                // resolves to `${BASE}`
  'index.html',
  'manifest.webmanifest',
  'icons/192.png',
  'icons/512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  // JS modules (add the ones you use)
  'js/data.js',
  'js/game-core.js',
  'js/ui.js',
  'js/expansion.js',
  // CSS (if any)
  // 'css/styles.css',
].map(p => BASE + p).map(u => u.replace(/\/+$/, '/'));

// --- helpers ---
function isSameOrigin(req) {
  try { return new URL(req.url).origin === location.origin; } catch { return false; }
}
function pathname(req) { try { return new URL(req.url).pathname; } catch { return ''; } }

// Install: pre-cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch:
// - Navigations: network-first → fall back to cached index.html
// - /data/*: network-first (keeps balance fresh), fall back to cache
// - /js/*: stale-while-revalidate (fast boot, silent update)
// - everything else: cache-first then network
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Only handle same-origin
  if (!isSameOrigin(req)) return;

  const urlPath = pathname(req);
  const isNav = req.mode === 'navigate';

  // 1) SPA navigations (index.html as app shell)
  if (isNav) {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(BASE + 'index.html', copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // 2) Data: network-first
  if (urlPath.startsWith(BASE + 'data/')) {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 3) JS modules: stale-while-revalidate
  if (urlPath.startsWith(BASE + 'js/')) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const fetchPromise = fetch(req).then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return r;
        }).catch(() => hit || Promise.reject(new Error('Network failed')));
        // return cache immediately if present, otherwise wait on network
        return hit || fetchPromise;
      })
    );
    return;
  }

  // 4) Everything else: cache-first, fall back to network
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return r;
    }))
  );
});
