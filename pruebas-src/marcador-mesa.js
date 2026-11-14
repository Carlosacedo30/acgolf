/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Mesa para elegir marcador, sin administrador (dibujo aprobado por Carlos, 13-nov-2026) ---
// Cada jugador toca en su móvil al jugador que tiene a su derecha: ese es el que va a marcar.
// Quien ya tiene marcador sale apagado y no se puede tocar. El círculo no se cierra hasta que están todos
// (así nadie se queda sin marcador). Antes del primer golpe se puede cambiar. Se apoya en marcador.js.
(function(){
  if(typeof window.renderHoleView !== 'function') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nombre = n => String(n || '').trim().replace(/\s+/g, ' ');           // nombre completo (norma de Carlos)
  const iniciales = n => nombre(n).split(' ').filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
  let datos = null, datosKey = '', cargando = false, aviso = '', guardando = false, timer = null;

  const yo = () => window.miPerfil && window.miPerfil.player_name;
  const miIdx = () => players.findIndex(n => n === yo());
  const key = () => currentRoundCode + ':' + activeGroup;

  // --- lógica pura (se prueba aparte) ---
  // jug: [{idx, marcador_idx}], n jugadores, me = mi índice. Devuelve para cada jugador su estado.
  function estados(jug, n, me){
    const marcaA = {};                       // quién marca a quién (marcador → jugador)
    jug.forEach(j => { if(j.marcador_idx != null) marcaA[+j.marcador_idx] = +j.idx; });
    const res = {};
    for(let i = 0; i < n; i++){
      if(i === me){ res[i] = 'yo'; continue; }
      const j = jug.find(x => +x.idx === i);
      const mk = j ? j.marcador_idx : null;
      if(mk != null && +mk === me){ res[i] = 'mio'; continue; }
      if(mk != null){ res[i] = 'ocupado'; continue; }
      // ¿cerraría el círculo antes de tiempo?
      let cur = i, pasos = 1, cierra = false;
      for(let g = 0; g <= n; g++){
        const sig = marcaA[cur];
        if(sig == null) break;
        if(sig === me){ cierra = true; break; }
        cur = sig; pasos++;
      }
      res[i] = cierra && pasos + 1 < n ? 'cierra' : 'libre';
    }
    return { estado: res, marcaA };
  }
  window.acgolfMesaLogica = { estados };

  async function cargar(){
    if(cargando || !currentRoundCode) return;
    cargando = true;
    try {
      const { data, error } = await initSupabase().rpc('estado_marcas', { p_code: currentRoundCode });
      if(error) throw error;
      const g = (data || []).find(x => +x.grupo === +activeGroup);
      const nuevo = JSON.stringify(g || null);
      if(nuevo !== datosKey || key() !== (datos && datos.k)){ datos = { k: key(), g }; datosKey = nuevo; repintar(); }
    } catch(e){}
    cargando = false;
  }
  function repintar(){ const w = document.getElementById('hvPlayers'); if(w && w.querySelector('.mk-mesa')) pintar(w); }
  function parar(){ clearInterval(timer); timer = null; }
  function arrancar(){ if(!timer) timer = setInterval(() => { if(document.visibilityState === 'visible') cargar(); }, 3000); }

  async function elegir(i){
    if(guardando) return;
    guardando = true; aviso = '';
    repintar();
    try {
      const { error } = await initSupabase().rpc('elegir_a_quien_marco', { p_code: currentRoundCode, p_grupo: +activeGroup, p_jugador: i });
      if(error) aviso = String(error.message || 'No se pudo guardar. Revisa la cobertura.');
    } catch(e){ aviso = 'No se pudo guardar. Revisa la cobertura.'; }
    guardando = false;
    datosKey = ''; await cargar(); repintar();
  }

  const arco = (cx, cy, R, a0, a1) => {
    const P = a => (cx + R * Math.sin(a * Math.PI / 180)).toFixed(1) + ' ' + (cy + R * Math.cos(a * Math.PI / 180)).toFixed(1);
    return 'M' + P(a0) + ' A' + R + ' ' + R + ' 0 0 0 ' + P(a1);
  };

  function pintar(wrap){
    const n = players.filter(Boolean).length, me = miIdx();
    const g = datos && datos.g;
    const jug = g ? g.jugadores : [];
    const { estado, marcaA } = estados(jug, n, me);
    const eligio = jug.some(j => j.marcador_idx != null && +j.marcador_idx === me);
    const faltan = []; for(let i = 0; i < n; i++) if(!jug.find(x => +x.idx === i && x.marcador_idx != null)) faltan.push(i);
    const libres = []; for(let i = 0; i < n; i++) if(estado[i] === 'libre') libres.push(i);
    const miElegido = jug.find(j => j.marcador_idx != null && +j.marcador_idx === me);
    const todos = faltan.length === 0;
    const pitch = 360 / n, medio = pitch * 0.42;
    // asientos: yo abajo; los demás en el sentido contrario a las agujas, empezando por mi derecha
    const asientos = []; for(let k = 0; k < n; k++){ const i = (me + k) % n, fi = k * pitch; asientos.push({ i, fi }); }
    const seats = asientos.map(({ i, fi }) => {
      const x = 50 + 34 * Math.sin(fi * Math.PI / 180), y = 50 + 40 * Math.cos(fi * Math.PI / 180), e = estado[i];
      const cls = e === 'yo' ? 'me' : e === 'mio' ? 'dark' : e === 'ocupado' ? 'off' : e === 'cierra' ? 'off' : 'pulsa';
      const rot = e === 'yo' ? 'TÚ' : e === 'mio' ? 'LO MARCAS TÚ' : e === 'ocupado' ? 'YA TIENE MARCADOR' : e === 'cierra' ? 'CERRARÍA EL CÍRCULO' : (libres.length === 1 && !eligio ? 'ES EL ÚNICO QUE QUEDA' : 'TOCA SI ES EL TUYO');
      const tap = (e === 'libre' || e === 'mio') && me >= 0 && !guardando;
      return '<' + (tap ? 'button type="button" data-i="' + i + '"' : 'div') + ' class="mm-j ' + cls + '" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%">'
        + '<span class="mm-av">' + esc(iniciales(players[i])) + '</span><b>' + esc(nombre(players[i])) + '</b><i>' + rot + '</i></' + (tap ? 'button' : 'div') + '>';
    }).join('');
    const arcos = asientos.map(({ i, fi }) => '<path d="' + arco(164, 172, 54, fi - medio, fi + medio) + '" fill="none" stroke="' + (marcaA[i] != null ? (i === me ? '#111316' : '#2E7D32') : '#B8C0C7') + '" stroke-width="5" stroke-linecap="round" marker-end="url(#mm-f' + (marcaA[i] != null ? (i === me ? 'n' : 'v') : 'g') + ')"/>').join('');
    const defs = [['n', '#111316'], ['v', '#2E7D32'], ['g', '#B8C0C7']].map(([k, c]) => '<marker id="mm-f' + k + '" markerWidth="4" markerHeight="4" refX="2.4" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4 z" fill="' + c + '"/></marker>').join('');
    const titulo = eligio ? '<div class="mm-gran ok"><b>Marcas a ' + esc(nombre(players[miElegido ? +miElegido.idx : 0])) + '</b><span>Si te has equivocado, toca a otro.</span></div>'
      : '<div class="mm-gran"><b>Toca con el dedo al jugador de tu derecha</b><span>Es el que vas a marcar tú.</span></div>';
    const faltaTxt = faltan.length ? 'Esperando a: ' + faltan.filter(i => i !== me).map(i => nombre(players[i])).join(', ') : '';
    const boton = !eligio ? '<div class="mm-btn gris">Toca a un jugador para seguir</div>'
      : todos ? '<button type="button" class="mm-btn lima" id="mmGo">LISTO · EMPEZAR A MARCAR</button>'
      : '<div class="mm-btn gris">' + esc(faltaTxt || 'Esperando a los demás') + '</div>';
    wrap.innerHTML = '<div class="mk-mesa mm">' + titulo
      + '<div class="mm-mesa"><div class="mm-tab"><span><b>acgolf</b><br><em>Grupo ' + (+activeGroup + 1) + '</em></span></div>' + seats
      + '<svg viewBox="0 0 328 345" width="100%" height="100%" aria-hidden="true"><defs>' + defs + '</defs>' + arcos + '</svg></div>'
      + (aviso ? '<p class="mm-aviso">' + esc(aviso) + '</p>' : '') + boton + '</div>';
    wrap.querySelectorAll('.mm-j[data-i]').forEach(b => b.onclick = () => elegir(+b.dataset.i));
    const go = wrap.querySelector('#mmGo');
    if(go) go.onclick = async () => { go.disabled = true; go.textContent = 'Entrando…'; if(window.acgolfMarcadorRecargar) await window.acgolfMarcadorRecargar(); window.renderHoleView(); };
    // si solo queda una opción, la app la pone sola (una vez)
    if(!eligio && libres.length === 1 && me >= 0 && !guardando && !aviso){ elegir(libres[0]); }
  }

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try {
      const wrap = document.getElementById('hvPlayers');
      const viejo = wrap && wrap.querySelector('.mk-elegir');
      if(viejo && miIdx() >= 0){
        const cont = document.createElement('div'); viejo.replaceWith(cont);
        arrancar();
        if(!datos || datos.k !== key()){ datos = { k: key(), g: null }; cargar(); }
        pintar(cont);
      } else if(!viejo) parar();
    } catch(e){ console.error(e); }
    return r;
  };
})();
