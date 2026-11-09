/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Pantalla de anotar más compacta (pedida por Carlos):
// · al elegir los golpes de un jugador, el teclado salta solo al siguiente que falte (solo entre los que apunta este móvil)
// · aviso «Hoyo completo» cuando ya están todos apuntados
// · debajo de los jugadores, solo la media tarjeta (ida o vuelta) según el hoyo
(function(){
  if(typeof openNumPad !== 'function' || typeof renderHoleView !== 'function') return;

  // ---- 1. El teclado salta al siguiente jugador sin golpes ----
  const abrirOrig = openNumPad;
  window.openNumPad = function(o){
    const pick = o.onPick;
    const mio = o.name;
    const nuevo = Object.assign({}, o, { onPick: function(v){
      pick(v);
      if(v === '' || v == null) return;
      // el hoyo se repinta al apuntar: esperamos un momento y abrimos el siguiente que falte
      setTimeout(function(){
        try {
          const cajas = [].slice.call(document.querySelectorAll('#hvPlayers .stroke-box'));
          const i = players.indexOf(mio);
          const orden = cajas.filter(function(c){ return +c.dataset.holeInputFor !== i; })
            .sort(function(a, b){ return ((+a.dataset.holeInputFor - i + 99) % 99) - ((+b.dataset.holeInputFor - i + 99) % 99); });
          // Solo salta entre los jugadores que apunta ESTE móvil (la app ya los recuerda).
          // Si este móvil solo apunta a uno, o aún no se sabe, no salta a nadie.
          let mios = null;
          try { if(typeof syncMyPlayers === 'function') syncMyPlayers(); if(typeof myPlayers !== 'undefined') mios = myPlayers; } catch(e){}
          if(!mios || mios.size < 2) return;
          const falta = orden.find(function(c){ return c.value === '' && mios.has(players[+c.dataset.holeInputFor]); });
          if(falta) falta.click();
        } catch(e){}
      }, 120);
    } });
    return abrirOrig.call(this, nuevo);
  };

  // ---- 2. Aviso «Hoyo completo» ----
  function aviso(){
    const w = document.getElementById('hvPlayers');
    if(!w) return;
    let b = document.getElementById('hvCompleto');
    const completo = typeof isHoleComplete === 'function' && isHoleComplete(currentHole);
    if(!completo){ if(b) b.remove(); return; }
    if(!b){ b = document.createElement('div'); b.id = 'hvCompleto'; b.className = 'hv-completo'; }
    const ultimo = typeof hoyoUltimo === 'function' && currentHole === hoyoUltimo();
    b.innerHTML = '<b>✓ Hoyo completo</b><span>' + (ultimo ? 'Era el último hoyo. ¡A finalizar la partida!' : 'Pasa al ' + (typeof hoyoSiguiente === 'function' ? hoyoSiguiente(currentHole) : currentHole + 1) + ' con la flecha.') + '</span>';
    w.after(b);
  }

  // ---- 3. Media tarjeta: la mitad donde está el hoyo ----
  function media(){
    const t = document.getElementById('tbTira');
    if(!t) return;
    const bl = t.querySelectorAll('.tb-bloque');
    if(bl.length < 2) return;
    // el hoyo de la mitad de la tarjeta en la que estamos
    const ida = currentHole <= 9;
    bl.forEach(function(x, k){ x.style.display = (k === 0) === ida ? '' : 'none'; });
    const c = t.querySelector('.tb-tira-cab b');
    if(c && !/IDA|VUELTA/.test(c.textContent)) c.textContent = c.textContent.replace('TARJETA', ida ? 'IDA (1 A 9)' : 'VUELTA (10 A 18)');
  }

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try { aviso(); media(); } catch(e){ console.error(e); }
    return r;
  };
})();
