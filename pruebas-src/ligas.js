/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
/* PRUEBAS — Crear liga.
   El administrador elige los jugadores, cuántas jornadas, si se juega en sábado o en domingo, el campo
   y la primera hora de salida. La app calcula la fecha de cada jornada (una por semana) y prepara la
   convocatoria de cada una con todos los jugadores ya colocados en grupos de 4 (los grupos cambian cada
   jornada para que todos coincidan con todos). Cada jornada es una partida con todos los jugadores.
   Clasificación por puesto: en cada jornada, por neto, 10 · 8 · 6 · 5 · 4 · 3 · 2 · resto 1 (no jugar: 0).
   Empate en neto: gana el de hándicap más bajo.
   Se guarda como una fila de "rounds" sin campo (no sale en la liga semanal ni en "Últimas partidas").
   La convocatoria de cada jornada se crea cuando le toca (la próxima que falte), con un código fijo
   (código de la liga + J + número) para que nunca salga repetida. */

const LIGA_TAG = 'Liga de amigos';
const LIGA_PUNTOS = [10, 8, 6, 5, 4, 3, 2];
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
// Fechas de las jornadas: una por semana desde la primera
function ligaCalendario(inicio, jornadas, campo){
  const out = [];
  const d = new Date(inicio + 'T12:00:00');
  for(let n = 1; n <= jornadas; n++){
    const courseId = campo === 'alternar' ? (n % 2 ? 'hato-verde' : 'zaudin') : campo;
    out.push({ n, date: ligaIso(d), courseId });
    d.setDate(d.getDate() + 7);
  }
  return out;
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

// ---------- Base de datos ----------
function ligaDesdeFila(row){
  const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
  const meta = ((mg.find(g => g && g.meta) || {}).meta || {}).liga || {};
  return { id: row.id, code: row.code, updatedAt: row.updated_at, nombre: meta.nombre || 'Liga', jugadores: meta.jugadores || [],
    dia: meta.dia, courseId: meta.courseId, hora: meta.hora || '08:40', jornadas: meta.jornadas || [] };
}
function ligaAFila(l){
  return [{ players: [], handicaps: [], scores: {}, meta: { liga: { nombre: l.nombre, jugadores: l.jugadores, dia: l.dia, courseId: l.courseId, hora: l.hora, jornadas: l.jornadas } } }];
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
  const grupos = ligaGrupos(l.jugadores, code);
  const horas = ligaHoras(l.hora, grupos.length);
  const fila = horas.map((t, i) => ({ time: t, players: grupos[i], handicaps: [], scores: {} }))
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
  const hoy = ligaHoy();
  let nuevas = 0;
  for(const l of ligasTodas){
    const j = l.jornadas.find(x => x.date >= hoy);
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
    filas.forEach((f, i) => { f.pos = i + 1; f.puntos = LIGA_PUNTOS[i] != null ? LIGA_PUNTOS[i] : 1; });
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
    const prox = l.jornadas.find(j => j.date >= hoy);
    const jugadas = l.jornadas.filter(j => j.date < hoy).length;
    return '<button type="button" class="lg-liga" data-code="' + ligaEsc(l.code) + '">'
      + '<b>' + ligaEsc(l.nombre) + '</b>'
      + '<span>' + l.jugadores.length + ' jugadores · ' + l.jornadas.length + ' jornadas · ' + (l.dia === 0 ? 'domingos' : 'sábados') + '</span>'
      + '<span class="lg-liga-prox">' + (prox ? 'Próxima: jornada ' + prox.n + ', ' + ligaFechaCortaJ(prox.date) : (jugadas ? 'Liga terminada' : '')) + '</span>'
      + '</button>';
  }).join('');
  body.innerHTML = (tarjetas || '<div class="lg-aviso">Todavía no hay ninguna liga.</div>')
    + (ligaEsAdmin() ? '<button type="button" class="conv-btn primary lg-nueva" id="ligaNueva">＋ Crear liga</button>' : '');
  body.querySelectorAll('.lg-liga').forEach(b => b.addEventListener('click', ()=> ligaVer(b.dataset.code)));
  const n = document.getElementById('ligaNueva'); if(n) n.addEventListener('click', ()=> { ligaForm = null; ligaPintarForm(); });
}

