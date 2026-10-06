/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Crear liga.
   El administrador elige los jugadores, cuántas jornadas, si se juega en sábado o en domingo, el campo
   y la primera hora de salida. La app calcula la fecha de cada jornada (una por semana) y prepara la
   convocatoria de cada una con todos los jugadores ya colocados en grupos de 4 (los grupos cambian cada
   jornada para que todos coincidan con todos). Cada jornada es una partida con todos los jugadores.
   Clasificación por puesto: en cada jornada, por neto, 25 · 18 · 15 · 12 · 10 · 8 · 6 · 4 · 2 · 1, del 11.º en adelante 0 (escala de Fórmula 1).
   Empate en neto: gana el de hándicap más bajo.
   Se guarda como una fila de "rounds" sin campo (no sale en la liga semanal ni en "Últimas partidas").
   La convocatoria de cada jornada se crea cuando le toca (la próxima que falte), con un código fijo
   (código de la liga + J + número) para que nunca salga repetida. */

const LIGA_TAG = 'Liga de amigos';
const LIGA_PUNTOS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const LIGA_MAX_JORNADAS = 30;
let ligasTodas = [];          // [{ id, code, updatedAt, nombre, jugadores, dia, courseId, hora, jornadas:[{n, date, courseId}] }]
let ligaAbierta = null;       // code de la liga que se está viendo
let ligaForm = null;          // borrador del formulario de crear liga

const ligaEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Nombre sin el segundo apellido (así se distinguen los dos Francisco Javier)
const ligaCortoN = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' '); };
const ligaIso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function ligaHoy(){ return ligaIso(new Date()); }
function ligaFechaLarga(iso){
  const s = new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function ligaFechaCortaJ(iso){
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' }).replace(',', '').replace('.', '');
}
function ligaEsAdmin(){
  return typeof isAdminDevice === 'function' ? isAdminDevice() : !!(typeof getAdminKey === 'function' && getAdminKey());
}
function ligaCampo(id){ return COURSES.find(c => c.id === id) || COURSES.find(c => c.id === 'hato-verde'); }
function ligaCampoCorto(id){ return id === 'zaudin' ? 'Zaudín' : 'Hato Verde'; }
function ligaHcp(n){ const h = Number((typeof FAVORITE_HANDICAPS !== 'undefined' ? FAVORITE_HANDICAPS : {})[n]); return isNaN(h) ? null : h; }
function ligaJugadoresTodos(){ return (typeof FAVORITE_PLAYERS !== 'undefined' ? FAVORITE_PLAYERS.slice() : []).sort((a, b) => a.localeCompare(b, 'es')); }

// Próximo sábado (6) o domingo (0) a partir de mañana
function ligaProximoDia(dia){
  const d = new Date(); d.setDate(d.getDate() + 1);
  while(d.getDay() !== dia) d.setDate(d.getDate() + 1);
  return ligaIso(d);
}
// Fechas de las jornadas: cada semana (7) o cada 15 días (14) desde la primera; si se cambia una a mano, las siguientes cuentan desde ella
function ligaCalendario(inicio, jornadas, campo, cada, fechas, salida){
  const out = [];
  const d = new Date(inicio + 'T12:00:00');
  for(let n = 1; n <= jornadas; n++){
    const courseId = campo === 'alternar' ? (n % 2 ? 'hato-verde' : 'zaudin') : campo;
    if(fechas && fechas[n]) d.setTime(new Date(fechas[n] + 'T12:00:00').getTime()); // las siguientes siguen contando desde la cambiada
    const j = { n, date: ligaIso(d), courseId };
    if(salida === 'tiro') j.salida = 'tiro';
    out.push(j);
    d.setDate(d.getDate() + (cada || 7));
  }
  return out;
}
// Salida al tiro: hoyos repartidos por el campo (8 grupos: 1, 3, 5, 7, 10, 12, 14, 16)
function ligaHoyosPorDefecto(g){ return Array.from({ length: g }, (_, i) => 1 + Math.round(i * 18 / g)); }
function ligaNumGrupos(l){ return Math.max(1, Math.ceil(l.jugadores.length / 4)); }
// Horas y hoyos de una jornada: normal, una salida cada 10 min por el 1; al tiro, todos a la vez cada uno en su hoyo
function ligaSalidas(l, j, g){
  const hora = j.hora || l.hora;
  if(j.salida !== 'tiro'){ const hi = Number(j.hoyoInicio || l.hoyoInicio) || 1; return { times: ligaHoras(hora, g), hoyos: Array(g).fill(hi > 1 ? hi : null) }; }
  const def = ligaHoyosPorDefecto(g);
  return { times: Array(g).fill(hora), hoyos: def.map((h, i) => (j.hoyos && j.hoyos[i]) || h) };
}
// Hoyo de salida (1 a 18) con − y +
function ligaHoyoMas(h, d){ return d > 0 ? h % 18 + 1 : (h + 16) % 18 + 1; }
function ligaPasoHoyo(h, id){
  return '<div class="conv-eyebrow">Hoyo de salida</div>'
    + '<div class="lg-paso" id="' + id + '"><button type="button" class="lg-mas" data-hoyoini="-1" aria-label="Hoyo anterior">−</button>'
    + '<div class="lg-num"><b>' + h + '</b><small>hoyo</small></div><button type="button" class="lg-mas" data-hoyoini="1" aria-label="Hoyo siguiente">+</button></div>';
}
// Próxima jornada por jugar (la de fecha más cercana desde hoy)
function ligaProxima(l){
  const hoy = ligaHoy();
  return l.jornadas.filter(j => j.date >= hoy).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
// Horas de salida: una cada 10 minutos desde la primera
function ligaHoras(primera, grupos){
  const [h, m] = String(primera || '08:40').split(':').map(Number);
  return Array.from({ length: grupos }, (_, i) => {
    const t = h * 60 + (m || 0) + i * 10;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  });
}
// Grupos de una jornada: se barajan con una semilla fija (código de liga + jornada) y se reparten
// en grupos lo más iguales posible, de 4 como mucho. Así cada jornada salen grupos distintos.
function ligaGrupos(jugadores, semilla){
  let s = 0; for(const ch of String(semilla)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  const azar = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const l = jugadores.slice().sort((a, b) => a.localeCompare(b, 'es'));
  for(let i = l.length - 1; i > 0; i--){ const j = Math.floor(azar() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  const g = Math.max(1, Math.ceil(l.length / 4));
  const grupos = Array.from({ length: g }, () => []);
  l.forEach((n, i) => grupos[i % g].push(n));
  return grupos;
}

// Grupos de una jornada: los que haya dejado el administrador o, si no, los automáticos
function ligaGruposJornada(l, j){
  if(Array.isArray(j.grupos) && j.grupos.some(g => g && g.length)) return j.grupos.map(g => (g || []).slice());
  return ligaGrupos(l.jugadores, ligaCodigoJornada(l, j.n));
}

// ---------- Base de datos ----------
function ligaDesdeFila(row){
  const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
  const meta = ((mg.find(g => g && g.meta) || {}).meta || {}).liga || {};
  return { id: row.id, code: row.code, updatedAt: row.updated_at, nombre: meta.nombre || 'Liga', jugadores: meta.jugadores || [],
    dia: meta.dia, courseId: meta.courseId, hora: meta.hora || '08:40', cada: meta.cada || 7, hoyoInicio: meta.hoyoInicio || 1, jornadas: meta.jornadas || [] };
}
function ligaAFila(l){
  return [{ players: [], handicaps: [], scores: {}, meta: { liga: { nombre: l.nombre, jugadores: l.jugadores, dia: l.dia, courseId: l.courseId, hora: l.hora, cada: l.cada || 7, hoyoInicio: l.hoyoInicio || 1, jornadas: l.jornadas } } }];
}
const ligaCodigoJornada = (l, n) => l.code + 'J' + n;

async function ligaCargar(){
  const client = initSupabase(); if(!client) return [];
  const { data, error } = await client.from('rounds').select('id, code, match_groups, updated_at, created_at')
    .is('course_id', null).eq('round_name', LIGA_TAG).order('created_at', { ascending: false });
  if(error) throw error;
  ligasTodas = (data || []).map(ligaDesdeFila);
  return ligasTodas;
}

// Crea la convocatoria de una jornada (si ya existe, no hace nada)
async function ligaCrearConvocatoria(l, j){
  const client = initSupabase(); if(!client) return false;
  const code = ligaCodigoJornada(l, j.n);
  const { data: hay } = await client.from('rounds').select('id').eq('code', code).limit(1);
  if(hay && hay.length) return false;
  const grupos = ligaGruposJornada(l, j);
  const sal = ligaSalidas(l, j, grupos.length);
  const fila = sal.times.map((t, i) => Object.assign({ time: t, players: grupos[i], handicaps: [], scores: {} }, sal.hoyos[i] ? { hoyo: sal.hoyos[i] } : {}))
    .concat([{ players: [], handicaps: [], scores: {}, meta: { date: j.date, courseId: j.courseId, roundCode: null } }]);
  const { error } = await client.from('rounds').insert({
    code, course_id: null, course_name: ligaCampo(j.courseId).name, round_name: 'Convocatoria',
    scoring_type: 'strokeplay', match_groups: fila,
  });
  if(error && !/duplicate|unique/i.test(error.message || '')){ console.error(error); return false; }
  return !error;
}
// Deja creada la convocatoria de la próxima jornada de cada liga (la que falte)
async function ligaAsegurarJornadas(){
  let nuevas = 0;
  for(const l of ligasTodas){
    const j = ligaProxima(l);
    if(j && await ligaCrearConvocatoria(l, j)) nuevas++;
  }
  if(nuevas && typeof convFetchActivas === 'function'){
    try { convActivas = await convFetchActivas(); if(typeof renderConvHome === 'function') renderConvHome(); } catch(e){}
  }
}

// Resultados de las jornadas ya jugadas: { n: [{jugador, bruto, neto, hcp}] }
async function ligaResultados(l){
  const client = initSupabase(); if(!client) return {};
  const codigos = l.jornadas.map(j => ligaCodigoJornada(l, j.n));
  const { data: convs } = await client.from('rounds').select('code, match_groups').in('code', codigos);
  const rondaDe = {};
  (convs || []).forEach(r => {
    const meta = ((r.match_groups || []).find(g => g && g.meta) || {}).meta || {};
    if(meta.roundCode) rondaDe[r.code] = meta.roundCode;
  });
  const rc = Object.values(rondaDe);
  if(!rc.length) return { _estado: rondaDe };
  const { data: rondas } = await client.from('rounds').select('code, course_id, match_groups').in('code', rc);
  const porCodigo = {}; (rondas || []).forEach(r => porCodigo[r.code] = r);
  const out = { _estado: rondaDe };
  l.jornadas.forEach(j => {
    const r = porCodigo[rondaDe[ligaCodigoJornada(l, j.n)]];
    if(!r) return;
    const curso = ligaCampo(r.course_id);
    const filas = [];
    (r.match_groups || []).forEach(g => (g.players || []).forEach((n, i) => {
      if(!n || !l.jugadores.includes(n)) return;
      const sc = (g.scores && g.scores[i]) || {};
      const golpes = Object.keys(sc).map(h => Number(sc[h])).filter(v => v > 0);
      if(golpes.length < 18) return; // solo cuentan las tarjetas completas
      const hcp = Number((g.handicaps || [])[i]) || 0;
      const bruto = golpes.reduce((a, b) => a + b, 0);
      const recibidos = typeof hcpCampo === 'function' ? hcpCampo(hcp, curso) : Math.round(hcp);
      filas.push({ jugador: n, bruto, neto: bruto - recibidos, hcp });
    }));
    filas.sort((a, b) => a.neto - b.neto || a.hcp - b.hcp);
    filas.forEach((f, i) => { f.pos = i + 1; f.puntos = LIGA_PUNTOS[i] != null ? LIGA_PUNTOS[i] : 0; });
    out[j.n] = filas;
  });
  return out;
}

// ---------- Pantallas ----------
function ligaVentana(){
  let ov = document.getElementById('ligaOverlay');
  if(ov) return ov;
  ov = document.createElement('div');
  ov.id = 'ligaOverlay'; ov.className = 'modal-overlay conv-overlay'; ov.hidden = true;
  ov.innerHTML = '<div class="modal-card conv-card lg-card" role="dialog" aria-labelledby="ligaTitulo">'
    + '<button type="button" class="conv-close" id="ligaCerrar" aria-label="Cerrar">✕</button>'
    + '<h2 class="lg-titulo" id="ligaTitulo">Ligas</h2><div id="ligaCuerpo"></div></div>';
  document.body.appendChild(ov);
  ov.querySelector('#ligaCerrar').addEventListener('click', ligaCerrar);
  return ov;
}
function ligaCerrar(){ const ov = document.getElementById('ligaOverlay'); if(ov) ov.hidden = true; }
function ligaTitulo(t){ const el = document.getElementById('ligaTitulo'); if(el) el.textContent = t; }

async function ligaAbrir(){
  const ov = ligaVentana(); ov.hidden = false;
  ligaAbierta = null;
  ligaTitulo('Ligas');
  document.getElementById('ligaCuerpo').innerHTML = '<div class="lg-aviso">Cargando…</div>';
  try { await ligaCargar(); } catch(e){ console.error(e); }
  ligaPintarLista();
}

function ligaPintarLista(){
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  ligaTitulo('Ligas');
  const hoy = ligaHoy();
  const tarjetas = ligasTodas.map(l => {
    const prox = ligaProxima(l);
    const jugadas = l.jornadas.filter(j => j.date < hoy).length;
    return '<button type="button" class="lg-liga" data-code="' + ligaEsc(l.code) + '">'
      + '<b>' + ligaEsc(l.nombre) + '</b>'
      + '<span>' + l.jugadores.length + ' jugadores · ' + l.jornadas.length + ' jornadas · ' + (l.cada === 14 ? 'cada 15 días' : 'cada semana') + '</span>'
      + '<span class="lg-liga-prox">' + (prox ? 'Próxima: jornada ' + prox.n + ', ' + ligaFechaCortaJ(prox.date) : (jugadas ? 'Liga terminada' : '')) + '</span>'
      + '</button>';
  }).join('');
  body.innerHTML = (tarjetas || '<div class="lg-aviso">Todavía no hay ninguna liga.</div>')
    + (ligaEsAdmin() ? '<button type="button" class="conv-btn primary lg-nueva" id="ligaNueva">＋ Crear liga</button>' : '')
    + ligaBotonBases('lgBasesLista');
  body.querySelectorAll('.lg-liga').forEach(b => b.addEventListener('click', ()=> ligaVer(b.dataset.code)));
  const n = document.getElementById('ligaNueva'); if(n) n.addEventListener('click', ()=> { ligaForm = null; ligaPintarForm(); });
  document.getElementById('lgBasesLista').addEventListener('click', ()=> ligaVerBases(ligaPintarLista));
}

// --- Formulario de crear liga (solo administrador) ---
function ligaPintarForm(){
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  ligaTitulo('Crear liga');
  if(!ligaForm) ligaForm = { nombre: '', jugadores: [], jornadas: 8, dia: 6, inicio: ligaProximoDia(6), campo: 'hato-verde', hora: '08:40', cada: 7, fechas: {}, salida: 'normal', hoyoInicio: 1 };
  const f = ligaForm;
  const todos = ligaJugadoresTodos();
  const cal = ligaCalendario(f.inicio, f.jornadas, f.campo, f.cada, f.fechas, f.salida);
  const nGrupos = Math.ceil(f.jugadores.length / 4);
  body.innerHTML = ''
    + '<div class="lg-aviso" style="margin-top:0;">Las ligas se juegan con las bases de Los Iscariotes.</div>' + ligaBotonBases('lgBasesForm')
    + '<div class="field"><label for="lgNombre">Nombre de la liga</label><input type="text" id="lgNombre" maxlength="40" placeholder="Por ejemplo: Liga de otoño" value="' + ligaEsc(f.nombre) + '"></div>'

    + '<div class="conv-eyebrow">1 · Jugadores <span class="lg-cuenta">' + f.jugadores.length + ' elegidos</span></div>'
    + '<div class="lg-todos"><button type="button" class="lg-chip" id="lgTodos">Todos</button><button type="button" class="lg-chip" id="lgNinguno">Ninguno</button></div>'
    + '<div class="lg-jugs">' + todos.map(n => {
        const on = f.jugadores.includes(n); const h = ligaHcp(n);
        return '<button type="button" class="lg-jug' + (on ? ' on' : '') + '" data-n="' + ligaEsc(n) + '" aria-pressed="' + on + '">'
          + '<i class="lg-check">' + (on ? '✓' : '') + '</i><span>' + ligaEsc(n) + '</span><b>' + (h === null ? '' : String(h).replace('.', ',')) + '</b></button>';
      }).join('') + '</div>'

    + '<div class="conv-eyebrow">2 · Jornadas</div>'
    + '<div class="lg-paso"><button type="button" class="lg-mas" data-d="-1" aria-label="Una jornada menos">−</button><div class="lg-num"><b>' + f.jornadas + '</b><small>' + (f.jornadas === 1 ? 'jornada' : 'jornadas') + '</small></div><button type="button" class="lg-mas" data-d="1" aria-label="Una jornada más">+</button></div>'

    + '<div class="conv-eyebrow">3 · Cada cuánto se juega</div>'
    + '<div class="lg-dos">' + [[7, 'Cada semana'], [14, 'Cada 15 días']].map(c => '<button type="button" class="lg-opc' + (f.cada === c[0] ? ' on' : '') + '" data-cada="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'

    + '<div class="conv-eyebrow">4 · Día de juego</div>'
    + '<div class="lg-dos"><button type="button" class="lg-opc' + (f.dia === 6 ? ' on' : '') + '" data-dia="6">Sábado</button><button type="button" class="lg-opc' + (f.dia === 0 ? ' on' : '') + '" data-dia="0">Domingo</button></div>'
    + '<div class="field-row" style="margin-top:10px;"><div class="field"><label for="lgInicio">Primera jornada</label><input type="date" id="lgInicio" value="' + f.inicio + '"></div>'
    + '<div class="field"><label for="lgHora">1ª salida</label><input type="time" id="lgHora" value="' + f.hora + '"></div></div>'

    + '<div class="conv-eyebrow">5 · Campo</div>'
    + '<div class="lg-dos lg-tres">' + [['hato-verde', 'Hato Verde'], ['zaudin', 'Zaudín'], ['alternar', 'Alternar']].map(c => '<button type="button" class="lg-opc' + (f.campo === c[0] ? ' on' : '') + '" data-campo="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'

    + '<div class="conv-eyebrow">6 · Salida</div>'
    + '<div class="lg-dos">' + [['normal', 'Por un hoyo'], ['tiro', 'Al tiro']].map(c => '<button type="button" class="lg-opc' + (f.salida === c[0] ? ' on' : '') + '" data-salida="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'
    + '<div class="lg-aviso">' + (f.salida === 'tiro'
        ? 'Al tiro: todos los grupos salen a la vez, cada uno por un hoyo distinto' + (nGrupos ? ' (' + ligaHoyosPorDefecto(nGrupos).join(', ') + ')' : '') + '. Los hoyos de cada grupo se pueden cambiar luego en cada jornada.'
        : (nGrupos ? 'Salidas por el hoyo ' + (f.hoyoInicio || 1) + ' cada 10 minutos: ' + ligaHoras(f.hora, nGrupos).map(t => t.replace(/^0/, '')).join(', ') + '.' : 'Salidas por el hoyo ' + (f.hoyoInicio || 1) + ' cada 10 minutos.')) + '</div>'
    + (f.salida === 'tiro' ? '' : ligaPasoHoyo(f.hoyoInicio || 1, 'lgHoyoIni'))

    + '<div class="conv-eyebrow">Calendario <span class="lg-cuenta">toca una fecha para cambiarla</span></div>'
    + '<div class="lg-cal">' + cal.map(j => '<label class="lg-cal-f lg-cal-ed' + (f.fechas[j.n] ? ' lg-cambiada' : '') + '"><span>J' + j.n + '</span><b>' + ligaEsc(ligaFechaLarga(j.date)) + '</b><small>' + ligaCampoCorto(j.courseId) + (f.fechas[j.n] ? ' · fecha cambiada' : '') + '</small>'
        + '<input type="date" class="lg-cal-in" data-n="' + j.n + '" value="' + j.date + '" aria-label="Fecha de la jornada ' + j.n + '"></label>').join('') + '</div>'
    + (Object.keys(f.fechas).length ? '<button type="button" class="conv-link" id="lgFechasAuto">Volver a las fechas automáticas</button>' : '')
    + (f.jugadores.length ? '<div class="lg-aviso">Cada jornada es una partida con todos: ' + nGrupos + (nGrupos === 1 ? ' grupo' : ' grupos') + '. Los grupos cambian cada jornada.</div>' : '')
    + (nGrupos > MAX_GROUPS ? '<div class="lg-aviso lg-mal">Sois más de ' + (MAX_GROUPS * 4) + ': una partida de la app admite ' + MAX_GROUPS + ' grupos de 4. Quita jugadores.</div>' : '')
    + '<div class="lg-aviso">Puntos por puesto en cada jornada (por neto), como en la Fórmula 1: 25 · 18 · 15 · 12 · 10 · 8 · 6 · 4 · 2 · 1. Del 11.º en adelante y quien no juega, 0.</div>'
    + '<div class="conv-actions"><button type="button" class="conv-btn primary" id="lgCrear">Crear la liga</button>'
    + '<button type="button" class="conv-link" id="lgCancelar">Cancelar</button></div>';

  const leer = () => {
    f.nombre = document.getElementById('lgNombre').value;
    f.inicio = document.getElementById('lgInicio').value || f.inicio;
    f.hora = document.getElementById('lgHora').value || f.hora;
  };
  const repintar = () => { const y = body.closest('.conv-card').scrollTop; leer(); ligaPintarForm(); body.closest('.conv-card').scrollTop = y; };
  body.querySelectorAll('.lg-jug').forEach(b => b.addEventListener('click', ()=>{
    const n = b.dataset.n;
    f.jugadores = f.jugadores.includes(n) ? f.jugadores.filter(x => x !== n) : f.jugadores.concat(n);
    repintar();
  }));
  document.getElementById('lgTodos').addEventListener('click', ()=>{ f.jugadores = todos.slice(); repintar(); });
  document.getElementById('lgNinguno').addEventListener('click', ()=>{ f.jugadores = []; repintar(); });
  body.querySelectorAll('.lg-mas').forEach(b => b.addEventListener('click', ()=>{
    f.jornadas = Math.min(LIGA_MAX_JORNADAS, Math.max(1, f.jornadas + Number(b.dataset.d))); repintar();
  }));
  body.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', ()=>{
    f.dia = Number(b.dataset.dia); leer(); f.inicio = ligaProximoDia(f.dia); f.fechas = {}; ligaPintarForm();
  }));
  body.querySelectorAll('[data-campo]').forEach(b => b.addEventListener('click', ()=>{ f.campo = b.dataset.campo; repintar(); }));
  body.querySelectorAll('[data-cada]').forEach(b => b.addEventListener('click', ()=>{ f.cada = Number(b.dataset.cada); f.fechas = {}; repintar(); }));
  body.querySelectorAll('[data-salida]').forEach(b => b.addEventListener('click', ()=>{ f.salida = b.dataset.salida; repintar(); }));
  body.querySelectorAll('[data-hoyoini]').forEach(b => b.addEventListener('click', ()=>{ f.hoyoInicio = ligaHoyoMas(f.hoyoInicio || 1, Number(b.dataset.hoyoini)); repintar(); }));
  body.querySelectorAll('.lg-cal-in').forEach(inp => inp.addEventListener('change', ()=>{
    if(!inp.value) return;
    const n = Number(inp.dataset.n);
    if(n === 1){ f.inicio = inp.value; const d = new Date(inp.value + 'T12:00:00').getDay(); if(d === 0 || d === 6) f.dia = d; delete f.fechas[1]; }
    else f.fechas[n] = inp.value;
    repintar();
  }));
  const fa = document.getElementById('lgFechasAuto'); if(fa) fa.addEventListener('click', ()=>{ f.fechas = {}; repintar(); });
  document.getElementById('lgInicio').addEventListener('change', ()=>{
    leer();
    const d = new Date(f.inicio + 'T12:00:00').getDay();
    if(d === 0 || d === 6) f.dia = d; // si elige otro sábado/domingo, se ajusta el día de juego
    f.fechas = {};
    repintar();
  });
  document.getElementById('lgCancelar').addEventListener('click', ligaPintarLista);
  document.getElementById('lgBasesForm').addEventListener('click', ()=>{ leer(); ligaVerBases(ligaPintarForm); });
  document.getElementById('lgCrear').addEventListener('click', ligaCrear);
}

async function ligaCrear(){
  const f = ligaForm; const btn = document.getElementById('lgCrear');
  f.nombre = document.getElementById('lgNombre').value.trim();
  f.inicio = document.getElementById('lgInicio').value;
  f.hora = document.getElementById('lgHora').value || '08:40';
  if(!f.nombre){ alert('Ponle un nombre a la liga.'); document.getElementById('lgNombre').focus(); return; }
  if(f.jugadores.length < 2){ alert('Elige al menos 2 jugadores.'); return; }
  if(f.jugadores.length > MAX_GROUPS * 4){ alert('Sois más de ' + (MAX_GROUPS * 4) + ': una partida de la app admite ' + MAX_GROUPS + ' grupos de 4.'); return; }
  if(!f.inicio || f.inicio < ligaHoy()){ alert('La primera jornada tiene que ser hoy o más adelante.'); return; }
  const cal = ligaCalendario(f.inicio, f.jornadas, f.campo, f.cada, f.fechas, f.salida);
  if(cal.some(j => j.date < ligaHoy())){ alert('Hay alguna jornada con fecha pasada. Revisa el calendario.'); return; }
  if(new Set(cal.map(j => j.date)).size < cal.length){ alert('Hay dos jornadas el mismo día. Revisa el calendario.'); return; }
  if(!confirm('¿Crear «' + f.nombre + '»?\n' + f.jugadores.length + ' jugadores, ' + f.jornadas + ' jornadas.\nDel ' + ligaFechaCortaJ(cal[0].date) + ' al ' + ligaFechaCortaJ(cal[cal.length - 1].date) + '.')) return;
  const client = initSupabase(); if(!client) return;
  btn.textContent = 'Creando…'; btn.disabled = true;
  try {
    const l = { nombre: f.nombre, jugadores: f.jugadores.slice(), dia: f.dia, courseId: f.campo, hora: f.hora, cada: f.cada, hoyoInicio: f.hoyoInicio || 1, jornadas: cal };
    const { data, error } = await client.from('rounds').insert({
      code: genRoundCode(), course_id: null, course_name: null, round_name: LIGA_TAG, scoring_type: 'strokeplay', match_groups: ligaAFila(l),
    }).select('id, code, match_groups, updated_at').single();
    if(error) throw error;
    const nueva = ligaDesdeFila(data);
    ligasTodas.unshift(nueva);
    await ligaAsegurarJornadas();
    ligaForm = null;
    ligaVer(nueva.code);
  } catch(e){
    console.error(e); alert('No se pudo crear la liga. Revisa la conexión.');
    btn.textContent = 'Crear la liga'; btn.disabled = false;
  }
}

// --- Una liga: clasificación y calendario ---
async function ligaVer(code){
  const l = ligasTodas.find(x => x.code === code); if(!l) return;
  ligaAbierta = code;
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  ligaTitulo(l.nombre);
  body.innerHTML = '<div class="lg-aviso">Cargando…</div>';
  let res = {};
  try { res = await ligaResultados(l); } catch(e){ console.error(e); }
  if(ligaAbierta !== code) return;
  const hoy = ligaHoy();
  const estado = res._estado || {};

  // Clasificación: suma de puntos de todas las jornadas
  const tabla = {};
  l.jugadores.forEach(n => tabla[n] = { jugador: n, puntos: 0, jugadas: 0, victorias: 0 });
  l.jornadas.forEach(j => (res[j.n] || []).forEach(f => {
    const t = tabla[f.jugador]; if(!t) return;
    t.puntos += f.puntos; t.jugadas++; if(f.pos === 1) t.victorias++;
  }));
  const clasif = Object.values(tabla).sort((a, b) => b.puntos - a.puntos || b.victorias - a.victorias || (ligaHcp(a.jugador) ?? 99) - (ligaHcp(b.jugador) ?? 99));
  const hayPuntos = clasif.some(c => c.jugadas);

  const proxJ = ligaProxima(l);
  const orden = l.jornadas.slice().sort((a, b) => a.date.localeCompare(b.date));
  body.innerHTML = '<div class="lg-sub">' + l.jugadores.length + ' jugadores · ' + (l.cada === 14 ? 'cada 15 días' : 'cada semana') + ' · 1ª salida ' + ligaEsc(String(l.hora).replace(/^0/, '')) + '</div>'
    + '<div class="conv-eyebrow">Clasificación</div>'
    + (hayPuntos ? '' : '<div class="lg-aviso">Los puntos empiezan a contar cuando se juegue la primera jornada.</div>')
    + '<div class="lg-tabla"><div class="lg-fila lg-cab"><span>#</span><span>Jugador</span><span>Jug.</span><span>Pts</span></div>'
    + clasif.map((c, i) => '<div class="lg-fila' + (i === 0 && hayPuntos ? ' lg-lider' : '') + '"><span>' + (hayPuntos ? i + 1 : '–') + '</span><span class="lg-nom">' + ligaEsc(ligaCortoN(c.jugador)) + '</span><span>' + c.jugadas + '</span><span class="lg-pts">' + c.puntos + '</span></div>').join('')
    + '</div>'
    + '<div class="conv-eyebrow">Calendario</div>'
    + '<div class="lg-cal">' + orden.map(j => {
        const filas = res[j.n];
        const creada = !!estado[ligaCodigoJornada(l, j.n)];
        let txt;
        if(filas && filas.length) txt = '🏆 ' + ligaEsc(ligaCortoN(filas[0].jugador)) + ' · ' + filas[0].neto + ' netos';
        else if(j.date < hoy) txt = 'Sin tarjetas';
        else if(j.date === hoy) txt = creada ? 'Hoy · partida en juego' : 'Hoy';
        else txt = ligaCampoCorto(j.courseId) + ' · ' + (j.salida === 'tiro' ? 'al tiro' : 'por el ' + (j.hoyoInicio || l.hoyoInicio || 1)) + ' · ' + String(j.hora || l.hora).replace(/^0/, '');
        const prox = !filas && proxJ === j;
        return '<button type="button" class="lg-cal-f' + (prox ? ' lg-prox' : '') + '" data-n="' + j.n + '"><span>J' + j.n + '</span><b>' + ligaEsc(ligaFechaCortaJ(j.date)) + '</b><small>' + txt + '</small></button>';
      }).join('') + '</div>'
    + '<div class="lg-aviso">' + (ligaEsAdmin() ? 'Toca una jornada para cambiar su fecha, campo, hora o salida (por un hoyo o al tiro).' : 'Toca una jornada para ver su convocatoria o su partida.') + '</div>'
    + ligaBotonBases('lgBasesVer')
    + '<div class="conv-actions"><button type="button" class="conv-link" id="lgVolver">‹ Todas las ligas</button>'
    + (ligaEsAdmin() ? '<button type="button" class="conv-btn borrar" id="lgBorrar">' + (typeof icono === 'function' ? icono('papelera') : '') + ' Borrar esta liga</button>' : '') + '</div>';

  body.querySelectorAll('.lg-cal-f[data-n]').forEach(b => b.addEventListener('click', ()=>
    ligaEsAdmin() ? ligaConfigJornada(l, Number(b.dataset.n), res) : ligaAbrirJornada(l, Number(b.dataset.n), res)));
  document.getElementById('lgVolver').addEventListener('click', ligaPintarLista);
  document.getElementById('lgBasesVer').addEventListener('click', ()=> ligaVerBases(()=> ligaVer(l.code)));
  const br = document.getElementById('lgBorrar'); if(br) br.addEventListener('click', ()=> ligaBorrar(l, br));
}

// Abrir la jornada: si ya tiene partida, la partida; si no, su convocatoria (se crea si aún no existe)
async function ligaAbrirJornada(l, n, res){
  const j = l.jornadas.find(x => x.n === n); if(!j) return;
  const code = ligaCodigoJornada(l, n);
  const ronda = (res._estado || {})[code];
  if(ronda){
    const r = await joinSharedRound(ronda);
    if(r && r.ok){ ligaCerrar(); goTo(3); } else alert((r && r.msg) || 'No se pudo abrir la partida.');
    return;
  }
  if(j.date < ligaHoy()){ alert('Esa jornada ya pasó y no se jugó con la app.'); return; }
  const prox = ligaProxima(l);
  if(prox && prox.n !== n && !ligaEsAdmin()){ alert('La convocatoria de la jornada ' + n + ' se abre cuando se juegue la anterior.'); return; }
  await ligaCrearConvocatoria(l, j);
  const c = typeof convFetch === 'function' ? await convFetch(code) : null;
  if(!c){ alert('No se pudo abrir la convocatoria. Revisa la conexión.'); return; }
  conv = c;
  if(typeof convWatch === 'function') convWatch();
  try { convActivas = await convFetchActivas(); } catch(e){}
  if(typeof renderConvHome === 'function') renderConvHome();
  ligaCerrar();
  window.convVolverLiga = l.code; // la convocatoria muestra «‹ Volver a la liga»
  openConv(false);
}

// --- Configurar una jornada (solo administrador): fecha, campo, hora y salida (por el 1 o al tiro) ---
async function ligaConfigJornada(l, n, res){
  const j = l.jornadas.find(x => x.n === n); if(!j) return;
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  const code = ligaCodigoJornada(l, n);
  const ronda = (res._estado || {})[code];
  ligaTitulo('Jornada ' + n);
  body.innerHTML = '<div class="lg-aviso">Cargando…</div>';
  const c = (!ronda && typeof convFetch === 'function') ? await convFetch(code).catch(()=> null) : null;
  const G = c ? c.groups.length : ligaNumGrupos(l);
  const cfg = { date: j.date, courseId: j.courseId, hora: j.hora || l.hora, salida: j.salida || 'normal', hoyoInicio: Number(j.hoyoInicio || l.hoyoInicio) || 1,
    hoyos: ligaSalidas(l, Object.assign({}, j, { salida: 'tiro' }), G).hoyos };
  const card = body.closest('.conv-card');
  cfg.grupos = ((c && c.groups && c.groups.some(g => g && g.length)) ? c.groups : ligaGruposJornada(l, j)).map(g => (g || []).slice());
  let elegido = null; // jugador tocado para moverlo
  let verOtros = false; // lista de todos los jugadores, para meter un sustituto

  // Partidas de la jornada con sus jugadores: se tocan para moverlos de partida o quitarlos esta jornada
  const pintarPartidas = () => {
    const grupos = cfg.grupos;
    const jj = Object.assign({}, j, { hora: cfg.hora, salida: cfg.salida === 'tiro' ? 'tiro' : undefined, hoyos: cfg.hoyos, hoyoInicio: cfg.hoyoInicio });
    const sal = ligaSalidas(l, jj, grupos.length);
    const etq = i => cfg.salida === 'tiro' ? 'Hoyo ' + (sal.hoyos[i] || 1) : String(sal.times[i] || '').replace(/^0/, '') + (cfg.hoyoInicio > 1 ? ' · hoyo ' + cfg.hoyoInicio : '');
    const fuera = l.jugadores.filter(n => !grupos.some(g => g.includes(n)));
    const otros = ligaJugadoresTodos().filter(n => !l.jugadores.includes(n) && !grupos.some(g => g.includes(n)));
    const opciones = n => {
      const dentro = grupos.findIndex(g => g.includes(n));
      return '<div class="lg-mover">' + grupos.map((g, i) => i === dentro ? '' :
          '<button type="button" class="lg-mover-b" data-mover="' + i + '"' + (g.length >= 4 ? ' disabled' : '') + '>Partida ' + (i + 1) + (g.length >= 4 ? ' · llena' : '') + '</button>').join('')
        + (dentro >= 0 ? '<button type="button" class="lg-mover-b no" data-mover="-1">No juega esta jornada</button>' : '')
        + '</div>';
    };
    const jug = n => '<button type="button" class="lg-pj' + (elegido === n ? ' sel' : '') + '" data-j="' + ligaEsc(n) + '">' + ligaEsc(ligaCortoN(n))
      + (ligaHcp(n) !== null ? ' <small>' + String(ligaHcp(n)).replace('.', ',') + '</small>' : '') + '</button>';
    return '<div class="conv-eyebrow">Partidas <span class="lg-cuenta">toca un jugador para cambiarlo</span></div>'
      + '<div class="lg-partidas">' + grupos.map((g, i) =>
          '<div class="lg-partida"><div class="lg-partida-h"><b>Partida ' + (i + 1) + ' <small>' + g.length + '/4</small></b><span>' + ligaEsc(etq(i)) + '</span></div>'
          + (g.length ? '<div class="lg-pjs">' + g.map(jug).join('') + '</div>' : '<div class="lg-aviso" style="margin:4px 0 0;">Sin jugadores</div>')
          + (elegido && g.includes(elegido) ? opciones(elegido) : '')
          + '</div>').join('') + '</div>'
      + (fuera.length ? '<div class="conv-eyebrow">No juegan esta jornada <span class="lg-cuenta">toca para meterlo</span></div>'
          + '<div class="lg-partida lg-fuera"><div class="lg-pjs">' + fuera.map(jug).join('') + '</div>' + (elegido && fuera.includes(elegido) ? opciones(elegido) : '') + '</div>' : '')
      + ('<button type="button" class="conv-btn ghost lg-otros-btn" id="ljOtros">' + (verOtros ? '− Ocultar el listado de jugadores' : '＋ Meter a otro jugador (listado completo)') + '</button>'
          + (verOtros ? '<div class="lg-aviso" style="margin-top:6px;">Jugadores que no están en esta liga. Pueden jugar la jornada como sustitutos, pero no suman puntos en la liga.</div>'
              + '<div class="lg-partida lg-fuera"><div class="lg-pjs">' + (otros.length ? otros.map(jug).join('') : '<span class="lg-aviso" style="margin:0;">Todos los jugadores del club ya están en esta liga.</span>') + '</div>' + (elegido && otros.includes(elegido) ? opciones(elegido) : '') + '</div>' : ''))
      + '<div class="lg-dos" style="margin-top:8px;"><button type="button" class="lg-opc" id="ljMasPartida"' + (grupos.length >= MAX_GROUPS ? ' disabled' : '') + '>＋ Otra partida</button>'
      + '<button type="button" class="lg-opc" id="ljRepartir">Repartir de nuevo</button></div>';
  };

  const pintar = () => {
    const y = card ? card.scrollTop : 0;
    if(ronda){
      body.innerHTML = '<div class="lg-sub">' + ligaEsc(ligaFechaLarga(j.date)) + ' · ' + ligaCampoCorto(j.courseId) + '</div>'
        + '<div class="lg-aviso">La partida de esta jornada ya está creada: ya no se puede cambiar.</div>'
        + '<div class="conv-actions"><button type="button" class="conv-btn primary" id="ljAbrir">Abrir la partida</button>'
        + '<button type="button" class="conv-link" id="ljVolver">‹ Volver a la liga</button></div>';
    } else {
      const repetidos = cfg.salida === 'tiro' && new Set(cfg.hoyos).size < cfg.hoyos.length;
      body.innerHTML = '<div class="lg-sub">' + ligaEsc(l.nombre) + '</div>'
        + '<div class="field-row" style="margin-top:12px;"><div class="field"><label for="ljFecha">Fecha</label><input type="date" id="ljFecha" value="' + cfg.date + '"></div>'
        + '<div class="field"><label for="ljHora">' + (cfg.salida === 'tiro' ? 'Hora del tiro' : '1ª salida') + '</label><input type="time" id="ljHora" value="' + cfg.hora + '"></div></div>'
        + '<div class="lg-aviso" style="margin-top:0;">' + ligaEsc(ligaFechaLarga(cfg.date)) + '</div>'
        + '<div class="conv-eyebrow">Campo</div>'
        + '<div class="lg-dos">' + [['hato-verde', 'Hato Verde'], ['zaudin', 'Zaudín']].map(x => '<button type="button" class="lg-opc' + (cfg.courseId === x[0] ? ' on' : '') + '" data-c="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>'
        + '<div class="conv-eyebrow">Salida</div>'
        + '<div class="lg-dos">' + [['normal', 'Por un hoyo'], ['tiro', 'Al tiro']].map(x => '<button type="button" class="lg-opc' + (cfg.salida === x[0] ? ' on' : '') + '" data-s="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>'
        + (cfg.salida === 'tiro'
            ? '<div class="lg-aviso">Todos salen a la vez. Elige por qué hoyo sale cada grupo:</div>'
              + '<div class="lg-tiro">' + cfg.hoyos.map((h, i) => '<div class="lg-tiro-f"><div class="lg-tiro-g"><b>Grupo ' + (i + 1) + '</b>'
                  + (cfg.grupos[i] && cfg.grupos[i].length ? '<small>' + cfg.grupos[i].map(x => ligaEsc(String(x).split(/\s+/)[0])).join(', ') + '</small>' : '') + '</div>'
                  + '<button type="button" class="lg-mas lg-mas-p" data-i="' + i + '" data-d="-1" aria-label="Hoyo anterior">−</button>'
                  + '<div class="lg-tiro-h' + (cfg.hoyos.filter(x => x === h).length > 1 ? ' lg-mal' : '') + '"><small>Hoyo</small><b>' + h + '</b></div>'
                  + '<button type="button" class="lg-mas lg-mas-p" data-i="' + i + '" data-d="1" aria-label="Hoyo siguiente">+</button></div>').join('') + '</div>'
              + (repetidos ? '<div class="lg-aviso lg-mal">Hay dos grupos en el mismo hoyo.</div>' : '')
            : ligaPasoHoyo(cfg.hoyoInicio, 'ljHoyoIni')
              + '<div class="lg-aviso">Todos los grupos salen por el hoyo ' + cfg.hoyoInicio + ', uno cada 10 minutos: ' + ligaHoras(cfg.hora, cfg.grupos.length).map(t => t.replace(/^0/, '')).join(', ') + '.</div>')
        + pintarPartidas()
        + '<div class="lg-aviso lg-guardar-ayuda">' + (c
            ? 'La convocatoria ya está publicada. Si cambias algo aquí y guardas, se cambia también para todos.'
            : 'Deja aquí la jornada como quieras (fecha, hora, salida y partidas) y después publícala. Los jugadores la verán ya hecha.') + '</div>'
        + '<div class="conv-actions">'
        + (cfg.date >= ligaHoy() ? '<button type="button" class="conv-btn primary" id="ljAbrir">' + (c ? 'Guardar y ver la convocatoria' : 'Guardar y publicar la convocatoria') + '</button>' : '')
        + '<button type="button" class="conv-btn ghost" id="ljGuardar">Guardar los cambios</button>'
        + '<button type="button" class="conv-link" id="ljVolver">‹ Volver a la liga</button></div>';
    }
    if(card) card.scrollTop = y;
    const leer = () => {
      const f = document.getElementById('ljFecha'); if(f && f.value) cfg.date = f.value;
      const h = document.getElementById('ljHora'); if(h && h.value) cfg.hora = h.value;
    };
    body.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.courseId = b.dataset.c; pintar(); }));
    body.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.salida = b.dataset.s; pintar(); }));
    body.querySelectorAll('[data-hoyoini]').forEach(b => b.addEventListener('click', ()=>{ leer(); cfg.hoyoInicio = ligaHoyoMas(cfg.hoyoInicio, Number(b.dataset.hoyoini)); pintar(); }));
    body.querySelectorAll('.lg-mas-p').forEach(b => b.addEventListener('click', ()=>{
      leer(); const i = Number(b.dataset.i);
      cfg.hoyos[i] = Number(b.dataset.d) > 0 ? cfg.hoyos[i] % 18 + 1 : (cfg.hoyos[i] + 16) % 18 + 1; pintar();
    }));
    const fe = document.getElementById('ljFecha'); if(fe) fe.addEventListener('change', ()=>{ leer(); pintar(); });
    const ab = document.getElementById('ljAbrir'); if(ab) ab.addEventListener('click', async ()=>{
      leer();
      if(!ronda){ ab.textContent = 'Guardando…'; if(!(await ligaGuardarJornada(l, j, cfg, c, true))){ pintar(); return; } } // antes de abrirla, se guarda lo elegido
      ligaAbrirJornada(l, n, res);
    });
    body.querySelectorAll('.lg-pj').forEach(b => b.addEventListener('click', ()=>{ leer(); elegido = elegido === b.dataset.j ? null : b.dataset.j; pintar(); }));
    body.querySelectorAll('[data-mover]').forEach(b => b.addEventListener('click', ()=>{
      leer();
      const destino = Number(b.dataset.mover);
      cfg.grupos = cfg.grupos.map(g => g.filter(x => x !== elegido));
      if(destino >= 0 && cfg.grupos[destino].length < 4) cfg.grupos[destino].push(elegido);
      elegido = null; pintar();
    }));
    const ot = document.getElementById('ljOtros'); if(ot) ot.addEventListener('click', ()=>{ leer(); verOtros = !verOtros; if(!verOtros) elegido = null; pintar(); });
    const mp = document.getElementById('ljMasPartida'); if(mp) mp.addEventListener('click', ()=>{
      leer(); if(cfg.grupos.length < MAX_GROUPS){ cfg.grupos.push([]); cfg.hoyos = ligaSalidas(l, Object.assign({}, j, { salida: 'tiro' }), cfg.grupos.length).hoyos; } pintar();
    });
    const rp = document.getElementById('ljRepartir'); if(rp) rp.addEventListener('click', ()=>{
      leer();
      const juegan = cfg.grupos.flat();
      const ng = Math.max(1, Math.ceil(juegan.length / 4));
      const nuevos = Array.from({ length: ng }, () => []);
      juegan.slice().sort(() => Math.random() - 0.5).forEach((x, i) => nuevos[i % ng].push(x));
      cfg.grupos = nuevos; cfg.hoyos = ligaSalidas(l, Object.assign({}, j, { salida: 'tiro' }), ng).hoyos; elegido = null; pintar();
    });
    document.getElementById('ljVolver').addEventListener('click', ()=> ligaVer(l.code));
    const gu = document.getElementById('ljGuardar'); if(gu) gu.addEventListener('click', async ()=>{
      leer(); gu.textContent = 'Guardando…';
      if(await ligaGuardarJornada(l, j, cfg, c)) ligaVer(l.code); else gu.textContent = 'Guardar los cambios';
    });
  };
  pintar();
}

async function ligaGuardarJornada(l, j, cfg, c, callado){
  if(cfg.date < ligaHoy()){ alert('La fecha no puede ser anterior a hoy.'); return false; }
  if(l.jornadas.some(x => x !== j && x.date === cfg.date)){ alert('Ya hay otra jornada ese día.'); return false; }
  if(cfg.salida === 'tiro' && new Set(cfg.hoyos).size < cfg.hoyos.length){ alert('Hay dos grupos en el mismo hoyo. Cámbialo antes de guardar.'); return false; }
  if(cfg.grupos){
    const llenos = cfg.grupos.filter(g => g.length);
    if(!llenos.length){ alert('No hay ningún jugador en las partidas.'); return false; }
    cfg.grupos = llenos; // las partidas vacías no se guardan
    if(cfg.hoyos && cfg.hoyos.length > llenos.length) cfg.hoyos = cfg.hoyos.slice(0, llenos.length);
  }
  const client = initSupabase(); if(!client) return false;
  const antes = JSON.stringify(j);
  j.date = cfg.date; j.courseId = cfg.courseId;
  if(cfg.hora && cfg.hora !== l.hora) j.hora = cfg.hora; else delete j.hora;
  if(cfg.grupos) j.grupos = cfg.grupos.map(g => g.slice());
  if(cfg.salida === 'tiro'){ j.salida = 'tiro'; j.hoyos = cfg.hoyos.slice(); delete j.hoyoInicio; }
  else { delete j.salida; delete j.hoyos; if(cfg.hoyoInicio && cfg.hoyoInicio !== (l.hoyoInicio || 1)) j.hoyoInicio = cfg.hoyoInicio; else delete j.hoyoInicio; }
  const { error } = await client.from('rounds').update({ match_groups: ligaAFila(l) }).eq('id', l.id);
  if(error){ Object.assign(j, JSON.parse(antes)); console.error(error); alert('No se pudo guardar. Revisa la conexión.'); return false; }
  // Si la convocatoria ya existe (y aún no tiene partida), se cambia también, sin mover a nadie de grupo
  if(c && !c.roundCode && typeof convToGroups === 'function'){
    if(j.grupos) c.groups = j.grupos.map(g => g.slice());
    const sal = ligaSalidas(l, j, c.groups.length);
    c.date = j.date; c.courseId = j.courseId; c.times = sal.times; c.hoyos = sal.hoyos;
    const { error: e2 } = await client.from('rounds').update({ match_groups: convToGroups(c), course_name: ligaCampo(j.courseId).name, updated_at: new Date().toISOString() }).eq('id', c.id);
    if(e2){ console.error(e2); alert('La jornada se guardó, pero la convocatoria no se pudo cambiar. Inténtalo otra vez.'); }
    try { convActivas = await convFetchActivas(); if(typeof renderConvHome === 'function') renderConvHome(); } catch(e){}
  }
  return true;
}

async function ligaBorrar(l, btn){
  if(!confirm('¿Borrar la liga «' + l.nombre + '»?\nSe borran también sus convocatorias pendientes. Las partidas ya jugadas no se tocan.')) return;
  btn.textContent = 'Borrando…';
  const client = initSupabase();
  const codigos = l.jornadas.map(j => ligaCodigoJornada(l, j.n));
  const { data: convs } = client ? await client.from('rounds').select('code, match_groups').in('code', codigos) : { data: [] };
  for(const r of (convs || [])){
    const meta = ((r.match_groups || []).find(g => g && g.meta) || {}).meta || {};
    if(!meta.roundCode) await deleteSharedRound(r.code);
  }
  const res = await deleteSharedRound(l.code);
  if(!res || !res.ok){ alert((res && res.msg) || 'No se pudo borrar la liga.'); btn.textContent = 'Borrar esta liga'; return; }
  ligasTodas = ligasTodas.filter(x => x.code !== l.code);
  try { convActivas = await convFetchActivas(); if(typeof renderConvHome === 'function') renderConvHome(); } catch(e){}
  ligaPintarLista();
}

// ---------- Botón en la portada y arranque ----------
(function setupLigas(){
  const ancla = document.getElementById('hmDerbi') || document.getElementById('hmLiga');
  if(ancla && !document.getElementById('hmLigas')){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn'; b.id = 'hmLigas';
    // En la app de la liga, «Ligas» solo lo ve el administrador. En pruebas lo ven todos los que entran con cuenta.
    const enPruebas = /\/pruebas\//.test(location.pathname);
    const mostrar = () => { b.hidden = !(enPruebas || ligaEsAdmin()); };
    mostrar(); setInterval(mostrar, 3000);
    b.innerHTML = (typeof icono === 'function' ? icono('bandera') : '') + '<span>Ligas</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    ancla.parentNode.insertBefore(b, ancla);
    b.addEventListener('click', ligaAbrir);
  }
  // Prepara la convocatoria de la próxima jornada de cada liga (unos segundos después de abrir la app)
  setTimeout(async ()=>{ try { await ligaCargar(); await ligaAsegurarJornadas(); } catch(e){} }, 2500);
})();
