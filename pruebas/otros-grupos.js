/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Avisos de TODOS mis grupos en el Inicio (norma de Carlos, 17-nov-2026).
// Bloque «Tus otros grupos»: partidas organizadas, ligas y Ryder de los otros grupos donde juega la persona.
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

  const sec = document.createElement('div'); sec.className = 'in-sec og-sec'; sec.textContent = 'Tus otros grupos'; sec.hidden = true;
  const caja = document.createElement('div'); caja.className = 'og-caja'; caja.id = 'ogCaja'; caja.hidden = true;
  ahora.appendChild(sec); ahora.appendChild(caja);

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
      return { orden: meta.date, tipo: lg ? lg + ' · jornada ' + mj[2] : 'Partida organizada', cuando: fecha(meta.date) + (horas[0] ? ' · ' + horas[0].slice(0, 5) : ''),
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
      return { orden: '0', tipo: 'Ryder', titulo: meta.titulo || 'Ryder Cup', sub: 'Inscripción abierta · apúntate a tu equipo', f };
    }
    return null;
  }

  function pintar(lista){
    ligasPorCodigo = {}; codigosPartida = new Set();
    lista.forEach(f => { if(f.tipo === 'liga') ligasPorCodigo[f.code] = (metaDe(f.match_groups).liga || {}).nombre || 'Liga'; });
    lista.forEach(f => { if(f.tipo === 'convocatoria' && (metaDe(f.match_groups).date || '') >= hoy()) codigosPartida.add(f.code); });
    const avisos = lista.map(aviso).filter(Boolean).sort((a, b) => a.orden.localeCompare(b.orden));
    const html = avisos.map((a, i) => {
      const etq = '<span class="og-etq">' + esc(a.f.grupo) + '</span>';
      const cuerpo = a.cuando
        ? '<span class="og-k">' + esc(a.tipo) + '</span><span class="og-cuando">' + esc(a.cuando) + '</span><span class="og-sub">' + esc(a.pie) + '</span>' + (a.boton ? '<span class="og-btn">' + esc(a.boton) + '</span>' : '')
        : '<span class="og-tit">' + esc(a.titulo) + '</span><span class="og-sub">' + esc(a.sub) + '</span>';
      return '<button type="button" class="og-card' + (a.cuando ? ' og-conv' : '') + '" data-i="' + i + '">' + etq + cuerpo + (a.cuando ? '' : '<i class="in-fl" aria-hidden="true"></i>') + '</button>';
    }).join('');
    if(caja.dataset.html !== html){ caja.innerHTML = html; caja.dataset.html = html; }
    caja._avisos = avisos;
    sec.hidden = caja.hidden = !avisos.length;
  }

  caja.addEventListener('click', async ev => {
    const b = ev.target.closest('.og-card'); if(!b) return;
    const a = (caja._avisos || [])[+b.dataset.i]; if(!a) return;
    if(a.f.tipo === 'ryder' && window.acgolfRyderIns && window.acgolfRyderIns.abrirCodigo){ window.acgolfRyderIns.abrirCodigo(a.f.code); return; }
    b.disabled = true;
    const { error } = await initSupabase().rpc('cambiar_grupo', { p_grupo: a.f.grupo_id });
    if(error){ b.disabled = false; alert('No se pudo cambiar de grupo. Revisa la conexión e inténtalo otra vez.'); return; }
    location.reload();
  });

  async function cargar(){
    if(document.documentElement.classList.contains('es-invitado')) return;
    try { const r = await initSupabase().rpc('avisos_otros_grupos'); if(!r.error) pintar(Array.isArray(r.data) ? r.data : []); } catch(e){}
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
