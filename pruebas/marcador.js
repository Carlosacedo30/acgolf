/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Marcador y validación cruzada (versión de pruebas, estilo NextCaddy) ---
// Cada jugador, con su móvil y su cuenta, apunta sus golpes y los del jugador al que marca.
// Hoyo a hoyo se compara lo que apunta cada uno: ✅ coincide / ⚠️ no coincide.
// Al final se entrega la tarjeta: es oficial cuando la entrega el jugador y la confirma su marcador.
// Sin marcador (jugando solo) la tarjeta no cuenta para la liga.
(function(){
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w[0] || n; };
  let est = null, estCode = null, estJson = '', cargando = false, aviso = '';
  let elegidos = null, elegidosKey = '';       // marcadores elegidos en pantalla antes de confirmar
  let llegada = { hoyo: null, completo: false }, avanceTimer = null;

  const yo = () => window.miPerfil && window.miPerfil.player_name;
  const grupoEst = () => (est || []).find(g => +g.grupo === +activeGroup);
  const miIdx = () => players.findIndex(n => n === yo());
  function propio(idx, h){
    const inp = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + idx + '"]');
    const v = inp ? parseInt(inp.value, 10) : NaN;
    return isNaN(v) || v <= 0 ? null : v;
  }
  function marca(g, idx, h){
    const j = g && g.jugadores.find(x => +x.idx === +idx);
    const v = j && j.marcas ? j.marcas[String(h)] : null;
    return v == null ? null : +v;
  }
  const marcados = g => g ? g.jugadores.filter(j => +j.marcador_idx === miIdx()).map(j => +j.idx) : [];

  async function cargar(forzar){
    if(!currentRoundCode || cargando) return;
    cargando = true;
    try {
      const { data, error } = await initSupabase().rpc('estado_marcas', { p_code: currentRoundCode });
      if(error) throw error;
      const json = JSON.stringify(data || []);
      const cambio = json !== estJson || estCode !== currentRoundCode;
      est = data || []; estCode = currentRoundCode; estJson = json;
      if(cambio || forzar){ repintarHoyo(); pintarEntrega(); }
    } catch(e){}
    cargando = false;
  }
  function repintarHoyo(){
    const scr = document.querySelector('.screen.active[data-screen="3"]');
    if(scr && typeof window.renderHoleView === 'function') window.renderHoleView();
  }
  setInterval(() => { if(document.visibilityState === 'visible' && currentRoundCode) cargar(); }, 5000);

  // ---------- Elegir quién marca a quién (antes de empezar) ----------
  function htmlElegir(n){
    const key = currentRoundCode + ':' + activeGroup + ':' + players.join('|');
    if(elegidosKey !== key){ elegidosKey = key; elegidos = players.map((_, i) => (i + 1) % n); }
    return '<div class="mk-elegir">'
      + '<div class="mk-tit">Antes de empezar: ¿quién marca a quién?</div>'
      + '<p class="mk-p">Cada uno apunta en su móvil sus golpes y los del jugador al que marca. Toca para cambiarlo.</p>'
      + players.map((name, i) => '<div class="mk-fila"><div class="mk-q">A <b>' + esc(name) + '</b> le marca:</div><div class="mk-ops">'
          + players.map((m, j) => j === i ? '' : '<button type="button" class="mk-op' + (elegidos[i] === j ? ' on' : '') + '" data-i="' + i + '" data-j="' + j + '">' + esc(corto(m)) + '</button>').join('')
          + '</div></div>').join('')
      + (aviso ? '<p class="mk-aviso">' + esc(aviso) + '</p>' : '')
      + '<button type="button" class="mk-btn" id="mkEmpezar">Empezar a jugar</button></div>';
  }
  function enlazarElegir(wrap){
    wrap.querySelectorAll('.mk-op').forEach(b => b.onclick = () => { elegidos[+b.dataset.i] = +b.dataset.j; aviso = ''; window.renderHoleView(); });
    const go = wrap.querySelector('#mkEmpezar');
    if(go) go.onclick = async () => {
      go.disabled = true; go.textContent = 'Guardando…';
      const { error } = await initSupabase().rpc('fijar_marcadores', { p_code: currentRoundCode, p_grupo: +activeGroup, p_marcadores: elegidos });
      aviso = error ? String(error.message) : '';
      await cargar(true);
      window.renderHoleView();
    };
  }

  // ---------- Hoyo: dos columnas (yo + al que marco) ----------
  function estadoTxt(mio, otro, quien){
    if(mio == null) return { cls:'', txt:'&nbsp;' };
    if(otro == null) return { cls:'espera', txt:'⏳ Falta ' + quien };
    return mio === otro ? { cls:'ok', txt:'✅ Coincide' } : { cls:'mal', txt:'⚠️ ' + (quien === 'tu marcador' ? 'Tu marcador puso ' : 'Él se puso ') + '<b>' + otro + '</b>' };
  }
  function htmlColumnas(g, h, par, si){
    const me = miIdx();
    const cols = [me].concat(marcados(g));
    const tuPar = i => par != null ? par + Math.max(0, si != null ? strokesForHole(playerHandicaps[i], si) : 0) : '—';
    return '<div class="mk-cols" style="--n:' + cols.length + '">' + cols.map((i, k) => {
      const esYo = k === 0;
      const val = esYo ? propio(i, h) : marca(g, i, h);
      const otro = esYo ? marca(g, i, h) : propio(i, h);
      const st = estadoTxt(val, otro, esYo ? 'tu marcador' : corto(players[i]));
      const marcadorDe = g.jugadores.find(x => +x.idx === i);
      const sub = esYo ? 'Te marca ' + esc(corto(players[(marcadorDe || {}).marcador_idx])) : 'Le marcas tú';
      return '<div class="mk-col ' + st.cls + '">'
        + '<div class="mk-n">' + (esYo ? 'Tú' : esc(corto(players[i]))) + '</div>'
        + '<div class="mk-sub">' + sub + '</div>'
        + '<div class="mk-tp">' + (esYo ? 'Tu par' : 'Su par') + ' <b>' + tuPar(i) + '</b></div>'
        + '<button type="button" class="mk-box' + (val != null ? ' filled' : '') + '" data-i="' + i + '" data-yo="' + (esYo ? 1 : 0) + '">' + (val != null ? val : '+') + '</button>'
        + '<div class="mk-st">' + st.txt + '</div></div>';
    }).join('') + '</div>';
  }
  function enlazarColumnas(wrap, g, h, par, si){
    wrap.querySelectorAll('.mk-box').forEach(b => b.onclick = () => {
      const i = +b.dataset.i, esYo = b.dataset.yo === '1';
      const rec = si != null ? strokesForHole(playerHandicaps[i], si) : 0;
      const actual = esYo ? propio(i, h) : marca(g, i, h);
      openNumPad({ name: esYo ? players[i] + ' (tú)' : players[i] + ' · le marcas tú', hole: h, par: par, tuPar: par != null ? par + Math.max(0, rec) : null, value: actual == null ? '' : String(actual),
        onPick: v => esYo ? apuntarPropio(i, h, v) : apuntarMarca(g, i, h, v) });
    });
  }
  function apuntarPropio(i, h, v){
    const real = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + i + '"]');
    if(real){ real.value = v; real.dispatchEvent(new Event('input', { bubbles: true })); }
    window.renderHoleView(); quizaAvanzar(h);
  }
  async function apuntarMarca(g, i, h, v){
    const j = g.jugadores.find(x => +x.idx === i);
    if(j){ j.marcas = j.marcas || {}; if(v === '') delete j.marcas[String(h)]; else j.marcas[String(h)] = +v; }
    window.renderHoleView(); quizaAvanzar(h);
    const { error } = await initSupabase().rpc('anotar_marca', { p_code: currentRoundCode, p_grupo: +activeGroup, p_jugador: i, p_hoyo: h, p_golpes: v === '' ? null : +v });
    if(error) alert(error.message || 'No se pudo guardar. Revisa la cobertura.');
    cargar(true);
  }
  function hoyoMioCompleto(g, h){
    const me = miIdx();
    return propio(me, h) != null && marcados(g).every(i => marca(g, i, h) != null);
  }
  function quizaAvanzar(h){
    clearTimeout(avanceTimer);
    const g = grupoEst();
    if(!g || llegada.completo || h >= 18 || !hoyoMioCompleto(g, h)) return;
    avanceTimer = setTimeout(() => {
      if(currentHole !== h || !hoyoMioCompleto(grupoEst(), h)) return;
      currentHole = h + 1; window.renderHoleView();
    }, 1500);
  }
  function marcarFichasHoyos(g){
    const me = miIdx();
    document.querySelectorAll('#holeStrip .hole-chip').forEach(c => {
      const h = +c.dataset.hole;
      const mal = [me].concat(marcados(g)).some(i => { const a = propio(i, h), b = marca(g, i, h); return a != null && b != null && a !== b; });
      c.classList.toggle('mk-mal', mal);
    });
  }

  if(typeof window.renderHoleView === 'function'){
    const orig = window.renderHoleView;
    window.renderHoleView = function(){
      const r = orig.apply(this, arguments);
      try { pintarHoyo(); } catch(e){ console.error(e); }
      return r;
    };
  }
  function pintarHoyo(){
    const wrap = document.getElementById('hvPlayers');
    const scores = wrap && wrap.querySelector('.hv-scores');
    if(!scores || !currentRoundCode || !yo()) return;
    const me = miIdx();
    if(me < 0) return; // no juego en este grupo: se ve como siempre
    const n = players.filter(Boolean).length;
    if(n < 2){
      scores.insertAdjacentHTML('beforebegin', '<div class="mk-solo">Juegas solo: sin marcador, esta tarjeta no cuenta para la liga.</div>');
      return;
    }
    if(estCode !== currentRoundCode){ cargar(true); scores.outerHTML = '<div class="mk-p">Cargando marcadores…</div>'; return; }
    const g = grupoEst();
    if(!g) return;
    const h = currentHole;
    const input0 = document.querySelector('.golpes-input[data-hole="' + h + '"]');
    const par = input0 ? parseInt(input0.dataset.par, 10) : null;
    const si = input0 ? parseInt(input0.dataset.strokeIndex, 10) : null;
    if(llegada.hoyo !== h){ llegada = { hoyo: h, completo: hoyoMioCompleto(g, h) }; clearTimeout(avanceTimer); }
    const conMarcadores = g.jugadores.every(j => j.marcador_idx != null);
    const div = document.createElement('div');
    div.innerHTML = conMarcadores ? htmlColumnas(g, h, par, isNaN(si) ? null : si) : htmlElegir(n);
    const nuevo = div.firstElementChild;
    scores.replaceWith(nuevo);
    if(conMarcadores){ enlazarColumnas(wrap, g, h, par, isNaN(si) ? null : si); marcarFichasHoyos(g); }
    else enlazarElegir(wrap);
  }

  // ---------- Entregar la tarjeta (pantalla de resultados) ----------
  const share = document.getElementById('s4ShareSection');
  const sec = document.createElement('section');
  sec.id = 'entregaSection'; sec.className = 'fm'; sec.style.display = 'none';
  if(share) share.parentNode.insertBefore(sec, share.nextSibling);

  function pintarEntrega(){
    if(!share) return;
    const terminada = (typeof roundMarkedFinished !== 'undefined' && roundMarkedFinished) || (typeof isRoundFinished === 'function' && isRoundFinished(matchGroups));
    if(!currentRoundCode || !terminada || !yo()){ sec.style.display = 'none'; return; }
    sec.style.display = '';
    if(estCode !== currentRoundCode){ sec.innerHTML = '<div class="eyebrow">Entrega de tarjetas</div><p class="fm-p">Comprobando…</p>'; cargar(true); return; }
    const g = grupoEst();
    if(!g){ sec.style.display = 'none'; return; }
    const me = miIdx();
    const nombre = i => esc(players[i] || '');
    let h = '<div class="eyebrow">Entrega de tarjetas</div><div class="fm-tabla">' + g.jugadores.map(j => {
      const e = j.validada ? '✅ Oficial' : j.marcador_idx == null ? 'Sin marcador' : !j.ok ? '⚠️ No coincide' : (j.entregada ? 'Falta su marcador' : j.confirmada ? 'Falta que la entregue' : 'Lista para entregar');
      return '<div class="fm-fila"><span>' + nombre(+j.idx) + '</span><b>' + e + '</b></div>';
    }).join('') + '</div>';
    const mia = g.jugadores.find(j => +j.idx === me);
    const misMarcados = g.jugadores.filter(j => +j.marcador_idx === me);
    const yaHecho = mia && mia.entregada && misMarcados.every(j => j.confirmada);
    if(me < 0){ h += '<p class="fm-p">Las entregan los jugadores de este grupo desde su móvil.</p>'; }
    else if(!mia || mia.marcador_idx == null){ h += '<p class="fm-p">Has jugado sin marcador: esta tarjeta no cuenta para la liga.</p>'; }
    else if(yaHecho){ h += '<div class="fm-ok">✅ Has entregado tu tarjeta' + (misMarcados.length ? ' y confirmado la de ' + misMarcados.map(j => esc(corto(j.nombre))).join(' y ') : '') + '.<br><small>Cuenta para la liga cuando también la confirme tu marcador.</small></div>'; }
    else if(!mia.ok || misMarcados.some(j => !j.ok)){ h += '<p class="fm-p">Para entregar, tus 18 hoyos y los del jugador que marcas tienen que coincidir con lo que apuntó el otro. Revisa los hoyos en naranja.</p>'; }
    else { h += '<button type="button" class="fm-btn" id="mkEntregar">Entregar mi tarjeta</button>'; }
    h += '<button type="button" class="fm-link" id="mkRecargar">Comprobar otra vez</button>';
    if(aviso) h += '<p class="fm-aviso">' + esc(aviso) + '</p>';
    sec.innerHTML = h;
    const rc = document.getElementById('mkRecargar'); if(rc) rc.onclick = () => { aviso = ''; cargar(true); };
    const en = document.getElementById('mkEntregar');
    if(en) en.onclick = async () => {
      if(!confirm('¿Entregas tu tarjeta?\n\nDespués ya no se puede cambiar.')) return;
      en.disabled = true; en.textContent = 'Entregando…'; aviso = '';
      const { data, error } = await initSupabase().rpc('entregar_tarjeta', { p_code: currentRoundCode, p_grupo: +activeGroup });
      if(error) aviso = String(error.message || 'No se pudo entregar. Revisa la cobertura.');
      else { est = data || []; estJson = JSON.stringify(est); estCode = currentRoundCode; }
      pintarEntrega();
    };
  }
  if(typeof window.renderDiagnostico === 'function'){
    const origD = window.renderDiagnostico;
    window.renderDiagnostico = function(){ const r = origD.apply(this, arguments); try { pintarEntrega(); } catch(e){} return r; };
  }
})();
