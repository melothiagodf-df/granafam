const CACHE = 'granafam-v1';
const ASSETS = [
  '/granafam/',
  '/granafam/index.html',
  '/granafam/manifest.json',
  '/granafam/icon-192.png',
  '/granafam/icon-512.png',
];

// Instala e cacheia os arquivos principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Serve do cache se offline, busca da rede se online
self.addEventListener('fetch', e => {
  // Ignora chamadas ao backend local e à Pluggy (não cacheia)
  if (e.request.url.includes('localhost:8000') ||
      e.request.url.includes('pluggy.ai') ||
      e.request.url.includes('fonts.googleapis')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cacheia a resposta para uso offline futuro
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match('/granafam/'));
    })
  );
});