// --- Formulario de crear liga (solo administrador) ---
function ligaPintarForm(){
  const body = document.getElementById('ligaCuerpo'); if(!body) return;
  ligaTitulo('Crear liga');
  if(!ligaForm) ligaForm = { nombre: '', jugadores: [], jornadas: 8, dia: 6, inicio: ligaProximoDia(6), campo: 'hato-verde', hora: '08:40' };
  const f = ligaForm;
  const todos = ligaJugadoresTodos();
  const cal = ligaCalendario(f.inicio, f.jornadas, f.campo);
  const nGrupos = Math.ceil(f.jugadores.length / 4);
  body.innerHTML = ''
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

    + '<div class="conv-eyebrow">3 · Día de juego</div>'
    + '<div class="lg-dos"><button type="button" class="lg-opc' + (f.dia === 6 ? ' on' : '') + '" data-dia="6">Sábado</button><button type="button" class="lg-opc' + (f.dia === 0 ? ' on' : '') + '" data-dia="0">Domingo</button></div>'
    + '<div class="field-row" style="margin-top:10px;"><div class="field"><label for="lgInicio">Primera jornada</label><input type="date" id="lgInicio" value="' + f.inicio + '"></div>'
    + '<div class="field"><label for="lgHora">1ª salida</label><input type="time" id="lgHora" value="' + f.hora + '"></div></div>'

    + '<div class="conv-eyebrow">4 · Campo</div>'
    + '<div class="lg-dos lg-tres">' + [['hato-verde', 'Hato Verde'], ['zaudin', 'Zaudín'], ['alternar', 'Alternar']].map(c => '<button type="button" class="lg-opc' + (f.campo === c[0] ? ' on' : '') + '" data-campo="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'

    + '<div class="conv-eyebrow">Calendario</div>'
    + '<div class="lg-cal">' + cal.map(j => '<div class="lg-cal-f"><span>J' + j.n + '</span><b>' + ligaEsc(ligaFechaLarga(j.date)) + '</b><small>' + ligaCampoCorto(j.courseId) + '</small></div>').join('') + '</div>'
    + (f.jugadores.length ? '<div class="lg-aviso">Cada jornada es una partida con todos: ' + nGrupos + (nGrupos === 1 ? ' grupo' : ' grupos') + ', salidas ' + ligaHoras(f.hora, nGrupos).map(t => t.replace(/^0/, '')).join(', ') + '. Los grupos cambian cada jornada.</div>' : '')
    + (nGrupos > 4 ? '<div class="lg-aviso lg-mal">Sois más de 16: una partida de la app admite 4 grupos de 4. Quita jugadores.</div>' : '')
    + '<div class="lg-aviso">Puntos por puesto en cada jornada (por neto): 10 · 8 · 6 · 5 · 4 · 3 · 2 · resto 1. Quien no juega, 0.</div>'
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
    f.dia = Number(b.dataset.dia); leer(); f.inicio = ligaProximoDia(f.dia); ligaPintarForm();
  }));
  body.querySelectorAll('[data-campo]').forEach(b => b.addEventListener('click', ()=>{ f.campo = b.dataset.campo; repintar(); }));
  document.getElementById('lgInicio').addEventListener('change', ()=>{
    leer();
    const d = new Date(f.inicio + 'T12:00:00').getDay();
    if(d === 0 || d === 6) f.dia = d; // si elige otro sábado/domingo, se ajusta el día de juego
    repintar();
  });
  document.getElementById('lgCancelar').addEventListener('click', ligaPintarLista);
  document.getElementById('lgCrear').addEventListener('click', ligaCrear);
}

