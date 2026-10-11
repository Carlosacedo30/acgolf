/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* Solo en la app antigua de la liga: aviso fijo arriba de que la app principal ahora es acgolf.es.
   (tools/hacer-pruebas.sh lo quita de la versión de pruebas y de acgolf.es) */
(function(){
  if(/acgolf\.es$/i.test(location.hostname) || /\/pruebas\//.test(location.pathname)) return;
  const css = document.createElement('style');
  css.textContent =
    '.aviso-acgolf{position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;'
    + 'padding:12px 16px;background:#D4AF37;color:#15294D;font:700 16px/1.3 system-ui,sans-serif;text-align:center;}'
    + '.aviso-acgolf a{display:inline-block;padding:8px 16px;border-radius:999px;background:#15294D;color:#F6F1E4;text-decoration:none;white-space:nowrap;}';
  document.head.appendChild(css);
  const d = document.createElement('div');
  d.className = 'aviso-acgolf';
  d.innerHTML = '<span>⛳ La app de la liga ahora es <b>acgolf.es</b></span><a href="https://acgolf.es/">Ir a acgolf.es</a>';
  document.body.insertBefore(d, document.body.firstChild);
})();
