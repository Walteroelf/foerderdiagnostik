// Offline-Nutzung: App-Dateien zwischenspeichern. Bei Änderungen VERSION erhöhen.
const VERSION = 'v1';
const DATEIEN = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/main.js', 'js/storage.js', 'js/pseudonym.js', 'js/sprache.js', 'js/symbole.js', 'js/testlauf.js', 'js/protokoll.js',
  'data/woerter.json', 'data/lesen.json', 'data/kompetenzbogen.json',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Eigene Dateien: erst Netz (für Updates), sonst Zwischenspeicher. Fremde Adressen (ARASAAC) nicht anfassen.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(VERSION).then((c) => c.put(e.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
