/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. */
// Cinta «🛡 ADMINISTRADOR» arriba de cada pantalla que solo usa un administrador
// (Miembros, Portada, Ayuda con un jugador, Ligas, Normas de la liga). Solo se pone si entras desde la tarjeta
// de administrador de «Mi cuenta» y solo si eres administrador. Sin avisos de «supervisando».
(function(){
  'use strict';
  let activo = false, visto = false;
  const CINTA = '<div class="ea-cinta" role="note"><span>🛡 ADMINISTRADOR</span><small>Esta pantalla solo la ves tú como administrador</small></div>';
  document.addEventListener('click', e => {
    const f = e.target.closest && e.target.closest('.mo-admin .lm-fila');
    const p = window.miPerfil;
    if(f && p && p.es_admin){ activo = true; visto = false; }
  }, true);
  function destino(){
    const g = document.getElementById('cuentaGate');
    if(g && !g.hidden){ const c = g.querySelector('.cg-card'); if(c) return c; }
    const ids = ['ligaOverlay', 'normasOverlay'];
    for(const id of ids){
      const o = document.getElementById(id);
      if(o && !o.hidden && o.offsetParent !== null && getComputedStyle(o).display !== 'none'){ return o.querySelector('.modal-card') || o.firstElementChild || o; }
    }
    return null;
  }
  setInterval(() => {
    if(!activo) return;
    const d = destino();
    if(!d){ if(visto) activo = false; return; }
    visto = true;
    if(!d.querySelector(':scope > .ea-cinta')) d.insertAdjacentHTML('afterbegin', CINTA);
  }, 250);
})();
