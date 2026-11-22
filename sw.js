/**
 * Service Worker — Offline-First PWA Support for Chord & Scale Library
 */

const CACHE_NAME = 'chord-scale-library-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './css/modules.css',
  './data/music-theory.json',
  './data/chords.json',
  './data/scales.json',
  './data/progressions.json',
  './js/app.js',
  './js/core/theory.js',
  './js/core/chordEngine.js',
  './js/core/scaleEngine.js',
  './js/core/harmonyAI.js',
  './js/core/storage.js',
  './js/audio/audioEngine.js',
  './js/audio/rhythmEngine.js',
  './js/ui/fretboard.js',
  './js/ui/chordDiagram.js',
  './js/ui/circleOfFifths.js',
  './js/ui/exportTools.js',
  './js/modules/modChords.js',
  './js/modules/modFretboard.js',
  './js/modules/modScales.js',
  './js/modules/modModes.js',
  './js/modules/modArpeggios.js',
  './js/modules/modComparator.js',
  './js/modules/modProgressions.js',
  './js/modules/modTrainer.js',
  './js/modules/modFavorites.js',
  './js/modules/modComposer.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
