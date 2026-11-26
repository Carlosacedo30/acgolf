/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Añadir un jugador a una liga ya empezada (Carlos, 26-nov-2026). SOLO pruebas.
// El jugador entra como «nuevo»: sale en la clasificación en cuanto se añade, con 0 puntos, y suma desde su primera ronda.
// Las rondas ya jugadas no cambian. Las rondas que aún no tienen grupos guardados lo incluyen solas al repartir.
(function(){
  'use strict';
  let ov = null;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function cerrar(){ if(ov) ov.hidden = true; }
  function abrir(l){
    const libres = (typeof ligaJugadoresTodos === 'function' ? ligaJugadoresTodos() : []).filter(n => !l.jugadores.includes(n));
    if(!ov){ ov = document.createElement('div'); ov.className = 'cd-ov la-ov'; ov.hidden = true; document.body.appendChild(ov);
      ov.addEventListener('click', e => { if(e.target === ov) cerrar(); }); }
    ov.innerHTML = '<div class="cd-pop"><small>AÑADIR JUGADOR A LA LIGA</small>'
      + (libres.length
        ? '<p class="la-t">¿Quién entra en «' + esc(l.nombre) + '»?</p><div class="la-lista">'
          + libres.map(n => '<button type="button" class="la-j" data-n="' + esc(n) + '"><b>' + esc(n) + '</b><span>hándicap ' + esc(String(ligaHcp(n) == null ? '–' : ligaHcp(n)).replace('.', ',')) + '</span></button>').join('') + '</div>'
          + '<p class="la-nota">Entra con 0 puntos y suma desde su primera ronda. Las rondas ya jugadas no cambian.</p>'
        : '<p class="la-t">Todos los jugadores del grupo ya están en la liga.</p>')
      + '<button type="button" class="cd-mapa" id="laCerrar">' + (libres.length ? 'Cancelar' : 'Cerrar') + '</button></div>';
    ov.hidden = false;
    ov.querySelector('#laCerrar').onclick = cerrar;
    ov.querySelectorAll('.la-j').forEach(b => b.onclick = async () => {
      const n = b.dataset.n;
      if(!await acgolfConfirmar('¿Añadir a ' + n + ' a la liga «' + l.nombre + '»?\nEntra con 0 puntos y suma desde su primera ronda.')) return;
      b.disabled = true;
      const client = typeof initSupabase === 'function' ? initSupabase() : null;
      if(!client){ alert('No hay conexión.'); b.disabled = false; return; }
      const antesJ = l.jugadores.slice(), antesN = Object.assign({}, l.nuevos || {});
      l.jugadores = l.jugadores.concat(n); l.nuevos = Object.assign({}, l.nuevos || {}, { [n]: new Date().toISOString().slice(0, 10) });
      const { error } = await client.from('rounds').update({ match_groups: ligaAFila(l) }).eq('id', l.id);
      if(error){ l.jugadores = antesJ; l.nuevos = antesN; console.error(error); alert('No se pudo añadir. Revisa la conexión.'); b.disabled = false; return; }
      cerrar();
      try { ligaVer(l.code); } catch(e){}
    });
  }

  function enganchar(){
    if(typeof window.ligaVer !== 'function' || window.ligaVer.__la) return;
    const orig = window.ligaVer;
    const nuevo = async function(code){
      const r = await orig.apply(this, arguments);
      try {
        const l = ligasTodas.find(x => x.code === code);
        const body = document.getElementById('ligaCuerpo');
        if(l && body && ligaAbierta === code && ligaEsAdmin() && !body.querySelector('#laAnadir')){
          const b = document.createElement('button'); b.type = 'button'; b.id = 'laAnadir'; b.className = 'la-btn'; b.textContent = '＋ Añadir jugador a la liga';
          b.onclick = () => abrir(l);
          const ref = body.querySelector('.conv-actions'); if(ref) ref.before(b); else body.appendChild(b);
        }
      } catch(e){ console.error(e); }
      return r;
    };
    nuevo.__la = true; window.ligaVer = nuevo;
  }
  if(document.readyState === 'complete') enganchar(); else window.addEventListener('load', () => setTimeout(enganchar, 0));
})();
