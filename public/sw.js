/**
 * VolleyWarrior service worker — maakt de webversie offline-installeerbaar.
 *
 * Bewust runtime-caching (geen precache-manifest met gehashte bestandsnamen):
 * navigaties gaan netwerk-eerst met cache-terugval (offline app-shell), overige
 * same-origin GET's gaan stale-while-revalidate. Wordt alleen in productie
 * geregistreerd (zie main.jsx) zodat de Vite-HMR in dev niet vervuild raakt.
 */
const CACHE = 'vw-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // alleen eigen assets

  // Navigatie: netwerk eerst, val terug op de gecachete app-shell.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await cache.match(req)) || (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Overige assets: stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetching = fetch(req)
      .then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);
    return cached || (await fetching) || Response.error();
  })());
});
