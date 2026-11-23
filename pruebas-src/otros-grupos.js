/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Avisos de TODOS mis grupos en el Inicio (norma de Carlos, 17-nov-2026).
// Tarjetas de los otros grupos donde juega la persona: partidas organizadas, ligas y Ryder.
// ORDEN CRONOLÓGICO (norma de Carlos, 17-nov-2026): estas tarjetas y las del grupo activo van en UNA sola lista, de la fecha más próxima a la más lejana.
// · Los datos vienen de la función de la base «avisos_otros_grupos» (solo lectura, solo de sus grupos).
// · Cada aviso lleva la etiqueta con el nombre del grupo. Si solo juega en un grupo, el bloque no sale.
// · Al tocar una partida o una liga, la app cambia a ese grupo («cambiar_grupo», como «Cambiar de grupo»). La Ryder se abre directamente.
// · Las tarjetas por entregar NO se repiten aquí (ya hay una norma estricta de cierre).
(function(){
  'use strict';
  const ahora = document.getElementById('homeAhora');
  if(!ahora || typeof initSupabase !== 'function') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fecha = iso => { const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '' : DIAS[d.getDay()] + ' ' + d.getDate(); };
  const metaDe = mg => ((Array.isArray(mg) ? mg : []).find(g => g && g.meta) || {}).meta || {};

  // Las tarjetas ajenas viven DENTRO de #convHome, mezcladas con las del grupo activo y ordenadas por fecha y hora
  const nodos = { otros: [], ryder: [], partido: [] };
  let codigosConPartido = new Set();   // Ryders donde ya tengo mi partido: no se repite «Juegas la Ryder»
  const nodo = (html, fecha, hora) => { const t = document.createElement('template'); t.innerHTML = html.trim(); const n = t.content.firstChild; if(fecha) n.dataset.fecha = fecha; if(hora) n.dataset.hora = hora; return n; };
  const esFecha = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
  // Si una tarjeta propia viene sin fecha (versión guardada antigua), se saca del texto «Domingo 22»: el próximo día con ese nombre y número
  function fechaDeTexto(n){
    const m = /(Domingo|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado)\s+(\d{1,2})/.exec((n.querySelector('.ip-cuando') || n).textContent || ''); if(!m) return '';
    const d = new Date(); d.setHours(12, 0, 0, 0);
    for(let i = 0; i < 400; i++){ if(DIAS[d.getDay()] === m[1] && d.getDate() === +m[2]) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); d.setDate(d.getDate() + 1); }
    return '';
  }
  const clave = n => { if(!n.dataset.fecha && n.classList.contains('ip-card')){ const f = fechaDeTexto(n); if(f) n.dataset.fecha = f; } return n.dataset.fecha ? n.dataset.fecha + ' ' + (n.dataset.hora || '00:00') : '9999-99-99'; };   // sin fecha: al final
  let obs = null;
  function colocar(){
    const box = document.getElementById('convHome'); if(!box) return;
    const todos = Array.from(box.querySelectorAll(':scope > .ip-card')).concat(nodos.otros, nodos.ryder, nodos.partido);
    todos.sort((a, b) => clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0);
    const ya = Array.from(box.children).filter(n => todos.indexOf(n) >= 0);
    if(ya.length === todos.length && ya.every((n, i) => n === todos[i]) && todos.length && box.lastElementChild === todos[todos.length - 1]) return;
    if(obs) obs.disconnect();
    todos.forEach(n => box.appendChild(n));
    if(obs) obs.observe(box, { childList: true });
  }
  (function vigilar(n){
    const box = document.getElementById('convHome');
    if(!box){ if(n < 40) setTimeout(() => vigilar(n + 1), 500); return; }
    obs = new MutationObserver(colocar); obs.observe(box, { childList: true }); colocar();
  })(0);

  // Nombre de la Ryder: el que puso el organizador o, si no hay, «Equipo 1 – Equipo 2»
  function tituloRyder(mg){
    const meta = metaDe(mg), eq = (Array.isArray(mg) ? mg : []).filter(g => g && g.equipo);
    return meta.titulo || (eq.length >= 2 ? eq[0].nombre + ' – ' + eq[1].nombre : 'Ryder Cup');
  }
  // Convierte cada fila de la base en un aviso (o nada, si ya no vale)
  // Cada jornada de una liga se organiza como una partida con el código «CODIGOLIGA» + «J» + número de jornada:
  // si ya está organizada, sale UNA sola tarjeta (la partida, con el nombre de la liga) y no otra de «Próxima jornada».
  let ligasPorCodigo = {}, codigosPartida = new Set();
  function aviso(f){
    const meta = metaDe(f.match_groups), yo = norm(f.jugador);
    if(f.tipo === 'convocatoria'){
      if(!meta.date || meta.date < hoy()) return null;
      const slots = (f.match_groups || []).filter(g => g && !g.meta);
      const apuntados = slots.reduce((a, g) => a + (Array.isArray(g.players) ? g.players.length : 0), 0);
      const estoy = slots.some(g => (g.players || []).some(n => norm(n) === yo));
      const horas = slots.map(g => g.time).filter(Boolean).sort();
      const mj = /^(.*)J(\d+)$/.exec(f.code || ''), lg = mj && ligasPorCodigo[mj[1]];
      return { orden: meta.date, hora: horas[0] ? horas[0].slice(0, 5) : '', tipo: lg ? lg + ' · jornada ' + mj[2] : 'Partida organizada', cuando: fecha(meta.date) + (horas[0] ? ' · ' + horas[0].slice(0, 5) : ''),
               pie: apuntados + (apuntados === 1 ? ' apuntado' : ' apuntados') + (estoy ? ' · estás apuntado' : ''), boton: estoy ? '' : 'Ver y apuntarme', f };
    }
    if(f.tipo === 'liga'){
      const l = meta.liga || {};
      const jornadas = (l.jornadas || []).filter(j => j && j.date).sort((a, b) => a.date.localeCompare(b.date));
      const prox = jornadas.find(j => j.date >= hoy());
      if(!prox) return null;                                   // liga terminada: no hay nada que avisar
      if(codigosPartida.has(f.code + 'J' + prox.n)) return null; // esa jornada ya sale como partida organizada
      if(Array.isArray(l.jugadores) && l.jugadores.length && !l.jugadores.some(n => norm(typeof n === 'string' ? n : n && n.nombre) === yo)) return null;
      return { orden: prox.date, tipo: 'Liga', titulo: l.nombre || 'Liga', sub: 'Próxima jornada: ' + fecha(prox.date) + ' · jornada ' + prox.n + ' de ' + jornadas.length, f };
    }
    if(f.tipo === 'ryder'){
      if(meta.cerrada) return null;
      // si ya estoy apuntado sale arriba como «Juegas la Ryder»: no se repite aquí (norma: un evento, una tarjeta)
      if((f.match_groups || []).some(g => g && g.equipo && (g.players || []).some(n => norm(n) === yo))) return null;
      return { orden: '0', tipo: 'Ryder', titulo: tituloRyder(f.match_groups), sub: 'Inscripción abierta · apúntate a tu equipo', f };
    }
    return null;
  }

  function pintar(lista){
    ligasPorCodigo = {}; codigosPartida = new Set();
    lista.forEach(f => { if(f.tipo === 'liga') ligasPorCodigo[f.code] = (metaDe(f.match_groups).liga || {}).nombre || 'Liga'; });
    lista.forEach(f => { if(f.tipo === 'convocatoria' && (metaDe(f.match_groups).date || '') >= hoy()) codigosPartida.add(f.code); });
    const avisos = lista.map(aviso).filter(Boolean).sort((a, b) => a.orden.localeCompare(b.orden));
    avisos.forEach(a => { a.nodo = null; });
    nodos.otros.forEach(n => n.remove());
    nodos.otros = avisos.map((a, i) => {
      const etq = '<span class="og-etq">' + esc(a.f.grupo) + '</span>';
      const cuerpo = a.cuando
        ? '<span class="og-k">' + esc(a.tipo) + '</span><span class="og-cuando">' + esc(a.cuando) + '</span><span class="og-sub">' + esc(a.pie) + '</span>' + (a.boton ? '<span class="og-btn">' + esc(a.boton) + '</span>' : '')
        : '<span class="og-tit">' + esc(a.titulo) + '</span><span class="og-sub">' + esc(a.sub) + '</span>';
      const n = nodo('<button type="button" class="og-card og-otro' + (a.cuando ? ' og-conv' : '') + '">' + etq + cuerpo + (a.cuando ? '' : '<i class="in-fl" aria-hidden="true"></i>') + '</button>', esFecha(a.orden) ? a.orden : '', a.hora);
      n._aviso = a; return n;
    });
    colocar();
  }

  // ---- «Juegas la Ryder»: aviso arriba del todo si estoy apuntado en la lista de una Ryder (de cualquiera de mis grupos) ----
  function pintarRyder(lista){
    const yo = norm(window.miPerfil && window.miPerfil.player_name);
    const items = lista.map(f => {
      const meta = metaDe(f.match_groups); if(meta.fecha && meta.fecha < hoy()) return null;
      if(codigosConPartido.has(f.code)) return null;
      const eq = (f.match_groups || []).filter(g => g && g.equipo);
      const mio = eq.find(g => (g.players || []).some(n => norm(n) === yo)); if(!mio) return null;
      const cuando = meta.fecha ? fecha(meta.fecha) + ' ' + new Date(meta.fecha + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long' }) : 'Fecha por confirmar';
      return { code: f.code, fecha: meta.fecha || '', titulo: tituloRyder(f.match_groups), equipo: mio.nombre, color: mio.color || '#C6F24E', sub: 'Vas con el ' + mio.nombre + ' · ' + cuando + (meta.campo ? ' · ' + meta.campo : '') };
    }).filter(Boolean);
    nodos.ryder.forEach(n => n.remove());
    nodos.ryder = items.map(a => {
      const n = nodo('<button type="button" class="og-card og-juego"><span class="og-etq">Juegas la Ryder</span><span class="og-tit">' + esc(a.titulo) + '</span><span class="og-sub"><i class="og-pt" style="background:' + esc(a.color) + '"></i>' + esc(a.sub) + '</span><i class="in-fl" aria-hidden="true"></i></button>', esFecha(a.fecha) ? a.fecha : '', '');
      n._ryder = a; return n;
    });
    colocar();
  }

  (function(){
    const box = document.getElementById('convHome') || ahora;
    box.addEventListener('click', async ev => {
      const b = ev.target.closest('.og-card'); if(!b) return;
      if(b._partido){ if(window.acgolfRyder && window.acgolfRyder.abrirPartido) window.acgolfRyder.abrirPartido(b._partido.code, b._partido.i); return; }
      if(b._ryder){ if(window.acgolfRyderIns && window.acgolfRyderIns.abrirCodigo) window.acgolfRyderIns.abrirCodigo(b._ryder.code); return; }
      const a = b._aviso; if(!a) return;
      if(a.f.tipo === 'ryder' && window.acgolfRyderIns && window.acgolfRyderIns.abrirCodigo){ window.acgolfRyderIns.abrirCodigo(a.f.code); return; }
      b.disabled = true;
      const { error } = await initSupabase().rpc('cambiar_grupo', { p_grupo: a.f.grupo_id });
      if(error){ b.disabled = false; alert('No se pudo cambiar de grupo. Revisa la conexión e inténtalo otra vez.'); return; }
      location.reload();
    });
  })();

  // ---- «Tu partido de la Ryder»: si la Ryder ya tiene partidos y juego en alguno, sale mi partido con un toque para abrirlo ----
  const MODO = { foursome: 'Foursome', fourball: 'Fourball', individual: 'Individual' };
  function pintarPartidos(filas){
    const yo = norm(window.miPerfil && window.miPerfil.player_name);
    const items = []; codigosConPartido = new Set();
    (filas || []).forEach(f => {
      const mg = Array.isArray(f.match_groups) ? f.match_groups : [], meta = metaDe(mg);
      const dia = meta.date || meta.fecha || ''; if(dia && dia < hoy()) return;
      mg.filter(g => g && g.duelo).forEach((d, i) => {
        const a = d.a || [], b = d.b || [];
        const conmigo = a.some(n => norm(n) === yo) ? a : b.some(n => norm(n) === yo) ? b : null; if(!conmigo) return;
        const rival = conmigo === a ? b : a;
        const con = conmigo.filter(n => norm(n) !== yo);
        const campo = (typeof COURSES !== 'undefined' ? COURSES : []).find(c => c.id === meta.courseId);
        codigosConPartido.add(f.code);
        items.push({ code: f.code, i, fecha: dia, titulo: (meta.titulo || 'Ryder Cup') + ' · ' + (MODO[d.tipo] || 'Partido'),
          lineas: '<b>Tú' + (con.length ? ' y ' + con.map(esc).join(' y ') : '') + '</b> contra <b>' + rival.map(esc).join(' y ') + '</b>',
          sub: (dia ? fecha(dia) + ' ' + new Date(dia + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long' }) : 'Fecha por confirmar') + (campo ? ' · ' + campo.name : '') });
      });
    });
    nodos.partido.forEach(n => n.remove());
    nodos.partido = items.map(a => {
      const n = nodo('<button type="button" class="og-card og-juego og-partido"><span class="og-etq">Tu partido de la Ryder</span><span class="og-tit">' + esc(a.titulo) + '</span><span class="og-vs">' + a.lineas + '</span><span class="og-sub">' + esc(a.sub) + '</span><span class="og-ir">ANOTAR MI PARTIDO</span></button>', a.fecha);
      n._partido = a; return n;
    });
    colocar();
  }

  async function cargar(){
    if(document.documentElement.classList.contains('es-invitado')) return;
    const client = initSupabase();
    try { const r = await client.rpc('avisos_otros_grupos'); if(!r.error) pintar(Array.isArray(r.data) ? r.data : []); } catch(e){}
    try { const r = await client.from('rounds').select('code, match_groups').eq('round_name', 'Ryder Cup').order('created_at', { ascending: false }).limit(5); if(!r.error) pintarPartidos(r.data || []); } catch(e){}
    try { const r = await client.rpc('ryder_mia'); if(!r.error) pintarRyder(Array.isArray(r.data) ? r.data : []); } catch(e){}
  }
  (function esperar(n){
    if(window.miPerfil){ cargar(); return; }
    if(n < 120) setTimeout(() => esperar(n + 1), 500);
  })(0);
  // Al volver al Inicio se repasa (alguien puede haber organizado una partida)
  if(typeof window.goTo === 'function'){
    const ir = window.goTo;
    window.goTo = function(n){ const r = ir.apply(this, arguments); if(n === 0) setTimeout(cargar, 400); return r; };
  }
})();
