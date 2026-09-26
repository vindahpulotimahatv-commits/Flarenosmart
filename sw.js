/* FLARENO FAMILY — sw.js
   Service worker sederhana: cache-first untuk file statis agar aplikasi bisa dibuka offline
   dan installable sebagai PWA. Tidak menyentuh data pengguna (data ada di IndexedDB, bukan di sini).
*/

const CACHE_NAME = 'flareno-family-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/storage.js',
  './js/finance.js',
  './js/statistics.js',
  './js/ui.js',
  './js/sync.js',
  './js/app.js',
  './assets/logo.svg',
  './assets/logo.png',
  './assets/branding/logo-horizontal.png',
  './assets/branding/logo-white.png',
  './assets/branding/splash-bg.jpg',
  './assets/branding/onboarding-1.png',
  './assets/branding/onboarding-2.png',
  './assets/branding/onboarding-3.png',
  './assets/branding/onboarding-4.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));
      return cached || networkFetch;
    })
  );
});
