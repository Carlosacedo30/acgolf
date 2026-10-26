/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Avisos al móvil: enseña el aviso que manda el servidor y, al tocarlo, abre la app en esa partida.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(err){ d = { texto: e.data ? e.data.text() : '' }; }
  const base = self.registration.scope;
  e.waitUntil(self.registration.showNotification(d.titulo || '⛳ acgolf', {
    body: d.texto || '',
    icon: base + 'icon-512.png',
    tag: d.etiqueta || undefined,
    data: { url: d.url || base }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for(const c of lista){
      if(c.url.startsWith(self.registration.scope) && 'focus' in c){
        return c.focus().then(v => (v && 'navigate' in v) ? v.navigate(url) : v);
      }
    }
    return self.clients.openWindow(url);
  }));
});
