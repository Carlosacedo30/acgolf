/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Contador de visitas: de qué red llega cada persona y qué hace ---
// · El enlace de cada red lleva ?r=ig (Instagram), tt (TikTok), yt (YouTube), fb (Facebook)…
//   Si no lo lleva, se mira de qué web viene (instagram.com, tiktok.com…).
// · Se guarda la primera vez en el móvil (para saber de dónde vino aunque vuelva otro día).
// · Solo se apunta un número al azar del móvil: ni nombre ni correo.
// · window.acgolfEvento('prueba' | 'registro' | 'instalada') lo usan las demás partes de la app.
(function(){
  'use strict';
  const CODIGOS = { ig:'instagram', tt:'tiktok', yt:'youtube', fb:'facebook', wa:'whatsapp', qr:'qr', web:'web' };
  function leer(k){ try { return localStorage.getItem(k) || ''; } catch(e){ return ''; } }
  function guardar(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  let origen = '';
  try {
    const q = new URLSearchParams(location.search);
    const r = (q.get('r') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if(r){
      origen = CODIGOS[r] || r;
      q.delete('r');
      const resto = q.toString();
      history.replaceState(null, '', location.pathname + (resto ? '?' + resto : '') + location.hash);
    }
  } catch(e){}
  if(!origen){
    const ref = String(document.referrer || '');
    if(/instagram\./i.test(ref)) origen = 'instagram';
    else if(/tiktok\./i.test(ref)) origen = 'tiktok';
    else if(/youtube\.|youtu\.be/i.test(ref)) origen = 'youtube';
    else if(/facebook\.|fb\.com/i.test(ref)) origen = 'facebook';
  }
  if(origen && !leer('acgolfOrigen')) guardar('acgolfOrigen', origen);
  const origenFinal = () => leer('acgolfOrigen') || origen || 'directo';

  let visitante = leer('acgolfVisitante');
  if(!visitante){
    visitante = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 20);
    guardar('acgolfVisitante', visitante);
  }

  function apuntar(evento){
    try {
      const client = (typeof initSupabase === 'function') ? initSupabase() : null;
      if(!client) return;
      client.from('visitas').insert({ visitante, origen: origenFinal(), evento }).then(() => {}, () => {});
    } catch(e){}
  }
  // Cada evento se apunta una sola vez por móvil (la visita, una vez por sesión)
  window.acgolfEvento = function(evento){
    if(evento === 'visita'){
      try { if(sessionStorage.getItem('acgolfVisitaApuntada')) return; sessionStorage.setItem('acgolfVisitaApuntada', '1'); } catch(e){}
    } else {
      const k = 'acgolfEv_' + evento; if(leer(k)) return; guardar(k, '1');
    }
    apuntar(evento);
  };
  window.acgolfEvento('visita');
  // Si la abren ya instalada en la pantalla de inicio
  try { if(matchMedia('(display-mode: standalone)').matches || navigator.standalone) window.acgolfEvento('instalada'); } catch(e){}
})();
