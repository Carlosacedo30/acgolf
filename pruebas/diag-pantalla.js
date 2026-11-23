/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Ayuda para arreglar la franja blanca de abajo en el iPhone: 5 toques rápidos en la línea «© 2026 acgolf» del Inicio
// enseñan los tamaños reales de la pantalla. Se hace un pantallazo y se manda. No cambia nada ni guarda nada.
(function(){
  let toques = [];
  document.addEventListener('click', ev => {
    const t = ev.target && ev.target.closest ? ev.target.closest('.in-pie, .copyright, footer, [class*="copy"]') : null;
    const texto = ev.target && ev.target.textContent ? ev.target.textContent : '';
    if(!t && !/©\s*2026/.test(texto)) return;
    const ahora = Date.now(); toques = toques.filter(x => ahora - x < 2500); toques.push(ahora);
    if(toques.length >= 5){ toques = []; mostrar(); }
  }, true);
  function sonda(css){ const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;' + css; document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); return Math.round(h * 10) / 10; }
  function mostrar(){
    const v = window.visualViewport;
    const filas = [
      ['Ventana (innerWidth × innerHeight)', innerWidth + ' × ' + innerHeight],
      ['Pantalla (screen)', screen.width + ' × ' + screen.height],
      ['Zona visible (visualViewport)', v ? Math.round(v.width) + ' × ' + Math.round(v.height) : 'no hay'],
      ['documentElement.clientHeight', document.documentElement.clientHeight],
      ['Capa fija «inset:0»', sonda('top:0;bottom:0;')],
      ['100vh', sonda('height:100vh;')],
      ['100dvh', sonda('height:100dvh;')],
      ['100svh', sonda('height:100svh;')],
      ['100lvh', sonda('height:100lvh;')],
      ['Margen de arriba (safe)', sonda('height:env(safe-area-inset-top,0px);')],
      ['Margen de abajo (safe)', sonda('height:env(safe-area-inset-bottom,0px);')],
      ['App instalada (standalone)', (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) ? 'SÍ' : 'NO'],
      ['html × body alto', Math.round(document.documentElement.getBoundingClientRect().height) + ' × ' + Math.round(document.body.getBoundingClientRect().height)]
    ];
    let o = document.getElementById('diagPant'); if(o) o.remove();
    o = document.createElement('div'); o.id = 'diagPant';
    o.style.cssText = 'position:fixed;left:8px;right:8px;top:70px;z-index:2147483000;background:#fff;color:#111316;border:3px solid #D7263D;border-radius:16px;padding:12px 14px;font:700 15px/1.35 Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)';
    o.innerHTML = '<div style="font-size:17px;margin-bottom:6px">Medidas de la pantalla</div>' + filas.map(f => '<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #DADFE3;padding:3px 0"><span>' + f[0] + '</span><b>' + f[1] + '</b></div>').join('')
      + '<button type="button" style="margin-top:10px;width:100%;min-height:44px;border:0;border-radius:999px;background:#111316;color:#fff;font:800 15px Arial">Cerrar</button>';
    o.querySelector('button').onclick = () => o.remove();
    document.body.appendChild(o);
  }
})();
