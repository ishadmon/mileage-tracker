// MilesLog Service Worker — Offline support
const CACHE_NAME = 'mileslog-v1';
const ASSETS = [
  '/mileage-tracker/',
  '/mileage-tracker/index.html',
  '/mileage-tracker/manifest.json',
  '/mileage-tracker/css/styles.css',
  '/mileage-tracker/js/app.js',
  '/mileage-tracker/js/models.js',
  '/mileage-tracker/js/store.js',
  '/mileage-tracker/js/utils/calculations.js',
  '/mileage-tracker/js/utils/dates.js',
  '/mileage-tracker/js/utils/exporters.js',
  '/mileage-tracker/js/views/dashboard.js',
  '/mileage-tracker/js/views/trips.js',
  '/mileage-tracker/js/views/fuel.js',
  '/mileage-tracker/js/views/projects.js',
  '/mileage-tracker/js/views/reports.js',
  '/mileage-tracker/js/views/settings.js',
  '/mileage-tracker/icons/icon-192.png',
  '/mileage-tracker/icons/icon-512.png',
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/mileage-tracker/index.html');
        }
      });
    })
  );
});
