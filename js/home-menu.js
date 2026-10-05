/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Inicio limpio: botones grandes que llevan a cada información ---
  // "Clasificación liga" abre la pantalla de la liga. Los demás enseñan solo esa parte del inicio,
  // con un botón para volver; el resto del inicio queda escondido mientras tanto.
  const HOME_FOCO = {
    premios:   { id:'premiosHome',   vacio:'Todavía no hay ganadores: los premios salen cuando se juegan tarjetas de la liga en la semana.' },
    medallas:  { id:'medallasHome',  vacio:'Todavía no hay medallas que enseñar.' },
    recientes: { id:'homeRecientes', vacio:'' },
  };

  function homeFoco(clave){
    const pant = document.querySelector('.screen[data-screen="0"]');
    if(!pant) return;
    Object.values(HOME_FOCO).forEach(f => { const el = document.getElementById(f.id); if(el) el.classList.remove('home-foco-on'); });
    const vacio = document.getElementById('homeVacio');
    if(vacio) vacio.classList.remove('home-foco-on');
    if(!clave || !HOME_FOCO[clave]){ delete pant.dataset.foco; return; }
    pant.dataset.foco = clave;
    const f = HOME_FOCO[clave];
    const el = document.getElementById(f.id);
    if(clave === 'recientes' && typeof renderRecentRounds === 'function') renderRecentRounds();
    if(el){
      el.classList.add('home-foco-on');
      // premios y medallas se esconden solos cuando no hay datos: entonces se avisa
      if(el.style.display === 'none' && f.vacio && vacio){ vacio.textContent = f.vacio; vacio.classList.add('home-foco-on'); }
    }
    const sc = pant.querySelector('.screen-content') || pant;
    try { sc.scrollTo({ top: 0 }); } catch(e){ sc.scrollTop = 0; }
    window.scrollTo(0, 0);
  }

  (function setupHomeMenu(){
    document.querySelectorAll('.home-menu-btn[data-foco]').forEach(b => b.addEventListener('click', ()=> homeFoco(b.dataset.foco)));
    const liga = document.getElementById('hmLiga');
    if(liga) liga.addEventListener('click', ()=>{ homeFoco(null); goTo(6); });
    const volver = document.getElementById('homeVolver');
    if(volver) volver.addEventListener('click', ()=> homeFoco(null));
  })();
