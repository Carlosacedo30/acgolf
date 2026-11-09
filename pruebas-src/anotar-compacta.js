/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Pantalla de anotar más compacta (pedida por Carlos):
// · aviso «Hoyo completo» cuando ya están todos apuntados
// · debajo de los jugadores, solo la media tarjeta (ida o vuelta) según el hoyo
(function(){
  if(typeof renderHoleView !== 'function') return;

  // ---- 1. Aviso «Hoyo completo» ----
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

  // ---- 2. Media tarjeta: la mitad donde está el hoyo ----
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
