/**
 * Service Worker — Network-First with Offline Cache Fallback
 * Always serves the latest HTML/CSS/JS when online (preventing stale UI/CSS issues),
 * and falls back seamlessly to cached assets when offline.
 */

const CACHE_NAME = 'chord-scale-library-v10';
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
  './js/ui/icons.js',
  './js/ui/playbackBar.js',
  './js/ui/strummingEditor.js',
  './js/ui/globalSearch.js',
  './js/ui/tunerModal.js',
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
  './js/modules/modJam.js',
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
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
