/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «Me retiro» (dibujo y norma de Carlos, 14-nov-2026) ---
// Solo en partidas con marcadores. Botón abajo del todo → pregunta → OK. El jugador desaparece de la partida,
// no se guarda nada suyo, se rehacen los marcadores y se mantienen los resultados de los demás.
(function(){
  if(typeof window.renderHoleView !== 'function') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nombre = n => String(n || '').trim().replace(/\s+/g, ' ');
  const yo = () => window.miPerfil && window.miPerfil.player_name;
  const key = () => currentRoundCode + ':' + activeGroup;
  const modo = () => { const g = (typeof matchGroups !== 'undefined' && matchGroups[activeGroup]) || {}; return g.modo || 'individual'; };
  const soy = () => !!yo() && (modo() === 'foursome' ? players.some(n => String(n).indexOf(yo()) >= 0) : players.indexOf(yo()) >= 0);
  const conMarcador = () => !!(window.acgolfModoMarcador && window.acgolfModoMarcador.con(currentRoundCode));
  let previos = null, previosKey = '', avisoRetirados = [], avisoHasta = 0, enviando = false, error = '';

  function texto(){
    const m = modo();
    const extra = m === 'fourball' ? '<p>Tu compañero sigue jugando solo, con su bola.</p>'
      : m === 'foursome' ? '<p>Como se juega por parejas, <b>se retira la pareja entera</b>.</p>' : '';
    return '<h2>¿Seguro que te retiras?</h2>'
      + '<p>Se borra todo lo tuyo de esta partida: <b>no se guarda tu tarjeta ni cambia tu hándicap</b>. Los demás siguen jugando.</p>' + extra
      + (error ? '<p class="mr-err">' + esc(error) + '</p>' : '')
      + '<button type="button" class="mr-ok" id="mrOk"' + (enviando ? ' disabled' : '') + '>' + (enviando ? 'Retirando…' : 'OK, ME RETIRO') + '</button>'
      + '<button type="button" class="mr-no" id="mrNo">NO, SIGO JUGANDO</button>';
  }
  function abrir(){
    error = '';
    let m = document.getElementById('mrModal');
    if(!m){ m = document.createElement('div'); m.id = 'mrModal'; m.className = 'mr-modal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="mr-caja">' + texto() + '</div>';
    m.style.display = 'flex';
    m.querySelector('#mrNo').onclick = cerrar;
    m.querySelector('#mrOk').onclick = retirar;
  }
  function cerrar(){ const m = document.getElementById('mrModal'); if(m) m.style.display = 'none'; }
  async function retirar(){
    if(enviando) return;
    enviando = true; abrir();
    try {
      const { data, error: e } = await initSupabase().rpc('me_retiro', { p_code: currentRoundCode, p_grupo: +activeGroup });
      if(e) throw e;
      enviando = false;
      const caja = document.querySelector('#mrModal .mr-caja');
      if(caja) caja.innerHTML = '<h2>Te has retirado</h2><p>No se ha guardado nada tuyo de esta partida. Los demás siguen jugando.</p><button type="button" class="mr-ok" id="mrFin">VOLVER AL INICIO</button>';
      const fin = () => { cerrar(); try { if(typeof clearLocalBackup === 'function') clearLocalBackup(); } catch(x){} if(typeof leaveCurrentRound === 'function') leaveCurrentRound(); else location.reload(); };
      document.getElementById('mrFin').onclick = fin;
    } catch(e){
      enviando = false;
      error = String((e && e.message) || 'No se pudo. Revisa la cobertura e inténtalo otra vez.');
      abrir();
    }
  }

  function revisarRetirados(){
    const k = key(), lista = (players || []).map(nombre);
    if(previosKey === k && previos){
      const quitados = previos.filter(n => lista.indexOf(n) < 0 && n !== nombre(yo()));
      if(quitados.length && lista.length){ avisoRetirados = quitados; avisoHasta = Date.now() + 25000; }
    }
    previos = lista; previosKey = k;
  }

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try {
      revisarRetirados();
      const wrap = document.getElementById('hvPlayers');
      if(!wrap) return r;
      const padre = wrap.parentElement;
      document.querySelectorAll('.mr-bloque,.mr-aviso').forEach(e => e.remove());
      if(Date.now() < avisoHasta && avisoRetirados.length){
        const a = document.createElement('div'); a.className = 'mr-aviso';
        a.innerHTML = '<b>' + avisoRetirados.map(esc).join(', ') + (avisoRetirados.length > 1 ? ' se han retirado.' : ' se ha retirado.') + '</b><br><span>Se ha rehecho quién marca a quién. Sus golpes no cuentan.</span>';
        wrap.parentElement.insertBefore(a, wrap);
      }
      if(conMarcador() && soy() && players.length > 1 && !wrap.querySelector('.mk-mesa')){
        const b = document.createElement('div'); b.className = 'mr-bloque';
        b.innerHTML = '<button type="button" class="mr-btn" id="mrAbrir">ME RETIRO</button><p>Si te retiras no se guarda nada tuyo.</p>';
        padre.appendChild(b);
        b.querySelector('#mrAbrir').onclick = abrir;
      }
    } catch(e){ console.error(e); }
    return r;
  };
  // Si otro jugador se retira, este móvil se entera por la partida en vivo: se repinta para mostrar el aviso
  setInterval(() => { try { const antes = JSON.stringify(players); if(previos && previosKey === key() && antes !== JSON.stringify(previos) ) window.renderHoleView(); } catch(e){} }, 3000);
  if(window.acgolfModoMarcador && currentRoundCode) window.acgolfModoMarcador.cargar(currentRoundCode);
})();
