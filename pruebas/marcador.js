/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Marcador y validación cruzada (versión de pruebas, estilo NextCaddy) ---
// Cada jugador, con su móvil y su cuenta, apunta sus golpes y los del jugador al que marca.
// Hoyo a hoyo se compara lo que apunta cada uno: ✅ coincide / ⚠️ no coincide.
// Al final se entrega la tarjeta: es oficial cuando la entrega el jugador y la confirma su marcador.
// Solo en las partidas de una liga creada en «Crear liga»; las partidas normales cuentan sin marcador.
(function(){
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => String(n || '').trim().replace(/\s+/g, ' ');   // norma de Carlos: en los marcadores siempre el nombre completo
  let est = null, estCode = null, estJson = '', cargando = false, aviso = '';
  let elegidos = null, elegidosKey = '';       // marcadores elegidos en pantalla antes de confirmar
  let llegada = { hoyo: null, completo: false }, avanceTimer = null;

  // ---------- ¿Hace falta marcador? ----------
  // Solo en las partidas que salen de una liga creada en «Crear liga».
  // Las partidas normales no llevan marcador y cuentan solas para la liga semanal y mensual.
  const modos = {};                       // código de partida → true (de una liga creada) / false (normal)
  const conMarcadorEn = code => modos[code] === true;
  async function cargarModo(code){
    if(code in modos) return;
    try {
      const { data, error } = await initSupabase().rpc('es_partida_liga', { p_code: code });
      if(!error) modos[code] = data === true;
    } catch(e){}
  }
  // Para que otros archivos (el caddie Curro y Lola) sepan si esta partida es de la liga con marcadores
  window.acgolfModoMarcador = { cargar: cargarModo, con: conMarcadorEn };

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
  const nHoyos = () => typeof hoyosPartida === 'function' ? hoyosPartida() : 18;
  // ¿En este hoyo, lo que apunto yo (o lo que apunto de quien marco) NO coincide con lo del otro?
  function malEn(g, h){
    return [miIdx()].concat(marcados(g)).some(i => { const a = propio(i, h), b = marca(g, i, h); return a != null && b != null && a !== b; });
  }
  function primerMal(g){ for(let h = 1; h <= nHoyos(); h++) if(malEn(g, h)) return h; return null; }
  const soyJugador = g => !!g && miIdx() >= 0 && g.jugadores.some(j => +j.idx === miIdx() && j.marcador_idx != null);
  // Mis hoyos y los de quien marco, todos apuntados por mí
  function todoApuntado(g){
    const ids = [miIdx()].concat(marcados(g));
    for(let h = 1; h <= nHoyos(); h++) if(propio(miIdx(), h) == null || marcados(g).some(i => marca(g, i, h) == null)) return false;
    return ids.length > 0;
  }

  async function cargar(forzar){
    if(!currentRoundCode || cargando) return;
    cargando = true;
    try {
      // Partida normal recién creada con el interruptor «Partida con marcador» encendido
      const pend = window.acgolfMarcadorPendiente;
      if(pend && currentRoundCode !== pend.antes){
        window.acgolfMarcadorPendiente = null;
        try { const r = await initSupabase().rpc('poner_marcador', { p_code: currentRoundCode }); if(!r.error && r.data === true) modos[currentRoundCode] = true; } catch(e){}
      }
      await cargarModo(currentRoundCode);
      if(!conMarcadorEn(currentRoundCode)){ est = []; estCode = currentRoundCode; estJson = '[]'; cargando = false; if(forzar){ repintarHoyo(); pintarEntrega(); } return; }
      const { data, error } = await initSupabase().rpc('estado_marcas', { p_code: currentRoundCode });
      if(error) throw error;
      const json = JSON.stringify(data || []);
      const cambio = json !== estJson || estCode !== currentRoundCode;
      est = data || []; estCode = currentRoundCode; estJson = json;
      if(cambio || forzar){ repintarHoyo(); pintarEntrega(); pintarFirma(); }
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
      + '<div class="mk-tit">Confirma los marcadores antes de empezar</div>'
      + '<p class="mk-p">Esta partida es de liga: no se puede apuntar ningún golpe hasta que confirméis quién marca a quién. Cada uno apunta en su móvil sus golpes y los del jugador al que marca. Toca para cambiarlo.</p>'
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
    const tuPar = i => par != null ? par + Math.max(0, si != null ? strokesForHole(hcpJuego(i), si) : 0) : '—';
    return '<div class="mk-cols" style="--n:' + cols.length + '">' + cols.map((i, k) => {
      const esYo = k === 0;
      const val = esYo ? propio(i, h) : marca(g, i, h);
      const otro = esYo ? marca(g, i, h) : propio(i, h);
      const st = estadoTxt(val, otro, esYo ? 'tu marcador' : corto(players[i]));
      const marcadorDe = g.jugadores.find(x => +x.idx === i);
      const sub = esYo ? 'Te marca ' + esc(corto(players[(marcadorDe || {}).marcador_idx])) : 'Recibe ' + Math.max(0, si != null ? strokesForHole(hcpJuego(i), si) : 0) + ' golpe(s)';
      return '<div class="mk-col ' + st.cls + '">'
        + '<span class="mk-rol' + (esYo ? ' yo' : '') + '">' + (esYo ? 'YO' : 'LO MARCAS TÚ') + '</span>'
        + '<div class="mk-n">' + esc(corto(players[i])) + '</div>'
        + '<div class="mk-sub">' + sub + '</div>'
        + '<div class="mk-tp">' + (esYo ? 'Tu par' : 'Su par') + ' <b>' + tuPar(i) + '</b></div>'
        + '<button type="button" class="mk-box' + (val != null ? ' filled' : '') + '" data-i="' + i + '" data-yo="' + (esYo ? 1 : 0) + '">' + (val != null ? val : '+') + '</button>'
        + '<div class="mk-st">' + st.txt + '</div></div>';
    }).join('') + '</div>';
  }
  function enlazarColumnas(wrap, g, h, par, si){
    wrap.querySelectorAll('.mk-box').forEach(b => b.onclick = () => {
      const i = +b.dataset.i, esYo = b.dataset.yo === '1';
      const rec = si != null ? strokesForHole(hcpJuego(i), si) : 0;
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
    if(!g || llegada.completo || h >= nHoyos() || !hoyoMioCompleto(g, h) || malEn(g, h)) return;
    avanceTimer = setTimeout(() => {
      if(currentHole !== h || !hoyoMioCompleto(grupoEst(), h) || malEn(grupoEst(), h)) return;
      currentHole = h + 1; window.renderHoleView();
    }, 1500);
  }
  function marcarFichasHoyos(g){
    const me = miIdx();
    document.querySelectorAll('#holeStrip .hole-chip').forEach(c => {
      const h = +c.dataset.hole;
      const mal = [me].concat(marcados(g)).some(i => { const a = propio(i, h), b = marca(g, i, h); return a != null && b != null && a !== b; });
      c.classList.toggle('mk-mal', mal);
      const pm = primerMal(g);
      c.classList.toggle('mk-bloq', pm != null && h > pm);
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
    if(!(currentRoundCode in modos)){ cargar(true); return; }
    if(!conMarcadorEn(currentRoundCode)){
      return; // sin marcador: se apunta como siempre
    }
    const n = players.filter(Boolean).length;
    if(n < 2){
      return; // juega solo: se apunta como siempre
    }
    if(estCode !== currentRoundCode){ cargar(true); scores.outerHTML = '<div class="mk-p">Cargando marcadores…</div>'; return; }
    const g = grupoEst();
    if(!g) return;
    const conMarcadores = g.jugadores.every(j => j.marcador_idx != null);
    if(!conMarcadores){
      // Mientras no se confirmen los marcadores, no se puede apuntar ningún golpe (mire quien mire, apunte quien apunte)
      const div = document.createElement('div');
      div.innerHTML = htmlElegir(n);
      scores.replaceWith(div.firstElementChild);
      enlazarElegir(wrap);
      return;
    }
    const me = miIdx();
    if(me < 0) return; // marcadores ya confirmados, pero este usuario no juega en este grupo: se ve como siempre
    // BLOQUEO: no se puede pasar del primer hoyo que no coincide hasta arreglarlo
    const pm = primerMal(g);
    if(pm != null && currentHole > pm){ currentHole = pm; window.renderHoleView(); return; }
    const h = currentHole;
    const input0 = document.querySelector('.golpes-input[data-hole="' + h + '"]');
    const par = input0 ? parseInt(input0.dataset.par, 10) : null;
    const si = input0 ? parseInt(input0.dataset.strokeIndex, 10) : null;
    if(llegada.hoyo !== h){ llegada = { hoyo: h, completo: hoyoMioCompleto(g, h) }; clearTimeout(avanceTimer); }
    const div = document.createElement('div');
    div.innerHTML = htmlColumnas(g, h, par, isNaN(si) ? null : si);
    scores.replaceWith(div.firstElementChild);
    enlazarColumnas(wrap, g, h, par, isNaN(si) ? null : si); marcarFichasHoyos(g);
    const cols = wrap.querySelector('.mk-cols');
    if(cols && malEn(g, h)){
      const b = document.createElement('div'); b.className = 'tf-mal';
      b.innerHTML = '<b>⚠️ NO COINCIDE</b><span>El hoyo ' + (h + 1 <= nHoyos() ? (h + 1) : 'siguiente') + ' queda BLOQUEADO hasta que lo arregléis. Cada uno corrige solo su número.</span>'
        + '<button type="button" id="tfArreglar">ARREGLAR EL HOYO ' + h + '</button>';
      cols.parentNode.insertBefore(b, cols);
      b.querySelector('#tfArreglar').onclick = () => { const bx = wrap.querySelector('.mk-col.mal .mk-box'); if(bx) bx.click(); };
    }
    ponerFlechas(g, h); try{ cartelGrupo(); }catch(e){}
    pintarFirma();
  }
  // ---- Reforma: flechas grandes, cartel de grupo y cambio de hoyo solo si todo coincide ----
  function ponerFlechas(g, h){
    const ok = hoyoMioCompleto(g, h) && !malEn(g, h);
    const nx = document.getElementById('holeNextBtn'), pv = document.getElementById('holePrevBtn');
    const sig = typeof hoyoSiguiente === 'function' ? hoyoSiguiente(h) : h + 1, ant = typeof hoyoAnterior === 'function' ? hoyoAnterior(h) : h - 1;
    const ultimo = h >= nHoyos();
    if(nx){ nx.classList.toggle('mk-off', !ok && !ultimo); nx.classList.toggle('mk-go', ok && !ultimo); nx.innerHTML = '›<small>' + (ultimo ? 'FIN' : 'HOYO ' + sig) + '</small>'; }
    if(pv){ pv.innerHTML = '‹<small>HOYO ' + ant + '</small>'; }
    const w = document.getElementById('hvPlayers'); if(!w) return;
    let a = document.getElementById('mkAvisoHoyo'); if(a) a.remove();
    a = document.createElement('div'); a.id = 'mkAvisoHoyo';
    if(ok && !ultimo){
      a.className = 'mk-aviso ok';
      a.innerHTML = '✅ Todo correcto. Pasando al hoyo ' + sig + '…<div class="mk-barra"><i></i></div><button type="button" id="mkQuedar">Quedarme en el hoyo ' + h + '</button>';
      w.appendChild(a);
      a.querySelector('#mkQuedar').onclick = () => { clearTimeout(avanceTimer); llegada.completo = true; a.remove(); };
    } else if(!ok){
      const f = [];
      if(propio(miIdx(), h) == null) f.push('tú');
      marcados(g).forEach(i => { if(marca(g, i, h) == null) f.push(corto(players[i])); });
      const sinMarcador = g.jugadores.filter(j => propio(+j.idx, h) == null || marca(g, +j.idx, h) == null);
      if(malEn(g, h)) return;
      a.className = 'mk-aviso espera';
      a.innerHTML = '⏳ No puedes pasar todavía: faltan marcas en este hoyo.';
      w.appendChild(a);
    }
  }
  function cartelGrupo(){
    const sec = document.getElementById('marcadorSection'); if(!sec) return;
    let c = document.getElementById('mkCartelGrupo');
    const g = est && typeof grupoEst === 'function' ? grupoEst() : null;
    const multi = est && est.length > 1;
    if(!g || !multi || typeof miIdx !== 'function' || miIdx() < 0){ if(c) c.remove(); return; }
    if(!c){ c = document.createElement('div'); c.id = 'mkCartelGrupo'; c.className = 'mk-cartel'; sec.parentNode.insertBefore(c, sec); }
    const mg = (typeof matchGroups !== 'undefined' && matchGroups[activeGroup]) || {};
    const sal = mg.hora ? ' · sales a las ' + mg.hora.padStart(5, '0') : (Number(mg.hoyoSalida) > 1 ? ' · sales por el hoyo ' + mg.hoyoSalida : '');
    c.textContent = 'Estás en el Grupo ' + (+activeGroup + 1) + sal;
  }

  // ---------- FIRMAR LA TARJETA: pantalla grande al terminar (estilo GolfDirecto) ----------
  let firmaOculta = '', mostrarEntregada = false, firmando = false;
  const pantallaActiva = n => document.querySelector('.screen.active[data-screen="' + n + '"]');
  const entregadaYa = g => { const mia = g && g.jugadores.find(j => +j.idx === miIdx()); return !!mia && mia.entregada && marcados(g).every(i => (g.jugadores.find(j => +j.idx === i) || {}).confirmada); };
  const tarjetaCuadra = g => { const mia = g && g.jugadores.find(j => +j.idx === miIdx()); return !!mia && mia.ok && marcados(g).every(i => (g.jugadores.find(j => +j.idx === i) || {}).ok); };
  function sumaPropia(a, b){ let t = 0; for(let h = a; h <= b; h++) t += propio(miIdx(), h) || 0; return t; }
  function faltanTodos(){ const l = []; (est || []).forEach(gr => gr.jugadores.forEach(j => { if(!j.validada) l.push(corto(j.nombre)); })); return l; }
  function cerrarFirma(){ const e = document.getElementById('tfFirma'); if(e) e.remove(); }
  function pintarFirma(){
    try {
      const g = grupoEst();
      const enHoyo = pantallaActiva(3), enResumen = pantallaActiva(4);
      if(!currentRoundCode || !conMarcadorEn(currentRoundCode) || !g || !soyJugador(g) || (!enHoyo && !enResumen)){ cerrarFirma(); return; }
      let estado = null;
      if(mostrarEntregada && entregadaYa(g)) estado = 'entregada';
      else if(!entregadaYa(g) && todoApuntado(g)){
        if(tarjetaCuadra(g)) estado = enHoyo && firmaOculta === currentRoundCode ? null : 'firmar';
        else if(enResumen) estado = 'bloqueo';
      }
      if(!estado){ cerrarFirma(); return; }
      let f = document.getElementById('tfFirma');
      const clave = estado + ':' + (est ? estJson.length : 0) + ':' + (aviso || '') + ':' + firmando;
      if(f && f.dataset.clave === clave) return;
      if(!f){ f = document.createElement('div'); f.id = 'tfFirma'; f.className = 'tf-fondo'; document.body.appendChild(f); }
      f.dataset.clave = clave;
      const n = nHoyos();
      let h = '';
      if(estado === 'firmar'){
        h = '<div class="tf-caja"><div class="tf-ic ok">✓</div><div class="tf-t">REVISA TU TARJETA</div>'
          + (n > 9 ? '<div class="tf-fila"><span>Ida (9 hoyos)</span><b>' + sumaPropia(1, 9) + '</b></div><div class="tf-fila"><span>Vuelta (9 hoyos)</span><b>' + sumaPropia(10, n) + '</b></div>' : '')
          + '<div class="tf-fila tot"><span>TOTAL' + (n <= 9 ? ' (' + n + ' hoyos)' : '') + '</span><b>' + sumaPropia(1, n) + '</b></div>'
          + '<div class="tf-bien">Todo coincide con tu marcador.</div>'
          + '<button type="button" class="tf-btn" id="tfFirmar"' + (firmando ? ' disabled' : '') + '>' + (firmando ? 'FIRMANDO…' : 'FIRMAR MI TARJETA') + '</button>'
          + '<p class="tf-p">Una vez firmada, nadie la puede cambiar. Es la entrega oficial. Sin firmarla no cuenta para la liga ni para el hándicap.</p>'
          + (aviso ? '<p class="tf-aviso">' + esc(aviso) + '</p>' : '')
          + '<button type="button" class="tf-link" id="tfMirar">Volver a mirar mis hoyos</button></div>';
      } else if(estado === 'bloqueo'){
        h = '<div class="tf-caja"><div class="tf-ic mal">!</div><div class="tf-t">PRIMERO ENTREGA TU TARJETA</div>'
          + '<p class="tf-p">' + (primerMal(g) ? 'El hoyo ' + primerMal(g) + ' no coincide con tu marcador. Arréglalo y después firma.' : 'Tu marcador todavía no ha apuntado todos los hoyos. Cuando coincidan, podrás firmar.') + '</p>'
          + '<button type="button" class="tf-btn naranja" id="tfVolver">VOLVER A LA PARTIDA</button></div>';
      } else {
        const faltan = faltanTodos();
        const txt = 'Faltan por firmar la tarjeta de la liga: ' + faltan.join(', ') + '. Abrid acgolf y pulsad FIRMAR MI TARJETA.';
        h = '<div class="tf-caja"><div class="tf-ic ok">✓</div><div class="tf-t">TARJETA ENTREGADA</div><div class="tf-sub">Firmada por ti y por tu marcador</div>'
          + (faltan.length ? '<div class="tf-lista"><div class="tf-sub">Falta que entreguen:</div>' + faltan.map(x => '<div class="tf-fila"><span>' + esc(x) + '</span><b class="mal">falta</b></div>').join('') + '</div>'
              + '<a class="tf-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(txt) + '">AVISAR A LOS QUE FALTAN</a>'
            : '<div class="tf-bien">¡Todas las tarjetas entregadas!</div>')
          + '<button type="button" class="tf-btn gris" id="tfResumen">VER EL RESUMEN</button></div>';
      }
      f.innerHTML = h;
      const q = id => f.querySelector('#' + id);
      if(q('tfMirar')) q('tfMirar').onclick = () => { firmaOculta = currentRoundCode; cerrarFirma(); };
      if(q('tfVolver')) q('tfVolver').onclick = () => { cerrarFirma(); const b = document.getElementById('s4Back'); if(b) b.click(); };
      if(q('tfResumen')) q('tfResumen').onclick = () => { mostrarEntregada = false; cerrarFirma(); };
      if(q('tfFirmar')) q('tfFirmar').onclick = async () => {
        if(firmando) return;
        firmando = true; aviso = ''; pintarFirma();
        const { data, error } = await initSupabase().rpc('entregar_tarjeta', { p_code: currentRoundCode, p_grupo: +activeGroup });
        firmando = false;
        if(error) aviso = String(error.message || 'No se pudo firmar. Revisa la cobertura y vuelve a pulsar.');
        else { est = data || []; estJson = JSON.stringify(est); estCode = currentRoundCode; mostrarEntregada = true; }
        pintarFirma(); pintarEntrega();
      };
    } catch(e){ console.error(e); }
  }
  setInterval(() => { if(document.visibilityState === 'visible') pintarFirma(); }, 2000);
  // el Hoyo 19 y el resumen no se abren con una tarjeta sin firmar
  window.acgolfTarjetaPendiente = () => pendientesInicio.find(p => p.mia_pendiente) || null;

  // ---------- Cartel rojo en el Inicio ----------
  let pendientesInicio = [];
  async function cargarPendientes(){
    try {
      if(!window.miPerfilId || !pantallaActiva(0)) return;
      const { data, error } = await initSupabase().rpc('mis_tarjetas_pendientes');
      if(error) return;
      pendientesInicio = Array.isArray(data) ? data : [];
      pintarInicio();
    } catch(e){}
  }
  function pintarInicio(){
    const home = pantallaActiva(0);
    let c = document.getElementById('tfInicio');
    if(!home || !pendientesInicio.length){ if(c) c.remove(); return; }
    if(!c){ c = document.createElement('div'); c.id = 'tfInicio'; home.insertBefore(c, home.firstChild); }
    c.innerHTML = pendientesInicio.map(p => '<div class="tf-banda' + (p.mia_pendiente ? '' : ' suave') + '">'
      + '<b>' + (p.mia_pendiente ? '✍️ FALTA ENTREGAR TU TARJETA' : '⏳ FALTAN TARJETAS POR ENTREGAR') + '</b>'
      + '<span>' + esc(p.nombre || 'Liga') + ' · faltan: ' + esc((p.faltan || []).map(corto).join(', ')) + '</span>'
      + (p.mia_pendiente ? '<button type="button" class="tf-btn" data-code="' + esc(p.code) + '">ENTREGAR AHORA</button>' : '') + '</div>').join('');
    c.querySelectorAll('button[data-code]').forEach(b => b.onclick = () => { location.href = location.pathname + '?partida=' + encodeURIComponent(b.dataset.code); });
  }
  // ---------- Lista del administrador: tarjetas sin cerrar (solo la ve el administrador) ----------
  let adminLista = [];
  const MOTIVO = { faltan_hoyos: 'Le faltan hoyos por apuntar', no_coincide: 'No coincide algún hoyo con su marcador', sin_marcador: 'Jugó sin marcador', sin_firmar: 'Coincide, pero no ha firmado (se cerrará sola a las 3 horas)' };
  async function cargarAdmin(){
    try {
      if(!window.miPerfilId || !pantallaActiva(0)) return;
      const { data, error } = await initSupabase().rpc('tarjetas_sin_cerrar_admin');
      if(error) return;
      adminLista = Array.isArray(data) ? data : [];
      pintarAdmin();
    } catch(e){}
  }
  function pintarAdmin(){
    const home = pantallaActiva(0);
    let c = document.getElementById('tfAdmin');
    if(!home || !adminLista.length){ if(c) c.remove(); return; }
    if(!c){ c = document.createElement('div'); c.id = 'tfAdmin'; const ref = document.getElementById('tfInicio'); home.insertBefore(c, ref ? ref.nextSibling : home.firstChild); }
    c.innerHTML = '<div class="tf-banda"><b>TARJETAS SIN CERRAR · ' + adminLista.length + '</b><span>Solo la ves tú, el administrador.</span></div>'
      + adminLista.map((p, i) => '<div class="tf-item"><b>' + esc(p.jugador) + '</b><small>' + esc(p.nombre || 'Liga') + '</small>'
        + '<span class="tf-motivo">' + esc(MOTIVO[p.motivo] || 'Sin cerrar') + '</span>'
        + '<div class="tf-dos"><a class="tf-btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(corto(p.jugador) + ', te falta cerrar la tarjeta de la liga en acgolf. ' + (MOTIVO[p.motivo] || '') + '.') + '">AVISAR</a>'
        + '<button type="button" class="tf-btn" data-i="' + i + '">CERRAR YO</button></div></div>').join('');
    c.querySelectorAll('button[data-i]').forEach(b => b.onclick = async () => {
      const p = adminLista[+b.dataset.i]; if(!p) return;
      if(!confirm('¿Cerrar la tarjeta de ' + p.jugador + '?\n\nQueda dada por válida y anotado que la cerraste tú. Ya no se podrá cambiar.')) return;
      b.disabled = true; b.textContent = 'CERRANDO…';
      const { error } = await initSupabase().rpc('cerrar_tarjeta_admin', { p_code: p.code, p_grupo: p.grupo, p_idx: p.idx });
      if(error) alert(String(error.message || 'No se pudo cerrar. Revisa la cobertura.'));
      cargarAdmin();
    });
  }
  setInterval(() => { if(document.visibilityState === 'visible') cargarAdmin(); }, 30000);
  setTimeout(cargarAdmin, 3500);
  setInterval(() => { if(document.visibilityState === 'visible') cargarPendientes(); }, 20000);
  setTimeout(cargarPendientes, 3000);
  setTimeout(cargarPendientes, 8000);

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
    if(!(currentRoundCode in modos)){ sec.style.display = 'none'; cargar(true); return; }
    if(!conMarcadorEn(currentRoundCode)){ sec.style.display = 'none'; return; } // partida normal: no hay que entregar nada

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
    else if(!mia || mia.marcador_idx == null){ h += '<p class="fm-p">Has jugado sin marcador: en las partidas de una liga creada, la tarjeta solo cuenta con marcador.</p>'; }
    else if(yaHecho){ h += '<div class="fm-ok">✅ Has entregado tu tarjeta' + (misMarcados.length ? ' y confirmado la de ' + misMarcados.map(j => esc(corto(j.nombre))).join(' y ') : '') + '.<br><small>Cuenta para la liga cuando también la confirme tu marcador.</small></div>'; }
    else if(!mia.ok || misMarcados.some(j => !j.ok)){ h += '<p class="fm-p">Para entregar, tus ' + (typeof hoyosPartida === 'function' ? hoyosPartida() : 18) + ' hoyos y los del jugador que marcas tienen que coincidir con lo que apuntó el otro. Revisa los hoyos en naranja.</p>'; }
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
