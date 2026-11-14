/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Marcador completo (pedido por Carlos, 13-nov-2026) ---
// A la tarjeta de ida / vuelta le añade, por hoyo: los golpes que RECIBE el jugador (según su hándicap de juego
// y la dificultad del hoyo) y los PUNTOS Stableford (o el neto, si se juega a golpes), con sus totales.
// Si se juega a 9 hoyos, solo sale la media tarjeta que se juega. Los círculos y cuadrados de cada hoyo
// siguen siendo los de siempre (golpes contra el par, sin hándicap).
(function(){
  if(typeof window.renderHoleView !== 'function') return;
  const inp = (h, i) => document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + i + '"]');
  const base = h => document.querySelector('.golpes-input[data-hole="' + h + '"]');
  const golpesDe = (h, i) => { const x = inp(h, i); const v = x ? parseInt(x.value, 10) : NaN; return isNaN(v) || v <= 0 ? null : v; };
  const num = (el, k) => { const v = el ? parseInt(el.dataset[k], 10) : NaN; return isNaN(v) ? null : v; };
  const yoIdx = () => {
    let yo = window.miPerfil && window.miPerfil.player_name;
    if(!yo){ try { yo = localStorage.getItem('golfAppConvMe'); } catch(e){} }
    const i = players.indexOf(yo); return i >= 0 ? i : 0;
  };
  const jugadorVisto = () => {
    const on = document.querySelector('#marcadorVivo .tb-cl-fila.on[data-p]');
    return on ? +on.dataset.p : yoIdx();
  };
  const puntos = (v, par, rec) => v == null || par == null ? null : Math.max(0, 2 - (v - rec - par));

  // Lógica pura para las pruebas
  window.acgolfMarcadorCompleto = { puntos };

  function completar(){
    const t = document.getElementById('tbTira');
    if(!t) return;
    const bloques = t.querySelectorAll('.tb-bloque');
    if(!bloques.length || t.dataset.mc === '1' && t.querySelector('.tb-r-rc')) return;
    const i = jugadorVisto();
    if(!players[i] || String(players[i]).includes(' / ')) return;      // parejas: se queda como estaba
    const stf = typeof scoringType === 'undefined' || scoringType === 'stableford';
    let totG = 0, totR = 0, totX = 0, hayGolpes = false, bloquesVisibles = 0;
    bloques.forEach(b => {
      const hoyos = Array.from(b.querySelectorAll('.tb-h')).map(x => +x.dataset.h);
      const hayHoyos = hoyos.some(h => base(h));
      if(!hayHoyos){ b.style.display = 'none'; return; }          // 9 hoyos: la media tarjeta que no se juega no sale
      bloquesVisibles++;
      let recT = 0, xT = 0, filaR = '', filaX = '';
      hoyos.forEach(h => {
        const par = num(base(h), 'par'), si = num(base(h), 'strokeIndex'), v = golpesDe(h, i);
        const rec = si != null && typeof strokesForHole === 'function' ? strokesForHole(hcpJuego(i), si) : 0;
        recT += Math.max(0, rec);
        filaR += '<span class="mc-rec">' + (rec > 0 ? '●'.repeat(Math.min(rec, 3)) : '') + '</span>';
        if(v != null){
          hayGolpes = true; totG += v;
          const x = stf ? puntos(v, par, rec) : v - rec;
          xT += x == null ? 0 : x; totX += x == null ? 0 : x;
          filaX += '<span class="mc-p">' + (x == null ? '' : x) + '</span>';
        } else filaX += '<span class="mc-p"></span>';
      });
      totR += recT;
      const algo = hoyos.some(h => golpesDe(h, i) != null);
      b.insertAdjacentHTML('beforeend',
        '<div class="tb-r tb-r-rc"><span class="tb-lbl">Recibes</span>' + filaR + '<span class="tb-tot">' + recT + '</span></div>'
        + '<div class="tb-r tb-r-pt"><span class="tb-lbl">' + (stf ? 'Puntos' : 'Neto') + '</span>' + filaX + '<span class="tb-tot b">' + (algo ? xT : '') + '</span></div>');
    });
    // Si se juega a 9 hoyos no hace falta «Tarjeta entera»
    const ver = document.getElementById('tbVer');
    const distintos = new Set(Array.from(document.querySelectorAll('.golpes-input[data-hole]')).map(x => x.dataset.hole)).size;
    if(ver) ver.style.display = distintos > 0 && distintos <= 9 ? 'none' : '';
    const viejo = t.querySelector('.mc-total'); if(viejo) viejo.remove();
    const cab = t.querySelector('.tb-tira-cab');
    const lista = t.querySelectorAll('.tb-bloque');
    const ult = Array.from(lista).filter(x => x.style.display !== 'none').pop();
    if(ult){
      const hcp = typeof hcpJuego === 'function' ? hcpJuego(i) : null;
      ult.insertAdjacentHTML('afterend', '<div class="mc-total"><span>Golpes <b>' + (hayGolpes ? totG : '—') + '</b></span>'
        + '<span>Recibes <b>' + totR + '</b></span><span>' + (stf ? 'Puntos' : 'Neto') + ' <b>' + (hayGolpes ? totX : '—') + '</b></span></div>');
    }
    t.dataset.mc = '1';
  }

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try { const t = document.getElementById('tbTira'); if(t) t.dataset.mc = ''; setTimeout(completar, 0); } catch(e){ console.error(e); }
    return r;
  };
  // «Tarjeta entera ›» vuelve a pintar la tira sin pasar por renderHoleView: se completa otra vez
  const mirar = () => {
    const t = document.getElementById('tbTira');
    if(!t){ setTimeout(mirar, 800); return; }
    new MutationObserver(() => { if(!t.querySelector('.tb-r-rc')) { t.dataset.mc = ''; completar(); } }).observe(t, { childList: true });
    completar();
  };
  mirar();
})();
