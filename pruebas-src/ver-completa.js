/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Listas resumidas con botón «Ver completa» ---
// Clasificación de la liga: solo los 3 primeros. Ganadores de la semana: solo el ganador.
// El botón despliega el resto y «Ver menos» lo vuelve a recoger.
(function(){
  const abierto = { liga: false, semana: false };

  function boton(id, despues, abiertoYa, total, clave){
    let b = document.getElementById(id);
    if(!b){
      b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      b.className = 'vc-btn';
      b.onclick = () => { abierto[clave] = !abierto[clave]; aplicar(); };
    }
    if(despues.nextElementSibling !== b) despues.insertAdjacentElement('afterend', b);
    const txt = abiertoYa ? 'Ver menos' : 'Ver completa' + (total ? ' (' + total + ')' : '');
    if(b.textContent !== txt) b.textContent = txt;
    return b;
  }
  function quitar(id){ const b = document.getElementById(id); if(b) b.remove(); }
  function mostrar(el, si){ if(el && el.hidden === si) el.hidden = !si; }

  function liga(){
    const wrap = document.getElementById('ligaStandings');
    if(!wrap) return;
    const filas = [...wrap.querySelectorAll(':scope > .leaderboard-row')];
    if(filas.length <= 3){ filas.forEach(f => mostrar(f, true)); quitar('ligaVerCompleta'); return; }
    filas.forEach((f, i) => mostrar(f, abierto.liga || i < 3));
    boton('ligaVerCompleta', wrap, abierto.liga, filas.length, 'liga');
  }

  function semana(){
    const el = document.getElementById('premiosHome');
    if(!el) return;
    const lista = el.querySelector('.premios-lista');
    if(!lista){ quitar('semanaVerCompleta'); return; }
    const resto = [...lista.querySelectorAll('.premio:not(.top)'), ...el.querySelectorAll('.gn-lista')];
    if(!resto.length){ quitar('semanaVerCompleta'); return; }
    resto.forEach(r => mostrar(r, abierto.semana));
    const filas = el.querySelectorAll('.gn-lista .gn-fila').length;
    boton('semanaVerCompleta', lista, abierto.semana, filas, 'semana');
  }

  let ocupado = false;
  function aplicar(){
    if(ocupado) return;
    ocupado = true;
    try { liga(); semana(); } finally { ocupado = false; }
  }

  // Se vuelve a aplicar cada vez que la app repinta esas listas
  const obs = new MutationObserver(() => { if(!ocupado) aplicar(); });
  function vigilar(){
    ['ligaStandings', 'premiosHome'].forEach(id => {
      const el = document.getElementById(id);
      if(el && !el.dataset.vcVigilado){ el.dataset.vcVigilado = '1'; obs.observe(el, { childList: true, subtree: true }); }
    });
    const pl = document.getElementById('ligaStandings');
    if(pl && pl.parentNode && !pl.parentNode.dataset.vcVigilado){ pl.parentNode.dataset.vcVigilado = '1'; obs.observe(pl.parentNode, { childList: true }); }
    aplicar();
  }
  // Al cambiar de mes o de semana, la lista se vuelve a recoger
  document.addEventListener('click', ev => {
    const t = ev.target.closest && ev.target.closest('#ligaPrevMonth, #ligaNextMonth');
    if(t) abierto.liga = false;
    const s = ev.target.closest && ev.target.closest('#gnAntes, #gnDespues, #gnHoy');
    if(s) abierto.semana = false;
  }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();
})();
