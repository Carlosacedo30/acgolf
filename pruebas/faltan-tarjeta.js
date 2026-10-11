/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Dentro de la partida: «Faltan por cerrar la tarjeta: Jorge (15 de 18)…» ---
// En cuanto un jugador de la partida (de cualquier grupo) tiene todos sus hoyos apuntados, arriba de la tarjeta
// sale quién falta por cerrarla y cuántos hoyos lleva. Cuando la han cerrado todos, sale «Todas las tarjetas cerradas».
(function(){
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };
  const lleno = v => v !== '' && v != null && parseInt(v, 10) > 0;

  function hoyosDeLaPartida(){
    // la tarjeta va en dos filas de 9 (ida y vuelta) por jugador
    const n = document.querySelectorAll('.golpes-row[data-player-index="0"] .golpes-input').length || 18;
    return (typeof prHoyos !== 'undefined' && prHoyos === 9) ? Math.min(9, n) : n;
  }
  // Hoyos apuntados de cada jugador de todos los grupos (el grupo que se ve, tal como está en pantalla)
  function estadoJugadores(){
    if(typeof matchGroups === 'undefined') return [];
    const n = hoyosDeLaPartida();
    const visto = typeof activeGroup !== 'undefined' ? activeGroup : 0;
    const enPantalla = typeof collectGroupScores === 'function' ? collectGroupScores() : null;
    const lista = [];
    matchGroups.forEach((g, gi) => {
      (g.players || []).forEach((nombre, pi) => {
        if(!nombre) return;
        const sc = (gi === visto && enPantalla) ? enPantalla[pi] : (g.scores || {})[pi];
        const hechos = Object.values(sc || {}).filter(lleno).length;
        lista.push({ nombre, hechos: Math.min(hechos, n), n });
      });
    });
    return lista;
  }

  function caja(){
    let el = document.getElementById('ftAviso');
    if(!el){
      const ref = document.getElementById('marcadorSection') || document.getElementById('holeViewSection');
      if(!ref) return null;
      el = document.createElement('div');
      el.id = 'ftAviso'; el.className = 'ft-aviso'; el.hidden = true;
      ref.parentNode.insertBefore(el, ref);
    }
    return el;
  }

  function pintar(){
    const el = caja(); if(!el) return;
    const lista = estadoJugadores();
    const cerrados = lista.filter(j => j.hechos >= j.n);
    if(!lista.length || !cerrados.length){ el.hidden = true; return; } // aún no ha cerrado nadie
    const faltan = lista.filter(j => j.hechos < j.n).sort((a, b) => a.hechos - b.hechos);
    const html = faltan.length
      ? '<b>' + (faltan.length === 1 ? 'Falta por cerrar la tarjeta:' : 'Faltan ' + faltan.length + ' por cerrar la tarjeta:') + '</b>'
        + '<span>' + faltan.map(j => esc(corto(j.nombre)) + ' <i>(' + j.hechos + ' de ' + j.n + ')</i>').join(' · ') + '</span>'
      : '<b>✓ Todas las tarjetas cerradas</b>';
    if(el.dataset.html !== html){ el.innerHTML = html; el.dataset.html = html; }
    el.classList.toggle('ok', !faltan.length);
    el.hidden = false;
  }

  document.addEventListener('input', e => { if(e.target && e.target.classList && e.target.classList.contains('golpes-input')) pintar(); });
  document.addEventListener('change', e => { if(e.target && e.target.classList && e.target.classList.contains('golpes-input')) pintar(); });
  // Los golpes de los otros móviles llegan solos: se repasa cada pocos segundos mientras se ve la tarjeta
  setInterval(() => {
    const s3 = document.querySelector('.screen[data-screen="3"]');
    if(s3 && s3.offsetParent !== null) pintar();
  }, 3000);
})();
