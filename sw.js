// Tuma — service worker
const VERSION = 'tuma-v1.2.0';
const CORE = [
  './',
  './assets/bg/front.webp',
  './assets/bg/mid.webp',
  './assets/bg/sky.webp',
  './assets/char/badger.webp',
  './assets/char/bear.webp',
  './assets/char/fox.webp',
  './assets/char/hedgehog.webp',
  './assets/char/owl.webp',
  './assets/char/squirrel.webp',
  './assets/char/tit.webp',
  './assets/icon/acorn.webp',
  './assets/icon/apple-touch-icon.png',
  './assets/icon/coin.webp',
  './assets/icon/honey.webp',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './assets/icon/icon-maskable-512.png',
  './assets/icon/letter.webp',
  './assets/icon/mushroom.webp',
  './assets/icon/scroll.webp',
  './assets/icon/seed.webp',
  './assets/icon/stone.webp',
  './assets/loc/badger_1.webp',
  './assets/loc/badger_2.webp',
  './assets/loc/badger_3.webp',
  './assets/loc/bear_1.webp',
  './assets/loc/bear_2.webp',
  './assets/loc/bear_3.webp',
  './assets/loc/fox_1.webp',
  './assets/loc/fox_2.webp',
  './assets/loc/fox_3.webp',
  './assets/loc/hedgehog_1.webp',
  './assets/loc/hedgehog_2.webp',
  './assets/loc/hedgehog_3.webp',
  './assets/loc/owl_1.webp',
  './assets/loc/owl_2.webp',
  './assets/loc/owl_3.webp',
  './assets/loc/squirrel_1.webp',
  './assets/loc/squirrel_2.webp',
  './assets/loc/squirrel_3.webp',
  './assets/loc/tit_1.webp',
  './assets/loc/tit_2.webp',
  './assets/loc/tit_3.webp',
  './css/style.css',
  './js/app.js',
  './js/audio.js',
  './js/economy.js',
  './manifest.webmanifest'
];
const MUSIC = 'tuma-music-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== MUSIC).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // glazba: spremi pri prvom slušanju (bez Range zahtjeva da bi se mogla spremiti cijela)
  if (url.pathname.includes('/assets/music/')) {
    e.respondWith(caches.open(MUSIC).then(async c => {
      const hit = await c.match(url.pathname);
      if (hit) return hit;
      const res = await fetch(url.pathname);
      if (res.ok && res.status === 200) c.put(url.pathname, res.clone());
      return res;
    }));
    return;
  }
  // kod i stranica: uvijek prvo s mreže (da se nova verzija odmah vidi), spremljeno samo kad nema mreže
  const isCode = e.request.mode === 'navigate' || /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isCode) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./'))));
    return;
  }
  // slike: iz spremišta, a ako ih nema, s mreže
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
