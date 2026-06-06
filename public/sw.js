const CACHE_NAME = 'greffio-shell-v2';
const APP_SHELL = ['/manifest.webmanifest', '/icons/greffio-icon.svg', '/icons/greffio-maskable.svg'];

const isApiRequest = (url) => url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname;

const isShellAsset = (url) => APP_SHELL.includes(url.pathname);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || Response.error();
        }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (isShellAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
