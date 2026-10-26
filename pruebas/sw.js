/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Versión de pruebas: este archivo solo sirve para los avisos al móvil (no guarda la app).
// En acgolf.es se usa el sw.js de acgolf-es/, que guarda la app y también carga los avisos.
importScripts('sw-avisos.js');
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