async function ligaCrear(){
  const f = ligaForm; const btn = document.getElementById('lgCrear');
  f.nombre = document.getElementById('lgNombre').value.trim();
  f.inicio = document.getElementById('lgInicio').value;
  f.hora = document.getElementById('lgHora').value || '08:40';
  if(!f.nombre){ alert('Ponle un nombre a la liga.'); document.getElementById('lgNombre').focus(); return; }
  if(f.jugadores.length < 2){ alert('Elige al menos 2 jugadores.'); return; }
  if(f.jugadores.length > 16){ alert('Sois más de 16: una partida de la app admite 4 grupos de 4.'); return; }
  if(!f.inicio || f.inicio < ligaHoy()){ alert('La primera jornada tiene que ser hoy o más adelante.'); return; }
  const cal = ligaCalendario(f.inicio, f.jornadas, f.campo);
  if(!confirm('¿Crear «' + f.nombre + '»?\n' + f.jugadores.length + ' jugadores, ' + f.jornadas + ' jornadas.\nDel ' + ligaFechaCortaJ(cal[0].date) + ' al ' + ligaFechaCortaJ(cal[cal.length - 1].date) + '.')) return;
  const client = initSupabase(); if(!client) return;
  btn.textContent = 'Creando…'; btn.disabled = true;
  try {
    const l = { nombre: f.nombre, jugadores: f.jugadores.slice(), dia: f.dia, courseId: f.campo, hora: f.hora, jornadas: cal };
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

  body.innerHTML = '<div class="lg-sub">' + l.jugadores.length + ' jugadores · ' + (l.dia === 0 ? 'domingos' : 'sábados') + ' · 1ª salida ' + ligaEsc(String(l.hora).replace(/^0/, '')) + '</div>'
    + '<div class="conv-eyebrow">Clasificación</div>'
    + (hayPuntos ? '' : '<div class="lg-aviso">Los puntos empiezan a contar cuando se juegue la primera jornada.</div>')
    + '<div class="lg-tabla"><div class="lg-fila lg-cab"><span>#</span><span>Jugador</span><span>Jug.</span><span>Pts</span></div>'
    + clasif.map((c, i) => '<div class="lg-fila' + (i === 0 && hayPuntos ? ' lg-lider' : '') + '"><span>' + (hayPuntos ? i + 1 : '–') + '</span><span class="lg-nom">' + ligaEsc(ligaCortoN(c.jugador)) + '</span><span>' + c.jugadas + '</span><span class="lg-pts">' + c.puntos + '</span></div>').join('')
    + '</div>'
    + '<div class="conv-eyebrow">Calendario</div>'
    + '<div class="lg-cal">' + l.jornadas.map(j => {
        const filas = res[j.n];
        const creada = !!estado[ligaCodigoJornada(l, j.n)];
        let txt;
        if(filas && filas.length) txt = '🏆 ' + ligaEsc(ligaCortoN(filas[0].jugador)) + ' · ' + filas[0].neto + ' netos';
        else if(j.date < hoy) txt = 'Sin tarjetas';
        else if(j.date === hoy) txt = creada ? 'Hoy · partida en juego' : 'Hoy';
        else txt = ligaCampoCorto(j.courseId);
        const prox = !filas && j.date >= hoy && l.jornadas.find(x => x.date >= hoy) === j;
        return '<button type="button" class="lg-cal-f' + (prox ? ' lg-prox' : '') + '" data-n="' + j.n + '"><span>J' + j.n + '</span><b>' + ligaEsc(ligaFechaCortaJ(j.date)) + '</b><small>' + txt + '</small></button>';
      }).join('') + '</div>'
    + '<div class="lg-aviso">Toca una jornada para ver su convocatoria o su partida.</div>'
    + '<div class="conv-actions"><button type="button" class="conv-link" id="lgVolver">‹ Todas las ligas</button>'
    + (ligaEsAdmin() ? '<button type="button" class="conv-btn borrar" id="lgBorrar">' + (typeof icono === 'function' ? icono('papelera') : '') + ' Borrar esta liga</button>' : '') + '</div>';

  body.querySelectorAll('.lg-cal-f[data-n]').forEach(b => b.addEventListener('click', ()=> ligaAbrirJornada(l, Number(b.dataset.n), res)));
  document.getElementById('lgVolver').addEventListener('click', ligaPintarLista);
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
  const prox = l.jornadas.find(x => x.date >= ligaHoy());
  if(prox && prox.n !== n && !ligaEsAdmin()){ alert('La convocatoria de la jornada ' + n + ' se abre cuando se juegue la anterior.'); return; }
  await ligaCrearConvocatoria(l, j);
  const c = typeof convFetch === 'function' ? await convFetch(code) : null;
  if(!c){ alert('No se pudo abrir la convocatoria. Revisa la conexión.'); return; }
  conv = c;
  if(typeof convWatch === 'function') convWatch();
  try { convActivas = await convFetchActivas(); } catch(e){}
  if(typeof renderConvHome === 'function') renderConvHome();
  ligaCerrar();
  openConv(false);
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
    b.innerHTML = (typeof icono === 'function' ? icono('bandera') : '') + '<span>Ligas</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    ancla.parentNode.insertBefore(b, ancla);
    b.addEventListener('click', ligaAbrir);
  }
  // Prepara la convocatoria de la próxima jornada de cada liga (unos segundos después de abrir la app)
  setTimeout(async ()=>{ try { await ligaCargar(); await ligaAsegurarJornadas(); } catch(e){} }, 2500);
})();
