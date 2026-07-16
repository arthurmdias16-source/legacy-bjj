const CACHE = 'legacy-bjj-v1';
const SHELL = [
  '/legacy-bjj/',
  '/legacy-bjj/index.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // API do Google Apps Script: sempre tenta rede, fallback offline
  if (url.includes('script.google.com')) {
    return e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ sucesso: false, erro: 'Sem conexão com a internet.' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
  }

  // Google Fonts: cache first
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    return e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }

  // Shell (HTML, SVG, etc): cache first, atualiza em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
