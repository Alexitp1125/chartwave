// Service worker shared by every alexitp1125 app (copied from dev-conventions/pwa).
// It only shows offline.html when a page can't load. Nothing else is cached, so the
// app never runs an old version.
const CACHE = 'offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode !== 'navigate') {
        return;
    }

    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
