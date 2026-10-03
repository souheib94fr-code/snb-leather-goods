const CACHE_NAME = 'snb-leather-goods-v24';
const APP_SHELL = [
  './',
  './index.html',
  './upgrade.js',
  './premium-admin.js',
  './premium-account.js',
  './premium-store.js',
  './invoice-v1.js',\n  './payments-v1.js','./stripe-v1.js',
  './manifest.webmanifest',
  './assets/SNB-App-Icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});