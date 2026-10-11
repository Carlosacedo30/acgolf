/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Cuenta las vistas y los toques en el patrocinador ---
// · Vista: el logo o el enlace del patrocinador aparece en la pantalla (una por jugador y día).
// · Toque: el jugador toca el enlace a su web. El enlace lleva la etiqueta «acgolf» para que el
//   patrocinador también vea en sus estadísticas las visitas que le llegan desde la app.
(function(){
  // Patrocinadores conocidos: nombre con el que se cuentan y su web
  const PATROS = [{ nombre: 'Bolarecuperada', dominio: 'bolarecuperada.com', logo: 'logo-bolarecuperada' }];
  const ETIQUETA = 'utm_source=acgolf&utm_medium=app&utm_campaign=patrocinio';

  const deEnlace = a => { const h = a && a.getAttribute && (a.getAttribute('href') || ''); return h ? PATROS.find(p => h.indexOf(p.dominio) >= 0) : null; };
  const deImagen = img => { const s = img && img.getAttribute && (img.getAttribute('src') || ''); return s ? PATROS.find(p => s.indexOf(p.logo) >= 0) : null; };

  function registrar(p, tipo, intento){
    if(!window.miPerfil){ if((intento || 0) < 15) setTimeout(() => registrar(p, tipo, (intento || 0) + 1), 2000); return; }
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) return;
    if(tipo === 'vista'){
      const hoy = new Date().toISOString().slice(0, 10), k = 'acgolfPatroVista_' + p.nombre;
      try { if(localStorage.getItem(k) === hoy) return; localStorage.setItem(k, hoy); } catch(e){}
    }
    client.rpc('registrar_patro', { p_patro: p.nombre, p_tipo: tipo }).then(() => {}, () => {});
  }

  // Etiqueta «acgolf» en los enlaces del patrocinador
  function etiquetar(a){
    const h = a.getAttribute('href') || '';
    if(h.indexOf('utm_source=acgolf') >= 0) return;
    a.setAttribute('href', h + (h.indexOf('?') >= 0 ? '&' : '?') + ETIQUETA);
  }

  // Toques (también los de los enlaces que se pintan más tarde)
  document.addEventListener('click', e => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    const p = deEnlace(a);
    if(!p) return;
    etiquetar(a);
    registrar(p, 'toque');
  }, true);

  // Vistas: cuando el logo o el enlace se ve de verdad en la pantalla
  const vistos = new WeakSet();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(ents => {
    ents.forEach(en => {
      if(!en.isIntersecting) return;
      const p = deEnlace(en.target) || deImagen(en.target);
      if(p) registrar(p, 'vista');
      io.unobserve(en.target);
    });
  }, { threshold: 0.6 }) : null;
  function buscar(){
    document.querySelectorAll('a[href], img[src]').forEach(el => {
      if(vistos.has(el)) return;
      const p = el.tagName === 'A' ? deEnlace(el) : deImagen(el);
      if(!p) return;
      vistos.add(el);
      if(el.tagName === 'A') etiquetar(el);
      if(io) io.observe(el);
    });
  }
  let pend = false;
  new MutationObserver(() => { if(pend) return; pend = true; setTimeout(() => { pend = false; buscar(); }, 400); })
    .observe(document.documentElement, { childList: true, subtree: true });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buscar); else buscar();
})();
