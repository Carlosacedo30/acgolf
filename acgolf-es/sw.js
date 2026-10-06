/* © 2026 Carlos Acedo Domínguez. acgolf: la app abre aunque haya poca cobertura.
   Siempre intenta traer lo último de internet; si no hay conexión, usa la copia guardada. */
const CACHE = 'acgolf-v3';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return; // la base de datos y las fotos van siempre por internet
  e.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){ const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)))
  );
});
