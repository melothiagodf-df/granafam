// Mude este número toda vez que fizer uma atualização
const CACHE_VERSION = 'granafam-v11';
const ASSETS = [
  '/granafam/',
  '/granafam/index.html',
  '/granafam/manifest.json',
  '/granafam/icon-192.png',
  '/granafam/icon-512.png',
];

// Instala — cacheia assets principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
  // Ativa imediatamente sem esperar aba fechar
  self.skipWaiting();
});

// Ativa — apaga caches antigas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => {
            console.log('[SW] Deletando cache antigo:', k);
            return caches.delete(k);
          })
      )
    )
  );
  // Toma controle de todas as abas imediatamente
  self.clients.claim();
});

// Fetch — network first para o HTML, cache first para assets estáticos
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca intercepta chamadas externas
  if (url.includes('localhost:8000') ||
      url.includes('pluggy.ai') ||
      url.includes('fonts.googleapis') ||
      url.includes('fonts.gstatic') ||
      url.includes('cdn.pluggy')) {
    return;
  }

  // Para o HTML principal: sempre busca da rede primeiro
  if (url.endsWith('/') || url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Atualiza o cache com a versão nova
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Para outros assets: cache first, atualiza em background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(e.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    })
  );
});
