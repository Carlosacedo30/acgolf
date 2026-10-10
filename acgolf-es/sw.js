/* © 2026 Carlos Acedo Domínguez. acgolf: la app abre rápido aunque haya poca cobertura.
   - La app (código, estilos, iconos) se guarda en el móvil al instalarse.
   - Archivos de la app: se usan los guardados al momento y se actualizan por detrás.
   - La página: se intenta traer de internet, pero si en 2,5 s no llega, se abre la guardada.
   - La base de datos y las fotos de fuera van siempre por internet. */
const CACHE = 'acgolf-__VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function guardar(req, res){
  if(res && res.ok && res.type === 'basic'){ const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  // La página: internet con un límite de 2,5 s; si no, la guardada
  if(req.mode === 'navigate'){
    e.respondWith(new Promise(resolve => {
      let hecho = false;
      const usarGuardada = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('/index.html')).then(r => {
        if(r && !hecho){ hecho = true; resolve(r); }
      });
      const t = setTimeout(usarGuardada, 2500);
      fetch(req).then(res => { clearTimeout(t); guardar(req, res); if(!hecho){ hecho = true; resolve(res); } })
        .catch(() => { clearTimeout(t); usarGuardada().then(() => { if(!hecho){ hecho = true; resolve(Response.error()); } }); });
    }));
    return;
  }

  // Archivos de la app: el guardado al momento y se actualiza por detrás
  e.respondWith(caches.match(req).then(guardado => {
    const red = fetch(req).then(res => guardar(req, res)).catch(() => guardado);
    return guardado || red;
  }));
});
