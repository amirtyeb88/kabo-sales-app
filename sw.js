// Service Worker لتشغيل تطبيق مبيعات كابو دون اتصال بالإنترنت (Offline Mode)
const CACHE_NAME = 'kabo-sales-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // إرجاع الملف من الذاكرة المخبأة إذا وجد، وإلا جلبه من الشبكة
      return response || fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
