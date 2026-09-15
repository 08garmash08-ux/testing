/* Cache the whole game on first visit so it plays with no connection at all.
   Bump CACHE when any file below changes, or returning players keep the old
   copy until their browser evicts it. */
var CACHE = 'school-sim-v1';

var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/style.css',
  'assets/js/core/util.js',
  'assets/js/core/storage.js',
  'assets/js/core/pathfind.js',
  'assets/js/core/audio.js',
  'assets/js/core/input.js',
  'assets/js/data/map.js',
  'assets/js/data/questions.js',
  'assets/js/data/npcs.js',
  'assets/js/data/events.js',
  'assets/js/game/schedule.js',
  'assets/js/game/state.js',
  'assets/js/game/exams.js',
  'assets/js/game/world.js',
  'assets/js/game/actions.js',
  'assets/js/game/render.js',
  'assets/js/game/ui.js',
  'assets/js/game/main.js',
  'assets/icons/favicon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        return key === CACHE ? null : caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) {
        /* Refresh in the background so an update lands on the next launch. */
        event.waitUntil(
          fetch(request).then(function (fresh) {
            if (fresh && fresh.status === 200) {
              return caches.open(CACHE).then(function (c) { return c.put(request, fresh.clone()); });
            }
          }).catch(function () { /* offline is fine */ })
        );
        return hit;
      }
      return fetch(request).then(function (fresh) {
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          var copy = fresh.clone();
          caches.open(CACHE).then(function (c) { c.put(request, copy); });
        }
        return fresh;
      }).catch(function () {
        return caches.match('index.html');
      });
    })
  );
});
