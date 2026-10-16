/* Зубр: офлайн-кэш. Сначала отдаём сохранённое, в фоне тихо обновляем. */
const CACHE = 'zubr-v4';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './vendor/marked.umd.js', './vendor/purify.min.js'];
const HEAVY = ['./vendor/mermaid.min.js'];   // библиотека схем: большая, поэтому не блокирует установку

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
  await c.addAll(HEAVY).catch(() => {});
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('zubr-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;   // запросы к GitHub не трогаем
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(req, { ignoreSearch: true });
    const fresh = fetch(req.url, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(url.origin + url.pathname, r.clone()); return r; }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || (req.mode === 'navigate' ? (await c.match('./index.html')) : null) || Response.error();
  })());
});
