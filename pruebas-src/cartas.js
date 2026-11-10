/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Cartas: partida de cartas para reírse (aparte de las partidas serias) ---
// NO cuenta para el hándicap, la liga ni ninguna clasificación. Cada jugador anota en su móvil y solo ve sus cartas.
// Se guarda como una fila de "rounds" sin campo (course_id vacío), igual que la Ryder Cup y las convocatorias:
// no sale en «Últimas partidas» ni cuenta para la liga. Las cuentas están en cartas-motor.js.
(function(){
  const M = window.CartasMotor;
  if(!M) return;
  const TAG = 'Cartas';
  const BARRA = 'amarillas';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $ = id => document.getElementById(id);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const admin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || '';
  const soyYo = n => !!yo() && norm(n) === norm(yo());
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };

  // ---------- Dibujos de las cartas (línea fina, como el resto de iconos de la app) ----------
  const ICO = {
    escudo:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    salvavidas:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.9 4.9 4.3 4.3M14.8 9.2l4.3-4.3M14.8 14.8l4.3 4.3M9.2 14.8l-4.3 4.3"/>',
    sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    rayo:'<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    ojo:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    llama:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    muro:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v6M7 9v6M17 9v6M12 15v6"/>',
    repetir:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    prohibido:'<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    regalo:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    cambiar:'<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>',
    mascara:'<path d="M3 8c0-2 2-3 5-3h8c3 0 5 1 5 3v3c0 4-3 7-9 7s-9-3-9-7z"/><circle cx="8.5" cy="11" r="1.5"/><circle cx="15.5" cy="11" r="1.5"/>',
    moneda:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h4"/>',
    copo:'<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    candado:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    palo:'<path d="M15 2.5 7.5 18.5"/><path d="M7.5 18.5c-.6 1.4-.1 2.6 1.3 2.9l3.2.6c.9.2 1.5-.7 1-1.4l-.8-1.2"/><circle cx="18" cy="19.5" r="1.6"/>',
    carta:'<rect x="6" y="3" width="13" height="18" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2"/>',
    dado:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r=".9"/><circle cx="15.5" cy="8.5" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="8.5" cy="15.5" r=".9"/><circle cx="15.5" cy="15.5" r=".9"/>',
    grupo:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5a5 5 0 0 1 4.5 5"/>',
    giro:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    estrella:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  };
  const ICO_DE = { escudo:'escudo', seguro:'salvavidas', buendia:'sol', doble:'rayo', adivino:'ojo', racha:'llama', muro:'muro', espejo:'repetir',
    zancadilla:'prohibido', regalo:'regalo', cambiazo:'cambiar', ladron:'mascara', impuesto:'moneda', congelador:'copo', robo:'candado', palo:'palo',
    ruletaLola:'carta', ruletaCurro:'dado', todos:'grupo', revolucion:'giro', oro:'estrella' };
  const ico = (nombre, tam) => '<svg class="ca-ico" viewBox="0 0 24 24" width="' + (tam || 28) + '" height="' + (tam || 28) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO[nombre] || '') + '</svg>';
  const FAM = { v: ['ca-v', 'Ventaja'], t: ['ca-t', 'Travesura'], c: ['ca-c', 'Comodín'] };
  const RAREZA = { c: 'Común', m: 'Menos común', r: 'Rara', l: 'Legendaria' };

  // ---------- Datos de apoyo ----------
  let jugadoresGrupo = null; // { nombre: hándicap }
  async function cargarJugadores(){
    try {
      const client = initSupabase(); if(!client) return;
      const { data, error } = await client.rpc('jugadores_ryder');
      if(error || !data) return;
      jugadoresGrupo = {}; data.forEach(p => { jugadoresGrupo[p.name] = p.hcp == null ? null : Number(p.hcp); });
      if(vista === 'crear') pintar();
    } catch(e){ console.error('No se pudieron cargar los jugadores para las cartas', e); }
  }
  const hcpDe = n => {
    if(jugadoresGrupo && Object.prototype.hasOwnProperty.call(jugadoresGrupo, n)) return jugadoresGrupo[n];
    const h = Number((typeof FAVORITE_HANDICAPS !== 'undefined' ? FAVORITE_HANDICAPS : {})[n]); return isNaN(h) ? null : h;
  };
  const nombresGrupo = () => (jugadoresGrupo ? Object.keys(jugadoresGrupo) : (typeof FAVORITE_PLAYERS !== 'undefined' ? FAVORITE_PLAYERS.slice() : [])).sort((a, b) => a.localeCompare(b, 'es'));
  const campoDe = id => { const l = typeof COURSES !== 'undefined' ? COURSES : []; return l.find(c => c.id === id) || l.find(c => c.id === 'hato-verde') || l[0]; };
  function hoyIso(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaLarga(iso){
    if(!iso) return '';
    const s = new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  let partida = null;   // la partida que se está viendo
  let lista = [];       // mis partidas de cartas recientes
  let canal = null;
  let vista = 'lista';  // 'lista' | 'crear' | 'partida' | 'hoyo' | 'info'
  let borrador = null;  // creando una partida
  let sel = { c: null, o: null };  // carta y jugador elegidos en el hoyo
  let robando = false, abriendo = false, editando = false, mensaje = '';
  let tecl = null, rev = { k: '', e: 0, n: 0 }, revTimer = null;

  // ---------- Base de datos ----------
  // Una fila de "rounds": primer grupo = datos de la partida; después, un grupo por jugador.
  function deFila(row){
    const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
    const meta = (mg.find(g => g && g.meta) || {}).meta || {};
    const jug = mg.filter(g => g && g.jug).map(g => ({ nombre: g.nombre, hcp: g.hcp == null ? null : Number(g.hcp), abierto: !!g.abierto, fuera: !!g.fuera,
      sorteo: (g.sorteo || []).slice(), golpes: Object.assign({}, g.golpes || {}), marca: Object.assign({}, g.marca || {}), elige: JSON.parse(JSON.stringify(g.elige || {})) }));
    return { id: row.id, code: row.code, updatedAt: row.updated_at, createdAt: row.created_at, meta, jug };
  }
  function aGrupos(r){
    const v = () => ({ scores: {}, handicaps: [] });
    return [Object.assign({ meta: r.meta, players: [] }, v())].concat(r.jug.map(j => Object.assign({ jug: true, nombre: j.nombre, players: [j.nombre], hcp: j.hcp,
      abierto: !!j.abierto, fuera: !!j.fuera, sorteo: j.sorteo || [], golpes: j.golpes || {}, marca: j.marca || {}, elige: j.elige || {} }, v())));
  }
  const COLS = 'id, code, match_groups, updated_at, created_at';
  async function traerMias(){
    const client = initSupabase(); if(!client) return [];
    const desde = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data, error } = await client.from('rounds').select(COLS).eq('round_name', TAG).gte('created_at', desde).order('created_at', { ascending: false }).limit(20);
    if(error || !data) return [];
    return data.map(deFila).filter(r => admin() || r.jug.some(j => soyYo(j.nombre)));
  }
  async function traer(code){
    const client = initSupabase(); if(!client) return null;
    const { data } = await client.from('rounds').select(COLS).eq('code', code).maybeSingle();
    return data ? deFila(data) : null;
  }
  // Cambia la partida sin pisar lo que haya guardado otro móvil a la vez
  async function cambiar(fn){
    const client = initSupabase(); if(!client || !partida) return false;
    for(let i = 0; i < 5; i++){
      const fresca = await traer(partida.code);
      if(!fresca) break;
      if(fn(fresca) === false) return false;
      const ahora = new Date().toISOString();
      const { data, error } = await client.from('rounds').update({ match_groups: aGrupos(fresca), updated_at: ahora })
        .eq('id', fresca.id).eq('updated_at', fresca.updatedAt).select('id');
      if(error){ console.error(error); break; }
      if(data && data.length){ fresca.updatedAt = ahora; partida = fresca; return true; }
    }
    mensaje = 'No se pudo guardar. Revisa la conexión y vuelve a probar.';
    return false;
  }
  function vigilar(){
    const client = initSupabase(); if(!client || !partida) return;
    if(canal){ try { client.removeChannel(canal); } catch(e){} }
    canal = client.channel('cartas-' + partida.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + partida.id }, p => {
        if(!p.new || !partida) return;
        partida = deFila(p.new);
        if(!ventana().hidden && (vista === 'partida' || vista === 'hoyo') && !editando) pintar();
      }).subscribe();
  }

  // ---------- Marcadores, como en la liga: cada uno apunta sus golpes y los del jugador al que marca ----------
  function marcadoresDe(r){
    const act = r.jug.filter(j => !j.fuera), cust = (r.meta && r.meta.marca) || {}, m = {};
    act.forEach((x, i) => { m[x.nombre] = act[(i + act.length - 1) % act.length].nombre; });
    const ok = act.length > 1 && act.every(x => cust[x.nombre] && cust[x.nombre] !== x.nombre && act.some(y => y.nombre === cust[x.nombre])) && new Set(act.map(x => cust[x.nombre])).size === act.length;
    return ok ? Object.fromEntries(act.map(x => [x.nombre, cust[x.nombre]])) : m;
  }
  const marcadorDe = (n, r) => marcadoresDe(r || partida)[n];
  const marcadoPor = (n, r) => { const m = marcadoresDe(r || partida); return Object.keys(m).find(k => m[k] === n); };
  // 'ok' coincide · 'no' no coincide · 'falta' solo ha apuntado uno · 'nada'
  function estadoMarca(r, x, pos){
    const k = r.jug.find(y => y.nombre === marcadorDe(x.nombre, r)), a = (x.golpes || {})[pos], b = k ? (k.marca || {})[pos] : undefined;
    if(a == null && b == null) return 'nada';
    if(a == null || b == null) return 'falta';
    return a === b ? 'ok' : 'no';
  }
  // Solo cuentan los golpes en los que coinciden el jugador y su marcador
  function golpesValidos(r, x){
    if(!r.meta.marcador) return x.golpes || {};
    const out = {}; Object.keys(x.golpes || {}).forEach(p => { if(estadoMarca(r, x, p) === 'ok') out[p] = x.golpes[p]; });
    return out;
  }

  // ---------- Paso de los datos de la partida a las cuentas ----------
  function aEstado(r){
    const campo = campoDe(r.meta.courseId), n = r.meta.n, desde = r.meta.desde || 1, total = campo.par.length;
    const reales = []; for(let p = 1; p <= n; p++) reales.push((desde - 1 + p - 1) % total);
    const par = reales.map(i => campo.par[i]);
    const si = reales.map(i => Number((campo.hcp || [])[i]) || 99);
    const orden = si.map((v, i) => i).sort((a, b) => si[a] - si[b] || a - b);
    const rango = []; orden.forEach((i, k) => { rango[i] = k + 1; });
    const hcpJuego = j => {
      const h = typeof hcpCampo === 'function' ? hcpCampo(j.hcp == null ? 0 : j.hcp, campo, BARRA) : Math.round(j.hcp || 0);
      return n === 9 ? Math.round(h / 2) : h;
    };
    return { code: r.code, n, par, rango, campo, reales, jug: r.jug.map(j => ({ nombre: j.nombre, hcp: hcpJuego(j), golpes: golpesValidos(r, j), elige: j.elige, sorteo: j.sorteo, fuera: j.fuera })) };
  }
  const calcular = () => { const est = aEstado(partida); return { est, sim: M.simular(est) }; };
  const activos = () => partida.jug.filter(j => !j.fuera);
  const todosAbiertos = () => activos().every(j => j.abierto);
  const mio = () => partida.jug.find(j => soyYo(j.nombre));
  const puedeGestionar = () => admin() || (partida && partida.meta.creador && norm(partida.meta.creador) === norm(yo()));
  const holeReal = (est, pos) => est.reales[pos - 1] + 1;

  // ---------- Reparto de cartas: lo hace cada móvil con las suyas ----------
  async function asegurarCartas(sim){
    if(!partida || robando) return;
    const j = mio(); if(!j || !j.abierto || j.fuera) return;
    const pos = sim ? sim.posActual : 1;
    const hechos = sim && sim.cerrados >= pos ? pos : pos; // hoyo que se va a jugar
    const necesarias = M.INICIALES + Math.min(Math.floor((hechos - 1) / 3), M.nuevasMax(partida.meta.n));
    if((j.sorteo || []).length >= necesarias) return;
    robando = true;
    const ok = await cambiar(r => {
      const yoJ = r.jug.find(x => soyYo(x.nombre)); if(!yoJ) return false;
      const oroSalio = r.jug.some(x => (x.sorteo || []).indexOf('oro') >= 0);
      let seguro = 0;
      while(yoJ.sorteo.length < necesarias && seguro++ < 10) yoJ.sorteo.push(M.sacarCarta(yoJ.sorteo, oroSalio));
    });
    robando = false;
    if(ok && !ventana().hidden) pintar();
  }
  // Al entrar en una partida a la que te han apuntado: abres la partida y recibes tus 3 cartas
  async function abrirMiParte(){
    const j = mio(); if(!j || j.abierto || j.fuera || abriendo) return;
    abriendo = true;
    await cambiar(r => {
      const yoJ = r.jug.find(x => soyYo(x.nombre)); if(!yoJ || yoJ.abierto) return false;
      yoJ.abierto = true;
      const oroSalio = r.jug.some(x => (x.sorteo || []).indexOf('oro') >= 0);
      while(yoJ.sorteo.length < M.INICIALES) yoJ.sorteo.push(M.sacarCarta(yoJ.sorteo, oroSalio));
    });
    abriendo = false;
    if(!ventana().hidden) pintar();
  }

  // ---------- Ventana ----------
  function ventana(){
    let ov = $('caOverlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'caOverlay'; ov.className = 'ca-ov'; ov.hidden = true;
      ov.innerHTML = '<button type="button" class="home-volver pantalla-volver" id="caCerrar">‹ Volver al inicio</button><div class="ca-caja"><div id="caBody"></div></div>';
      document.body.appendChild(ov);
      $('caCerrar').onclick = cerrar;
    }
    return ov;
  }
  async function abrir(){
    const ov = ventana(); ov.hidden = false; document.body.classList.add('ca-abierta');
    vista = 'lista'; partida = null; mensaje = '';
    if(!jugadoresGrupo) cargarJugadores();
    $('caBody').innerHTML = '<div class="ca-cargando">Cargando…</div>';
    try { lista = await traerMias(); } catch(e){ lista = []; }
    pintar();
  }
  function cerrar(){ ventana().hidden = true; document.body.classList.remove('ca-abierta'); ventana().classList.remove('ca-claro'); }
  function pintar(){
    const ov = ventana();
    ov.classList.toggle('ca-claro', vista === 'hoyo' && !!partida);
    if(vista === 'crear') return pintarCrear();
    if(vista === 'info') return pintarInfo();
    if(vista === 'hoyo' && partida) return pintarHoyo();
    if(vista === 'partida' && partida) return pintarPartida();
    vista = 'lista'; pintarLista();
  }
  const msg = t => { mensaje = t; const m = $('caMsg'); if(m) m.textContent = t; };
  const subir = () => { const ov = $('caOverlay'); if(ov) ov.scrollTop = 0; };
  const estadoTxt = r => { try { const s = M.simular(aEstado(r)); return s.terminada ? 'Terminada' : s.cerrados ? 'Va por el hoyo ' + s.posActual : 'Sin empezar'; } catch(e){ return ''; } };

  // ---------- Tarjeta de una carta ----------
  function tarjetaCarta(id, extra){
    const c = M.CARTAS[id]; if(!c) return '';
    const f = FAM[c.fam];
    const oro = c.r === 'l' ? ' ca-oro' : '';
    return '<div class="ca-carta ' + f[0] + oro + ' ca-r-' + c.r + (extra || '') + '"><div class="ca-carta-in">'
      + '<span class="ca-bri"></span><i class="ca-est e1"></i><i class="ca-est e2"></i>'
      + '<div class="ca-medalla">' + ico(ICO_DE[id], 44) + '</div>'
      + '<div class="ca-carta-tx"><div class="ca-carta-cab"><span>' + f[1] + '</span><em>' + RAREZA[c.r] + '</em></div>'
      + '<b>' + esc(c.n) + '</b><small>' + esc(c.t) + '</small></div></div></div>';
  }

  // ---------- Lista de mis partidas ----------
  function pintarLista(){
    const body = $('caBody');
    let h = '<div class="ca-tit">Cartas</div><p class="ca-p">Una partida de golf para reírse: cada jugador recibe cartas secretas que suben o bajan los puntos de los demás. <b>No cuenta para el hándicap ni para la liga.</b></p>';
    h += '<button type="button" class="ca-info-btn" id="caInfo"><span aria-hidden="true">i</span>Cómo se juega y cuáles son las cartas</button>';
    h += '<button type="button" class="ca-btn" id="caNueva">Crear partida de cartas</button>';
    if(lista.length){
      h += '<div class="ca-sub">Tus partidas de cartas</div><div class="ca-lista">' + lista.map((r, i) =>
        '<button type="button" class="ca-fila" data-i="' + i + '"><span><b>' + esc(r.meta.titulo || 'Partida de cartas') + '</b><small>' + esc(fechaLarga(r.meta.date)) + ' · ' + esc(campoDe(r.meta.courseId).name) + '</small></span><em>' + esc(estadoTxt(r)) + '</em></button>').join('') + '</div>';
    } else h += '<p class="ca-nota">Todavía no tienes ninguna partida de cartas. Crea una y avisa a tus amigos para que abran Cartas en su móvil.</p>';
    body.innerHTML = h;
    $('caNueva').onclick = empezarCrear;
    $('caInfo').onclick = () => { vista = 'info'; pintar(); subir(); };
    body.querySelectorAll('.ca-fila').forEach(b => b.onclick = () => entrar(lista[+b.dataset.i]));
  }
  function entrar(r){
    partida = r; vista = 'partida'; mensaje = ''; vigilar(); pintar(); subir();
    abrirMiParte();
  }

  // ---------- Crear ----------
  function empezarCrear(){
    if(!yo()){ alert('Para jugar con cartas tienes que entrar con tu cuenta.'); return; }
    const campos = (typeof COURSES !== 'undefined' ? COURSES : []);
    borrador = { titulo: '', courseId: (campos.find(c => c.id === 'hato-verde') || campos[0] || {}).id, n: 18, desde: 1, date: hoyIso(), jug: {} };
    borrador.jug[yo()] = true;
    vista = 'crear'; mensaje = ''; pintar(); subir();
  }
  function pintarCrear(){
    const b = borrador, body = $('caBody'), campos = (typeof COURSES !== 'undefined' ? COURSES : []);
    const campo = campoDe(b.courseId), nueve = campo.par.length === 9;
    if(nueve){ b.n = 9; b.desde = 1; }
    const nombres = nombresGrupo();
    let h = '<button type="button" class="ca-volver" id="caVolver">‹ Mis partidas</button><div class="ca-tit">Crear partida de cartas</div>'
      + '<div class="ca-aviso"><b>Cada jugador, con su móvil.</b> Las cartas son secretas: solo ves las tuyas. Como en la liga con marcador: cada uno apunta sus golpes y los del jugador al que marca, y la app dice si coinciden. Hace falta tener cuenta.</div>'
      + '<label class="ca-lbl">Nombre (como quieras)<input id="caTitulo" type="text" maxlength="40" placeholder="Los de siempre" value="' + esc(b.titulo) + '"></label>'
      + '<label class="ca-lbl">Campo<select id="caCampo">' + campos.map(c => '<option value="' + esc(c.id) + '"' + (c.id === b.courseId ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>';
    if(!nueve) h += '<div class="ca-lbl">Hoyos</div><div class="ca-opc">'
      + [['18', 'Los 18', 18, 1], ['ida', 'Ida (1–9)', 9, 1], ['vuelta', 'Vuelta (10–18)', 9, 10]].map(o => '<button type="button" class="ca-op' + (b.n === o[2] && b.desde === o[3] ? ' on' : '') + '" data-n="' + o[2] + '" data-d="' + o[3] + '">' + o[1] + '</button>').join('') + '</div>';
    h += '<label class="ca-lbl">Día<input id="caFecha" type="date" value="' + esc(b.date) + '"></label>'
      + '<div class="ca-lbl">Jugadores (mínimo 2)</div><div class="ca-jugs">' + nombres.map(n => '<label class="ca-jug"><input type="checkbox" data-n="' + esc(n) + '"' + (b.jug[n] ? ' checked' : '') + (soyYo(n) ? ' disabled' : '') + '><span>' + esc(n) + '</span></label>').join('') + '</div>'
      + '<div class="ca-msg" id="caMsg">' + esc(mensaje) + '</div><button type="button" class="ca-btn" id="caCrear">Crear partida</button>';
    body.innerHTML = h;
    $('caVolver').onclick = () => { vista = 'lista'; pintar(); };
    $('caTitulo').oninput = e => { b.titulo = e.target.value; };
    $('caFecha').onchange = e => { b.date = e.target.value; };
    $('caCampo').onchange = e => { b.courseId = e.target.value; const c = campoDe(b.courseId); if(c.par.length === 9){ b.n = 9; b.desde = 1; } pintar(); };
    body.querySelectorAll('.ca-op').forEach(x => x.onclick = () => { b.n = +x.dataset.n; b.desde = +x.dataset.d; pintar(); });
    body.querySelectorAll('.ca-jug input').forEach(x => x.onchange = () => { if(x.checked) b.jug[x.dataset.n] = true; else delete b.jug[x.dataset.n]; });
    $('caCrear').onclick = crear;
  }
  async function crear(ev){
    const b = borrador, btn = ev.target;
    const nombres = Object.keys(b.jug);
    if(nombres.length < 2) return msg('Elige al menos 2 jugadores.');
    if(nombres.length > 8) return msg('Como mucho 8 jugadores.');
    if(!b.date) return msg('Elige el día.');
    btn.disabled = true; btn.textContent = 'Creando…';
    const client = initSupabase();
    const oro = false;
    const yoJ = yo();
    const nuevo = { meta: { cartas: true, titulo: b.titulo || 'Partida de cartas', date: b.date, courseId: b.courseId, n: b.n, desde: b.desde, creador: yoJ, marcador: true },
      jug: nombres.map(n => { const o = soyYo(n); const sorteo = []; if(o) while(sorteo.length < M.INICIALES) sorteo.push(M.sacarCarta(sorteo, oro));
        return { nombre: n, hcp: hcpDe(n), abierto: o, fuera: false, sorteo, golpes: {}, marca: {}, elige: {} }; }) };
    try {
      const { data, error } = await client.from('rounds').insert({
        code: genRoundCode(), course_id: null, course_name: campoDe(b.courseId).name,
        round_name: TAG, scoring_type: 'stableford', match_groups: aGrupos(nuevo),
      }).select(COLS).single();
      if(error) throw error;
      borrador = null; entrar(deFila(data));
    } catch(e){ console.error(e); btn.disabled = false; btn.textContent = 'Crear partida'; msg('No se pudo crear. Revisa la conexión.'); }
  }

  // ---------- Pantalla de la partida ----------
  function filaHoyo(h, est){
    const real = holeReal(est, h.pos);
    const nombres = Object.keys(h.jug);
    return '<details class="ca-det"><summary>Hoyo ' + real + '<small>Par ' + est.par[h.pos - 1] + '</small></summary><div class="ca-det-c">' + tablaHoyo(h, est) + '</div></details>';
  }
  function tablaHoyo(h, est){
    const nombres = Object.keys(h.jug).sort((a, b) => h.jug[b].fin - h.jug[a].fin);
    return '<div class="ca-rev">' + nombres.map(n => {
      const j = h.jug[n], carta = j.carta ? M.CARTAS[j.carta] : null;
      const golpes = j.golpes >= M.NO_PUNTUA ? 'Recogió' : j.golpes + (j.golpes === 1 ? ' golpe' : ' golpes');
      const pts = x => x + (x === 1 ? ' pto' : ' pts');
      const acorta = t => Object.keys(h.jug).reduce((s, m) => s.split(m).join(corto(m)), String(t));
      return '<div class="ca-rev-f"><div class="ca-rev-cab"><b>' + esc(corto(n)) + '</b><span>' + esc(golpes) + ' · ' + pts(j.base) + '</span><em>' + j.fin + '</em></div>'
        + (carta ? '<div class="ca-rev-carta">' + ico(ICO_DE[j.carta], 20) + '<span>' + esc(carta.n) + (j.objetivo ? ' → ' + esc(corto(j.objetivo)) : '') + '</span></div>' : '')
        + (j.notas && j.notas.length ? '<ul>' + j.notas.map(t => '<li>' + esc(acorta(t)) + '</li>').join('') + '</ul>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function copaHtml(sim){
    return '<div class="ca-copa">' + sim.clasificacion.map((n, i) => {
      const t = sim.total[n];
      return '<div class="ca-copa-f' + (i === 0 && sim.cerrados ? ' primero' : '') + (soyYo(n) ? ' yo' : '') + '"><span class="ca-pos">' + (i + 1) + '</span><span class="ca-nom">' + esc(corto(n)) + '</span>'
        + (t.sinUsar ? '<small>+' + t.sinUsar + ' por cartas sin usar</small>' : '') + '<span class="ca-pts">' + t.total + '</span></div>';
    }).join('') + '</div>';
  }
  // Clasificación como en una liga: puntos acumulados tras k hoyos, con flechas respecto al hoyo anterior
  function acumulado(sim, k){
    const t = {}; sim.clasificacion.forEach(n => { t[n] = 0; });
    sim.hoyos.slice(0, k).forEach(h => Object.keys(h.jug).forEach(n => { t[n] = (t[n] || 0) + h.jug[n].fin; }));
    return Object.keys(t).sort((x, y) => t[y] - t[x] || sim.clasificacion.indexOf(x) - sim.clasificacion.indexOf(y)).map((n, i) => ({ n, pts: t[n], pos: i + 1 }));
  }
  function liga(sim, k){
    const ahora = acumulado(sim, k), antes = k > 1 ? acumulado(sim, k - 1) : null, lider = ahora[0].pts;
    return '<div class="ca-liga">' + ahora.map(f => {
      const pa = antes ? antes.find(x => x.n === f.n).pos : f.pos, d = pa - f.pos;
      const flecha = d > 0 ? '<i class="sube">▲' + d + '</i>' : d < 0 ? '<i class="baja">▼' + (-d) + '</i>' : '<i class="igual">•</i>';
      const medalla = f.pos === 1 ? '🥇' : f.pos === 2 ? '🥈' : f.pos === 3 ? '🥉' : f.pos;
      return '<div class="ca-liga-f' + (soyYo(f.n) ? ' yo' : '') + (f.pos === 1 ? ' lider' : '') + '"><span class="ca-liga-p">' + medalla + '</span><span class="ca-liga-n">' + esc(corto(f.n)) + '<small>' + (f.pos === 1 ? 'Líder' : 'a ' + (lider - f.pts) + ' de la cabeza') + '</small></span>' + flecha + '<b>' + f.pts + '</b></div>';
    }).join('') + '</div>';
  }
  // Clasificación general en una fila, para verla arriba mientras se juega el hoyo
  function barraLiga(sim){
    if(!sim.cerrados) return '';
    const f = acumulado(sim, sim.cerrados), lider = f[0].pts;
    return '<div class="ca-top"><div class="ca-top-t">Clasificación · tras el hoyo ' + sim.cerrados + '</div><div class="ca-top-f">' + f.map(x =>
      '<div class="ca-top-c' + (soyYo(x.n) ? ' yo' : '') + (x.pos === 1 ? ' lider' : '') + '"><i>' + (x.pos === 1 ? '🥇' : x.pos === 2 ? '🥈' : x.pos === 3 ? '🥉' : x.pos + 'º') + '</i><b>' + esc(corto(x.n).split(' ')[0]) + '</b><em>' + x.pts + '</em>'
      + (x.pos > 1 ? '<small>−' + (lider - x.pts) + '</small>' : '<small>líder</small>') + '</div>').join('') + '</div></div>';
  }
  function premios(est, sim){
    let peor = null;
    sim.hoyos.forEach(h => Object.keys(h.jug).forEach(n => { const g = h.jug[n].golpes; if(g < M.NO_PUNTUA && (!peor || g > peor.g)) peor = { n, g, real: holeReal(est, h.pos) }; }));
    const ultimo = sim.clasificacion[sim.clasificacion.length - 1];
    let h = '';
    if(peor && peor.g >= 6) h += '<div class="ca-premio"><b>El Cangrejo</b><span>' + esc(corto(peor.n)) + ': ' + peor.g + ' golpes en el hoyo ' + peor.real + '</span></div>';
    if(ultimo && sim.clasificacion.length > 1) h += '<div class="ca-premio"><b>El Consuelo</b><span>' + esc(corto(ultimo)) + ', para que no decaiga</span></div>';
    return h;
  }
  function pintarPartida(){
    const body = $('caBody'), r = partida, m = r.meta;
    let est, sim; try { ({ est, sim } = calcular()); } catch(e){ console.error(e); body.innerHTML = '<div class="ca-cargando">No se pudo leer esta partida.</div>'; return; }
    asegurarCartas(sim);
    const yoJ = mio(), abiertos = todosAbiertos();
    let h = '<button type="button" class="ca-volver" id="caVolver">‹ Mis partidas</button>'
      + '<div class="ca-cab"><div class="ca-cab-t">' + esc(m.titulo || 'Partida de cartas') + '<small>' + esc(fechaLarga(m.date)) + ' · ' + esc(est.campo.name) + ' · ' + m.n + ' hoyos</small></div>'
      + '<div class="ca-cab-n">Solo para reírse: no cuenta para el hándicap ni para la liga</div></div>';
    if(sim.terminada){
      const g = sim.clasificacion[0];
      h += '<div class="ca-final">Ganador de la Copa<b>' + esc(g) + '</b><span>' + sim.total[g].total + ' puntos</span></div>' + premios(est, sim);
    }
    h += '<div class="ca-sub">Copa de las Cartas</div>' + (sim.cerrados || sim.terminada ? copaHtml(sim) : '<p class="ca-nota">Todavía no se ha cerrado ningún hoyo.</p>');
    // quién ha abierto la partida
    h += '<div class="ca-sub">Jugadores</div><div class="ca-estado">' + r.jug.map(j =>
      '<div class="ca-est-f' + (j.fuera ? ' fuera' : '') + '"><span>' + esc(corto(j.nombre)) + (soyYo(j.nombre) ? ' (tú)' : '') + '</span><em>' + (j.fuera ? 'Fuera de la partida' : j.abierto ? 'Listo en su móvil' : 'Sin abrir') + '</em>'
      + (puedeGestionar() && !j.fuera && !soyYo(j.nombre) ? '<button type="button" class="ca-quitar" data-n="' + esc(j.nombre) + '">Quitar</button>' : '') + '</div>').join('') + '</div>';
    if(!sim.terminada && sim.cerrados === 0 && m.marcador && activos().length > 1){
      const mm = marcadoresDe(r);
      h += '<div class="ca-sub">Quién marca a quién</div><div class="ca-mqs">' + activos().map(x => '<div class="ca-mq"><span><b>' + esc(corto(mm[x.nombre])) + '</b> marca a <b>' + esc(corto(x.nombre)) + '</b></span>'
        + (activos().length > 2 ? '<button type="button" class="ca-mq-b" data-n="' + esc(x.nombre) + '">Cambiar</button>' : '') + '</div>').join('') + '</div>'
        + '<p class="ca-nota">Cada uno apunta sus golpes y los del jugador al que marca. Si no coinciden, la app lo avisa.</p>';
    }
    if(!sim.terminada){
      if(!yoJ || yoJ.fuera) h += '<p class="ca-aviso">No estás en esta partida.</p>';
      else if(!abiertos){
        const faltan = activos().filter(j => !j.abierto).map(j => corto(j.nombre)).join(', ');
        h += '<div class="ca-aviso"><b>Esperando a ' + esc(faltan) + '.</b> Hasta que abran la partida en su móvil no se puede anotar ni jugar cartas. Pídeles que pulsen «Cartas» en el Inicio.</div>'
          + '<button type="button" class="ca-btn ghost" id="caAvisar">Avisar a los que faltan</button>';
      } else h += '<button type="button" class="ca-btn" id="caJugar">' + (sim.cerrados ? 'Seguir: hoyo ' + holeReal(est, sim.posActual) : 'Empezar: hoyo ' + holeReal(est, 1)) + '</button>';
    }
    if(yoJ && !yoJ.fuera){
      const mano = sim.mano[yoJ.nombre] || [];
      h += '<div class="ca-sub">Tus cartas (' + mano.length + ')</div>' + (mano.length ? '<div class="ca-mano">' + mano.map(id => tarjetaCarta(id)).join('') + '</div>' : '<p class="ca-nota">Ahora mismo no tienes cartas.</p>');
    }
    if(sim.hoyos.length) h += '<div class="ca-sub">Hoyos jugados</div>' + sim.hoyos.slice().reverse().map(x => filaHoyo(x, est)).join('');
    h += '<div class="ca-msg" id="caMsg">' + esc(mensaje) + '</div>'
      + '<button type="button" class="ca-info-btn" id="caInfo"><span aria-hidden="true">i</span>Cómo se juega y cuáles son las cartas</button>'
      + (admin() ? '<button type="button" class="ca-borrar" id="caBorrar">Borrar esta partida</button>' : '');
    body.innerHTML = h;
    if($('caBorrar')) $('caBorrar').onclick = borrarPartida;
    $('caVolver').onclick = async () => { vista = 'lista'; partida = null; try { lista = await traerMias(); } catch(e){} pintar(); subir(); };
    $('caInfo').onclick = () => { vista = 'info'; pintar(); subir(); };
    if($('caJugar')) $('caJugar').onclick = () => { sel = { c: null, o: null }; vista = 'hoyo'; pintar(); subir(); };
    if($('caAvisar')) $('caAvisar').onclick = avisar;
    body.querySelectorAll('.ca-quitar').forEach(b => b.onclick = () => quitar(b.dataset.n));
    body.querySelectorAll('.ca-mq-b').forEach(b => b.onclick = () => cambiarMarcador(b.dataset.n));
  }
  function avisar(){
    const texto = 'Te he apuntado a una partida de cartas en acgolf. Abre la app, pulsa «Cartas» y entra en la partida «' + (partida.meta.titulo || 'Partida de cartas') + '».';
    if(navigator.share){ navigator.share({ text: texto }).catch(() => {}); }
    else if(navigator.clipboard){ navigator.clipboard.writeText(texto).then(() => msg('Mensaje copiado: pégalo en WhatsApp.')); }
  }
  async function borrarPartida(){
    if(!partida) return;
    const empezada = calcular().sim.cerrados > 0;
    if(!confirm('¿Borrar esta partida de cartas?\n' + (empezada ? 'Ya se ha jugado algún hoyo: se pierden las cartas y los puntos. ' : '') + 'Desaparece para todos y no se puede deshacer.')) return;
    const b = $('caBorrar'); if(b){ b.disabled = true; b.textContent = 'Borrando…'; }
    const res = typeof deleteSharedRound === 'function' ? await deleteSharedRound(partida.code) : { ok: false };
    if(!res || !res.ok){ alert((res && res.msg) || 'No se pudo borrar.'); if(b){ b.disabled = false; b.textContent = 'Borrar esta partida'; } return; }
    const client = initSupabase();
    if(canal && client){ try { client.removeChannel(canal); } catch(e){} canal = null; }
    partida = null; vista = 'lista';
    try { lista = await traerMias(); } catch(e){}
    pintar(); subir();
  }
  async function quitar(nombre){
    if(!confirm('¿Quitar a ' + nombre + ' de la partida?')) return;
    await cambiar(r => { const j = r.jug.find(x => x.nombre === nombre); if(!j) return false; j.fuera = true; });
    pintar();
  }

  // ---------- Un hoyo ----------
  const ackKey = () => 'cartasAck:' + partida.code + ':' + norm(yo());
  const ackGet = () => { try { return +localStorage.getItem(ackKey()) || 0; } catch(e){ return 0; } };
  const ackSet = v => { try { localStorage.setItem(ackKey(), String(v)); } catch(e){} };
  function pintarHoyo(){
    const body = $('caBody');
    let est, sim; try { ({ est, sim } = calcular()); } catch(e){ console.error(e); vista = 'partida'; return pintar(); }
    const yoJ = mio();
    if(!yoJ || yoJ.fuera){ vista = 'partida'; return pintar(); }
    asegurarCartas(sim);
    const ack = ackGet();
    // Primero se enseña lo que pasó en el hoyo que acaba de cerrarse
    ventana().classList.toggle('ca-claro', !(sim.cerrados > ack));
    if(sim.cerrados > ack){ return pintarRevelar(sim.hoyos[ack], est, sim, ack, body); }
    if(sim.terminada){ vista = 'partida'; return pintar(); }
    if(!todosAbiertos()){ vista = 'partida'; return pintar(); }
    const pos = sim.posActual, real = holeReal(est, pos), par = est.par[pos - 1];
    const ej = est.jug.find(j => soyYo(j.nombre));
    const rec = M.golpesRecibidos(ej.hcp, est.rango[pos - 1], est.n);
    const eleccion = (yoJ.elige || {})[pos], golpes = (yoJ.golpes || {})[pos];
    let h = '<button type="button" class="ca-volver" id="caVolver">‹ Partida</button>' + barraLiga(sim)
      + '<div class="ca-hoyo"><div><span>Hoyo</span><b>' + real + '</b></div><div><span>Par</span><b>' + par + '</b></div><div><span>Te dan</span><b>' + rec + '</b></div></div>';
    if(!eleccion){
      // 1. Elegir carta antes de salir del tee
      const mano = sim.mano[yoJ.nombre] || [];
      const congelado = sim.congelado.indexOf(yoJ.nombre) >= 0;
      h += '<div class="ca-tit peq">Elige tu carta antes de salir</div>';
      if(congelado) h += '<div class="ca-aviso">Te han congelado: en este hoyo no puedes jugar cartas.</div>';
      else if(!mano.length) h += '<p class="ca-p">No tienes cartas ahora mismo.</p>';
      else {
        h += '<div class="ca-mano sel">' + mano.map((id, i) => {
          const c = M.CARTAS[id], bloq = id === 'palo' && sim.paloUsado[yoJ.nombre];
          return '<button type="button" class="ca-pick' + (sel.c === id && sel.i === i ? ' on' : '') + (bloq ? ' off' : '') + '" data-i="' + i + '" data-c="' + id + '"' + (bloq ? ' disabled' : '') + '>' + tarjetaCarta(id) + (bloq ? '<small class="ca-ya">Ya la has usado en esta partida</small>' : '') + '</button>';
        }).join('') + '</div>';
        if(sel.c && M.CARTAS[sel.c].obj){
          h += '<div class="ca-sub">¿A quién se la juegas?</div><div class="ca-objs">' + activos().filter(j => !soyYo(j.nombre)).map(j =>
            '<button type="button" class="ca-obj' + (sel.o === j.nombre ? ' on' : '') + '" data-n="' + esc(j.nombre) + '">' + esc(j.nombre) + '</button>').join('') + '</div>';
        }
        const listo = sel.c && (!M.CARTAS[sel.c].obj || sel.o);
        h += '<button type="button" class="ca-btn" id="caOk"' + (listo ? '' : ' disabled') + '>' + (sel.c ? 'Jugar ' + esc(M.CARTAS[sel.c].n) + (sel.o ? ' a ' + esc(corto(sel.o)) : '') : 'Elige una carta') + '</button>';
      }
      h += '<button type="button" class="ca-btn ghost" id="caNo">Sin carta este hoyo</button><p class="ca-nota">Tu carta es secreta hasta que todos hayan anotado el hoyo.</p>';
    } else {
      h += marcadorLiga(est, sim, yoJ, pos, par);
    }
    h += '<div class="ca-msg" id="caMsg">' + esc(mensaje) + '</div>';
    body.innerHTML = h;
    $('caVolver').onclick = () => { vista = 'partida'; pintar(); subir(); };
    body.querySelectorAll('.ca-pick').forEach(b => b.onclick = () => { sel = { c: b.dataset.c, i: +b.dataset.i, o: null }; pintar(); });
    body.querySelectorAll('.ca-obj').forEach(b => b.onclick = () => { sel.o = b.dataset.n; pintar(); });
    if($('caOk')) $('caOk').onclick = () => guardarEleccion(pos, sel.c, sel.o);
    if($('caNo')) $('caNo').onclick = () => guardarEleccion(pos, null, null);
    body.querySelectorAll('.ca-tecla').forEach(b => b.onclick = () => guardarGolpes(pos, +b.dataset.g));
    body.querySelectorAll('.ca-box.edit, .ca-adm').forEach(bx => bx.onclick = () => { tecl = { n: bx.dataset.n, par: +bx.dataset.par, modo: bx.dataset.modo }; pintar(); });
    body.querySelectorAll('.ca-key').forEach(k => k.onclick = () => { const g = +k.dataset.g, t = tecl; tecl = null; guardarGolpes(pos, t.n, t.modo, g); });
    if($('caTcerrar')) $('caTcerrar').onclick = () => { tecl = null; pintar(); };
  }
  async function guardarEleccion(pos, carta, objetivo){
    const ok = await cambiar(r => { const j = r.jug.find(x => soyYo(x.nombre)); if(!j) return false; j.elige[pos] = { c: carta, o: objetivo || null }; });
    sel = { c: null, o: null }; pintar();
    if(!ok) msg(mensaje);
  }
  // Marcador como el de la liga con marcador (tira de hoyos, una fila por jugador, casilla grande, resultado y ✅/⚠️), con el diseño de Cartas.
  // Aquí no se ve ningún punto ni efecto de carta: eso es la sorpresa del final del hoyo.
  function marcadorLiga(est, sim, yoJ, pos, par){
    const marc = !!partida.meta.marcador, act = activos(), adm = puedeGestionar();
    const miMarcado = marc ? marcadoPor(yoJ.nombre) : null;
    let h = '<div class="ca-tira">';
    for(let p = 1; p <= est.n; p++){
      const llenos = act.filter(x => (x.golpes || {})[p] != null).length;
      const st = p <= sim.cerrados ? ' done' : p === pos ? ' current' : llenos ? ' partial' : '';
      h += '<span class="ca-ch' + st + '">' + holeReal(est, p) + '</span>' + (p === 9 && est.n > 9 ? '<span class="ca-ch-sep"></span>' : '');
    }
    h += '</div><div class="ca-filas">';
    const faltan = [], extras = [];
    act.forEach(x => {
      const ej = est.jug.find(e => e.nombre === x.nombre), mio = soyYo(x.nombre), loMarco = marc && x.nombre === miMarcado;
      const rec = M.golpesRecibidos(ej.hcp, est.rango[pos - 1], est.n);
      const st = marc ? estadoMarca(partida, x, pos) : ((x.golpes || {})[pos] != null ? 'ok' : 'nada');
      if(st !== 'ok') faltan.push(corto(x.nombre));
      // Lo que se ve en la casilla: lo mío, o lo que yo apunto del que marco, o lo que dice cada uno
      const g = loMarco ? (yoJ.marca || {})[pos] : (x.golpes || {})[pos];
      let res = '—', cls = '';
      if(g != null){
        if(g >= M.NO_PUNTUA){ res = '✕'; cls = ' over'; }
        else { const d = g - rec - par; res = d === 0 ? 'PAR' : d > 0 ? '+' + d : '−' + (-d); cls = d < 0 ? ' under' : d > 0 ? ' over' : ' par'; }
      }
      const modo = mio ? 'propio' : loMarco ? 'marca' : (adm && marc && st !== 'ok') ? 'admin' : '';
      const etiqueta = !marc ? '' : mio ? '✍️ Te marca ' + esc(corto(marcadorDe(x.nombre))) : loMarco ? '✍️ Tú le marcas' : '✍️ Le marca ' + esc(corto(marcadorDe(x.nombre)));
      const k = marc ? partida.jug.find(y => y.nombre === marcadorDe(x.nombre)) : null, kv = k ? (k.marca || {})[pos] : null, xv = (x.golpes || {})[pos];
      const vtxt = v => v >= M.NO_PUNTUA ? 'recogió' : v;
      const badge = !marc ? '' : st === 'ok' ? '<span class="ca-ok">✅ Coincide</span>'
        : st === 'no' ? '<span class="ca-no">⚠️ No coincide: dice ' + vtxt(xv) + ', su marcador ' + vtxt(kv) + '</span>'
        : st === 'falta' ? '<span class="ca-fa">⏳ ' + (xv == null ? 'Falta que apunte ' + esc(corto(x.nombre)) : 'Falta su marcador') + '</span>' : '';
      const valor = g == null ? '' : g >= M.NO_PUNTUA ? '✕' : g;
      const fila = '<div class="ca-fila-l' + (mio ? ' yo' : '') + (loMarco ? ' apunto' : '') + '"><div class="ca-fl-info"><b>' + esc(corto(x.nombre)) + (mio ? ' (tú)' : '') + '</b>'
        + '<span>Recibe ' + Math.round(ej.hcp) + ' · Tu par <em>' + (par + rec) + '</em></span>' + (etiqueta ? '<span class="ca-fl-ap">' + etiqueta + '</span>' : '') + (badge ? '<span class="ca-fl-st">' + badge + '</span>' : '') + '</div>'
        + (modo ? '<button type="button" class="ca-box edit' + (g != null ? ' lleno' : '') + '" data-n="' + esc(x.nombre) + '" data-modo="' + modo + '" data-par="' + (par + rec) + '" aria-label="Golpes de ' + esc(corto(x.nombre)) + '">' + (valor === '' ? '+' : valor) + '</button>'
          : '<div class="ca-box fijo' + (g != null ? ' lleno' : '') + '">' + (valor === '' ? '·' : valor) + '</div>')
        + '<div class="ca-res-l' + cls + '">' + res + '</div></div>';
      // Como en la liga: solo se ve tu fila y la del jugador al que marcas
      if(!marc || mio || loMarco) h += fila;
      else if(adm && st !== 'ok') extras.push('<button type="button" class="ca-btn ghost ca-adm ca-box edit-b" data-n="' + esc(x.nombre) + '" data-modo="admin" data-par="' + (par + rec) + '">Decidir los golpes de ' + esc(corto(x.nombre)) + '</button>');
    });
    h += '</div>';
    h += marc ? '<p class="ca-p">Toca tu casilla y la de <b>' + esc(corto(miMarcado)) + '</b>, el jugador al que marcas. Si no coinciden, hablad y corregid.</p>' : '<p class="ca-p">Toca tu casilla para apuntar tus golpes.</p>';
    h += faltan.length ? '<p class="ca-p">Falta por cuadrar: <b>' + esc(faltan.join(', ')) + '</b>. Cuando coincidan todos, se destapan las cartas.</p>' : '';
    if(extras.length) h += '<div class="ca-sub">Si no se ponen de acuerdo (administrador)</div>' + extras.join('');
    if(tecl){
      const n = tecl.n;
      h += '<div class="ca-tec" id="caTec"><div class="ca-tec-c"><div class="ca-tit peq">' + esc(corto(n)) + '</div><div class="ca-tec-s">Hoyo ' + holeReal(est, pos) + ' · Par ' + par + ' · <b>Tu par ' + tecl.par + '</b></div><div class="ca-teclado">'
        + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(k => '<button type="button" class="ca-key' + (k === tecl.par ? ' par' : '') + '" data-g="' + k + '">' + k + (k === tecl.par ? '<small>tu par</small>' : '') + '</button>').join('')
        + '</div><button type="button" class="ca-btn ghost ca-key" data-g="' + M.NO_PUNTUA + '" id="caRecoge">Recogió la bola</button><button type="button" class="ca-btn ghost" id="caTcerrar">Cerrar</button></div></div>';
    }
    return h;
  }
  async function guardarGolpes(pos, nombre, modo, g){
    const ok = await cambiar(r => {
      const yoJ = r.jug.find(x => soyYo(x.nombre));
      if(modo === 'propio'){ if(!yoJ) return false; yoJ.golpes[pos] = g; }
      else if(modo === 'marca'){ if(!yoJ) return false; yoJ.marca[pos] = g; }
      else { // el administrador decide: pone el mismo número a los dos
        const x = r.jug.find(y => y.nombre === nombre), k = r.jug.find(y => y.nombre === marcadorDe(nombre, r)); if(!x) return false;
        x.golpes[pos] = g; if(k) k.marca[pos] = g;
      }
    });
    editando = false; pintar();
    if(!ok) msg(mensaje);
  }
  // Antes de empezar: quién marca a quién (toca para cambiar). Se intercambia para que cada uno marque a uno solo.
  async function cambiarMarcador(nombre){
    await cambiar(r => {
      const m = marcadoresDe(r), act = r.jug.filter(j => !j.fuera).map(j => j.nombre), c = m[nombre];
      const cands = act.filter(n => n !== nombre && n !== c);
      for(const sig of cands){
        const y = Object.keys(m).find(k => m[k] === sig);
        if(y === c) continue;
        m[nombre] = sig; m[y] = c; r.meta.marca = m; return;
      }
      return false;
    });
    pintar();
  }

  // El momento sorpresa: se giran las cartas una a una y luego salen los puntos
  function pintarRevelar(h, est, sim, ack, body){
    const nombres = Object.keys(h.jug), conCarta = nombres.filter(n => h.jug[n].carta);
    const k = partida.code + ':' + ack; if(rev.k !== k){ clearTimeout(revTimer); rev = { k, e: 0, n: 0 }; }
    const real = holeReal(est, h.pos), final = h.pos >= est.n;
    const volver = '<button type="button" class="ca-volver" id="caVolver">‹ Partida</button>';
    const irA = e => { clearTimeout(revTimer); rev.e = e; rev.n = 0; rev.c = null; pintar(); subir(); };
    // Etapa 0: pantalla completa del hoyo, con los golpes de todos (3 o 4 jugadores) ya cuadrados
    if(rev.e === 0){
      const par = est.par[h.pos - 1];
      body.innerHTML = volver + '<div class="ca-tit ca-rev-t">Hoyo ' + real + ' completo</div><div class="ca-rev-h">✅ Coinciden los ' + nombres.length + ' jugadores</div><div class="ca-filas">'
        + nombres.map(n => {
          const ej = est.jug.find(e => e.nombre === n), rec = M.golpesRecibidos(ej.hcp, est.rango[h.pos - 1], est.n), g = h.jug[n].golpes;
          let res, cls = '';
          if(g >= M.NO_PUNTUA){ res = '✕'; cls = ' over'; } else { const d = g - rec - par; res = d === 0 ? 'PAR' : d > 0 ? '+' + d : '−' + (-d); cls = d < 0 ? ' under' : d > 0 ? ' over' : ' par'; }
          return '<div class="ca-fila-l comp' + (soyYo(n) ? ' yo' : '') + '"><div class="ca-fl-info"><b>' + esc(corto(n)) + (soyYo(n) ? ' (tú)' : '') + '</b><span>Recibe ' + Math.round(ej.hcp) + ' · Tu par <em>' + (par + rec) + '</em></span><span class="ca-fl-st"><span class="ca-ok">✅ Coincide</span></span></div>'
            + '<div class="ca-box fijo lleno">' + (g >= M.NO_PUNTUA ? '✕' : g) + '</div><div class="ca-res-l' + cls + '">' + res + '</div></div>';
        }).join('') + '</div>'
        + '<p class="ca-p">Ahora llega la sorpresa. Se destapan las cartas en <b id="caCuenta">5</b>…</p><button type="button" class="ca-btn" id="caSig">Destapar ya</button>';
      $('caVolver').onclick = () => { clearTimeout(revTimer); vista = 'partida'; pintar(); subir(); };
      const sig = () => irA(conCarta.length ? 1 : 2);
      $('caSig').onclick = sig;
      clearTimeout(revTimer);
      if(typeof rev.c !== 'number') rev.c = 5;
      const tic = () => { const el = $('caCuenta'); if(!el || rev.k !== k || rev.e !== 0) return; el.textContent = rev.c; if(rev.c <= 0){ rev.c = null; return sig(); } rev.c--; revTimer = setTimeout(tic, 1000); };
      tic();
      return;
    }
    // Etapa 1: las cartas se giran solas, una a una
    if(rev.e === 1){
      clearTimeout(revTimer);
      if(rev.n >= conCarta.length){ revTimer = setTimeout(() => { if(rev.k === k && rev.e === 1) irA(2); }, 1600); }
      else revTimer = setTimeout(() => { if(rev.k === k && rev.e === 1 && !ventana().hidden){ rev.n++; pintar(); } }, rev.n === 0 ? 1300 : 1500);
      body.innerHTML = volver + '<div class="ca-tit ca-rev-t">¡Se destapan las cartas!</div><div class="ca-rev-h">Hoyo ' + real + '</div><div class="ca-grid">'
        + conCarta.map((n, i) => { const j = h.jug[n]; return i < rev.n
          ? '<div class="ca-gc giro">' + tarjetaCarta(j.carta) + '<span class="ca-gn">' + esc(corto(n)) + (j.objetivo ? ' → ' + esc(corto(j.objetivo)) : '') + '</span></div>'
          : '<div class="ca-gc"><div class="ca-dorso"><b>?</b></div></div>'; }).join('') + '</div>'
        + '<p class="ca-sorp">' + (rev.n >= conCarta.length ? '¡Ya están todas! Ahora los puntos…' : 'Girando las cartas…') + '</p><button type="button" class="ca-btn ghost" id="caSalta">Saltar</button>';
      $('caVolver').onclick = () => { clearTimeout(revTimer); vista = 'partida'; pintar(); subir(); };
      $('caSalta').onclick = () => irA(2);
      return;
    }
    const orden = nombres.slice().sort((a, b) => h.jug[b].fin - h.jug[a].fin);
    body.innerHTML = volver + '<div class="ca-tit ca-rev-t">Puntos del hoyo ' + real + '</div><div class="ca-rev-h">Así queda tras las cartas</div>'
      + orden.map(n => {
        const j = h.jug[n], d = j.fin - j.base;
        const efecto = d ? '<span class="' + (d > 0 ? 'mas' : 'menos') + '">' + (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + esc(j.notas && j.notas.length ? corto2(j.notas, h) : 'cartas') + '</span>' : (j.carta ? 'sin efecto' : 'sin carta');
        const gtxt = x => !h.jug[x] ? '' : h.jug[x].golpes >= M.NO_PUNTUA ? 'recogió la bola' : h.jug[x].golpes + (h.jug[x].golpes === 1 ? ' golpe' : ' golpes');
        const marc = !!partida.meta.marcador, marcador = marcadorDe(n), marcado = marcadoPor(n);
        const tarjeta = !marc || !marcador ? '' : '<small class="ca-tj">' + (soyYo(n)
          ? '✍️ Te marcó ' + esc(corto(marcador)) + ': <b>' + esc(gtxt(n)) + '</b><br>✍️ Tú marcaste a ' + esc(corto(marcado)) + ': <b>' + esc(gtxt(marcado)) + '</b>'
          : '✍️ ' + esc(gtxt(n)) + ' · lo marcó ' + esc(corto(marcador))) + '</small>';
        return '<div class="ca-res' + (soyYo(n) ? ' yo' : '') + '"><div><b>' + esc(corto(n)) + (soyYo(n) ? ' (tú)' : '') + '</b><small>' + j.base + (j.base === 1 ? ' pto' : ' pts') + ' · ' + efecto + '</small>' + tarjeta + '</div><div class="ca-n" data-b="' + j.base + '" data-f="' + j.fin + '">' + j.base + '</div></div>';
      }).join('')
      + '<div class="ca-sub">Clasificación tras el hoyo ' + real + '</div>' + liga(sim, ack + 1)
      + '<button type="button" class="ca-btn" id="caSig">' + (final ? 'Ver el final' : 'Siguiente hoyo') + '</button>';
    $('caVolver').onclick = () => { vista = 'partida'; pintar(); subir(); };
    $('caSig').onclick = () => { ackSet(ack + 1); sel = { c: null, o: null }; if(final) vista = 'partida'; pintar(); subir(); };
    body.querySelectorAll('.ca-n').forEach(el => {
      const b = +el.dataset.b, f = +el.dataset.f; if(b === f) return;
      let t = 0; const paso = f > b ? 1 : -1; const iv = setInterval(() => { b + paso * (++t) === f ? (el.textContent = f, clearInterval(iv)) : (el.textContent = b + paso * t); if(!el.isConnected) clearInterval(iv); }, 350);
    });
  }
  const corto2 = (notas, h) => Object.keys(h.jug).reduce((t, m) => t.split(m).join(corto(m)), String(notas[0]).replace(/^[+\-−]?\d+\s*/, ''));

  // ---------- Cómo se juega ----------
  function pintarInfo(){
    const sec = (t, html) => '<details class="ca-det"><summary>' + t + '</summary><div class="ca-det-c">' + html + '</div></details>';
    const grupo = fam => '<div class="ca-mano peq">' + Object.keys(M.CARTAS).filter(id => M.CARTAS[id].fam === fam).map(id => tarjetaCarta(id)).join('') + '</div>';
    $('caBody').innerHTML = '<button type="button" class="ca-volver" id="caVolver">‹ ' + (partida ? 'Partida' : 'Mis partidas') + '</button><div class="ca-tit">Cómo se juega Cartas</div>'
      + '<p class="ca-p">Toca cada apartado para abrirlo.</p>'
      + sec('Qué es', '<p>Una partida de golf <b>solo para reírse</b>. Se juega al golf como siempre, y además cada jugador tiene cartas secretas que suben o bajan los puntos de ese hoyo.</p>'
        + '<ul><li><b>No cuenta</b> para el hándicap, ni para la liga, ni para ninguna clasificación.</li><li>Los golpes reales no se tocan. Las cartas mueven unos <b>puntos de juego</b> aparte: la Copa de las Cartas.</li><li>Cada jugador lleva <b>su móvil</b> y solo ve sus cartas.</li></ul>')
      + sec('Cómo se juega un hoyo', '<ol><li>Antes de salir del tee, cada uno elige una carta (o ninguna). Si va contra otro, elige a quién.</li><li>Cada uno juega el hoyo y anota sus golpes.</li>'
        + '<li>Cuando han anotado todos, la app calcula los <b>puntos normales</b> de cada uno (Stableford neto, con su hándicap).</li><li>Se destapan las cartas y suman o restan puntos.</li><li>Pasáis al hoyo siguiente.</li></ol>')
      + sec('Reparto de cartas', '<ul><li>Cada uno empieza con <b>3 cartas</b> al azar.</li><li>Recibe <b>1 carta nueva cada 3 hoyos</b> (al empezar el 4, 7, 10, 13 y 16). En 18 hoyos son 8 cartas; en 9 hoyos, 5.</li><li>Solo puedes jugar <b>una carta por hoyo</b>.</li>'
        + '<li>Al final, cada carta que te quede sin usar vale <b>1 punto</b>.</li></ul>')
      + sec('Cartas de ventaja', grupo('v')) + sec('Cartas de travesura', grupo('t')) + sec('Comodines', grupo('c'))
      + sec('Si alguien no puede entrar', '<p>No se puede anotar hasta que los jugadores hayan abierto la partida en su móvil. Si alguien no puede entrar, quien creó la partida (o el administrador) puede <b>quitarlo</b>.</p>');
    $('caVolver').onclick = () => { vista = partida ? 'partida' : 'lista'; pintar(); subir(); };
  }

  // ---------- Botón en el Inicio ----------
  function ponerBoton(){
    if($('hmCartas')) return;
    const ref = $('hmRyder') || $('hmDerbi') || document.querySelector('.home-menu-btn:last-of-type');
    if(!ref) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn hm-cartas'; b.id = 'hmCartas';
    const MINI = (c, p) => '<i class="hc-m ' + c + '"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg></i>';
    b.innerHTML = '<span class="hc-nuevo">NUEVO</span><span class="hc-tit">Cartas</span><span class="hc-sub">Para reírse</span>'
      + '<span class="hc-abanico" aria-hidden="true">'
      + MINI('rosa', '<path d="M12 2v20M4 7l16 10M4 17L20 7"/>')
      + MINI('verde', '<path d="M12 3l7 3v5c0 5-3.2 8.5-7 10-3.8-1.5-7-5-7-10V6z"/>')
      + MINI('oro', '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>') + '</span><i class="hc-bri"></i>';
    b.setAttribute('aria-label', 'Cartas, para reírse');
    b.onclick = abrir;
    ref.parentNode.insertBefore(b, ref.nextSibling);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ponerBoton); else ponerBoton();
  window.acgolfCartas = { abrir, _aEstado: aEstado, _deFila: deFila };
})();
