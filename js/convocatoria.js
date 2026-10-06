/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Convocatoria de salida: cada jugador se apunta a la hora que quiera (8:40 / 8:50) desde el
  // enlace que se manda por WhatsApp, y con un toque se crea la partida en la app con esos jugadores.
  // Se guarda como una fila más de "rounds" sin campo (course_id vacío): así no hace falta tocar la
  // base de datos y no aparece en "Últimas partidas" ni en la liga (ambas filtran por campo).
  const CONV_TAG = 'Convocatoria';
  const CONV_SLOTS = 4; // jugadores por partida
  const CONV_DEFAULT_TIMES = ['08:40', '08:50'];
  const APP_URL = 'https://carlosacedo30.github.io/acgolf/';
  let conv = null;            // { id, code, updatedAt, times:[], groups:[[names]], date, courseId, roundCode }
  let convActivas = [];       // todas las convocatorias de hoy en adelante, de la más próxima a la más lejana
  let convChannel = null;
  let convOpenPlayer = null;  // jugador con el selector de hora abierto
  let convFilter = '';

  const convEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const convTime = t => String(t || '').replace(/^0/, '');
  function convMe(){ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } }
  function convSetMe(n){ try { localStorage.setItem('golfAppConvMe', n); } catch(e){} }
  function convCourse(id){ return COURSES.find(c => c.id === id) || COURSES.find(c => c.id === 'hato-verde'); }
  function convIsoToday(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function convNextSunday(){
    const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function convLongDate(iso){
    if(!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    const s = d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Fila de la base de datos -> convocatoria
  function convFromRow(row){
    const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
    const slots = mg.filter(g => g && g.time);
    const meta = (mg.find(g => g && g.meta) || {}).meta || {};
    return {
      id: row.id, code: row.code, updatedAt: row.updated_at,
      times: slots.map(g => g.time),
      groups: slots.map(g => Array.isArray(g.players) ? g.players.slice() : []),
      hoyos: slots.map(g => Number(g.hoyo) || null), // salida al tiro: hoyo por el que sale cada grupo
      date: meta.date || '', courseId: meta.courseId || 'hato-verde', roundCode: meta.roundCode || null,
    };
  }
  function convToGroups(c){
    return c.times.map((t, i) => Object.assign({ time: t, players: c.groups[i] || [], handicaps: [], scores: {} }, (c.hoyos && c.hoyos[i]) ? { hoyo: c.hoyos[i] } : {}))
      .concat([{ players: [], handicaps: [], scores: {}, meta: { date: c.date, courseId: c.courseId, roundCode: c.roundCode } }]);
  }

  async function convFetch(code){
    const client = initSupabase(); if(!client) return null;
    let q = client.from('rounds').select('id, code, match_groups, updated_at, created_at').is('course_id', null).eq('round_name', CONV_TAG);
    q = code ? q.eq('code', code) : q.order('created_at', { ascending: false }).limit(1);
    const { data, error } = await q;
    if(error || !data || !data.length) return null;
    return convFromRow(data[0]);
  }

  // Todas las convocatorias que aún no han pasado (hoy o después), ordenadas por fecha
  async function convFetchActivas(){
    const client = initSupabase(); if(!client) return [];
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await client.from('rounds').select('id, code, match_groups, updated_at, created_at')
      .is('course_id', null).eq('round_name', CONV_TAG).gte('created_at', since);
    if(error || !data) return [];
    const hoy = convIsoToday();
    let lista = data.map(convFromRow).filter(c => c.date && c.date >= hoy && !convYaPasada(c));
    // Si la partida creada desde la convocatoria ya está terminada, la convocatoria deja de salir en portada
    const codigos = lista.filter(c => c.roundCode).map(c => c.roundCode);
    if(codigos.length){
      const { data: rondas } = await client.from('rounds').select('code, match_groups').in('code', codigos);
      const terminadas = new Set((rondas || []).filter(r => isRoundFinished(r.match_groups)).map(r => r.code));
      lista = lista.filter(c => !terminadas.has(c.roundCode));
    }
    return lista.sort((a, b) => a.date.localeCompare(b.date));
  }
  // Hoy, y ya han pasado más de 6 horas desde la última hora de salida: se da por jugada
  function convYaPasada(c){
    if(!c || c.date !== convIsoToday()) return false;
    const ultima = (c.times || []).slice().sort().pop();
    if(!ultima) return false;
    const [h, m] = ultima.split(':').map(Number);
    const fin = new Date(); fin.setHours(h + 6, m || 0, 0, 0);
    return Date.now() > fin.getTime();
  }
  // Mantiene la lista al día con la convocatoria abierta (tras apuntarse, crear la partida, etc.)
  function convSyncActiva(c){
    if(!c) return;
    const i = convActivas.findIndex(x => x.code === c.code);
    const activa = c.date && c.date >= convIsoToday() && !convYaPasada(c);
    if(i >= 0){ if(activa) convActivas[i] = c; else convActivas.splice(i, 1); }
    else if(activa){ convActivas.push(c); }
    convActivas.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Cambia la convocatoria sin pisar lo que haya hecho otro a la vez: se relee, se aplica el cambio y
  // se guarda solo si nadie la ha tocado entretanto (si no, se repite con la versión nueva).
  async function convMutate(fn){
    const client = initSupabase(); if(!client || !conv) return false;
    for(let attempt = 0; attempt < 4; attempt++){
      const fresh = await convFetch(conv.code);
      if(!fresh) return false;
      const msg = fn(fresh);
      if(msg){ conv = fresh; renderConv(); alert(msg); return false; }
      const now = new Date().toISOString();
      const { data, error } = await client.from('rounds')
        .update({ match_groups: convToGroups(fresh), updated_at: now })
        .eq('id', fresh.id).eq('updated_at', fresh.updatedAt).select('id');
      if(error){ console.error(error); break; }
      if(data && data.length){ fresh.updatedAt = now; conv = fresh; renderConv(); renderConvHome(); return true; }
    }
    alert('No se pudo guardar. Revisa la conexión e inténtalo otra vez.');
    return false;
  }

  function convSlotOf(c, name){ return c.groups.findIndex(g => g.includes(name)); }
  // Nombre de cada partida: la hora, o «Hoyo 7» si se sale al tiro
  const convAlTiro = c => !!(c && c.hoyos && c.hoyos.some(Boolean) && (new Set(c.times).size === 1 || new Set(c.hoyos).size > 1));
  function convEtq(c, i){ const h = c.hoyos && c.hoyos[i]; return h ? (convAlTiro(c) ? 'Hoyo ' + h : convTime(c.times[i]) + ' · hoyo ' + h) : convTime(c.times[i]); }

  async function convSignUp(name, slot){ // slot = -1 -> no juega
    convSetMe(name);
    convOpenPlayer = null;
    await convMutate(c => {
      c.groups = c.groups.map(g => g.filter(n => n !== name));
      if(slot >= 0){
        if(c.groups[slot].length >= CONV_SLOTS) return 'La partida de las ' + convTime(c.times[slot]) + ' ya está completa.';
        c.groups[slot].push(name);
      }
      return null;
    });
  }

  // ---------- Pintar ----------
  function renderConvHome(){
    const box = document.getElementById('convHome'); if(!box) return;
    renderConvHomeCards(box);
    if(typeof homeAhoraTitulo === 'function') homeAhoraTitulo();
  }
  function renderConvHomeCards(box){
    const isAdmin = !!getAdminKey();
    convSyncActiva(conv);
    const lista = convActivas;
    const nuevoBtn = isAdmin ? '<button type="button" class="conv-home-new" id="convHomeNew">' + icono('megafono') + ' Convocar salida por WhatsApp</button>' : '';
    if(!lista.length){
      box.innerHTML = nuevoBtn;
      const b = document.getElementById('convHomeNew'); if(b) b.addEventListener('click', ()=> openConv(true));
      return;
    }
    const me = convMe();
    const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    box.innerHTML = '<div class="conv-prox-h">' + icono('calendario') + '<span>Próximas salidas organizadas</span><b>' + lista.length + '</b></div>'
      + lista.map((c, i) => {
      const total = c.groups.reduce((a, g) => a + g.length, 0);
      const plazas = c.times.length * CONV_SLOTS;
      const mySlot = me ? convSlotOf(c, me) : -1;
      const d = new Date(c.date + 'T12:00:00');
      const cta = c.roundCode ? 'Partida creada · abrir' : (mySlot >= 0 ? 'Juegas a las ' + convTime(c.times[mySlot]) : 'Apuntarme');
      const horas = convAlTiro(c) ? 'Al tiro · ' + convTime(c.times[0]) : c.times.map((t, k) => convEtq(c, k)).join(' · ');
      return '<div class="conv-home-card conv-prox' + (i === 0 ? ' primera' : '') + '" role="button" tabindex="0" data-conv-code="' + convEsc(c.code) + '">'
        + '<div class="conv-prox-fecha"><small>' + DIAS[d.getDay()].slice(0, 3) + '</small><b>' + d.getDate() + '</b><small>' + MESES[d.getMonth()] + '</small></div>'
        + '<div class="conv-prox-info">'
        +   '<span class="conv-home-eyebrow">' + (i === 0 ? 'Próxima salida' : 'Salida organizada') + '</span>'
        +   '<div class="conv-prox-campo">' + convEsc(convCourse(c.courseId).name) + '</div>'
        +   '<div class="conv-prox-horas">' + convEsc(horas) + '</div>'
        +   '<div class="conv-prox-pie"><span class="conv-home-cta' + (mySlot >= 0 || c.roundCode ? ' ok' : '') + '">' + cta + ' ›</span><span class="conv-home-count">' + total + '/' + plazas + ' apuntados</span></div>'
        + '</div></div>';
    }).join('') + (nuevoBtn ? '<div style="margin-top:10px;">' + nuevoBtn + '</div>' : '');
    box.querySelectorAll('[data-conv-code]').forEach(card => card.addEventListener('click', ()=>{
      const c = convActivas.find(x => x.code === card.dataset.convCode);
      if(!c) return;
      if(!conv || conv.code !== c.code){ conv = c; convWatch(); }
      openConv(false);
    }));
    const b = document.getElementById('convHomeNew'); if(b) b.addEventListener('click', ()=> openConv(true));
  }

  function renderConv(){
    const body = document.getElementById('convBody'); if(!body) return;
    const isAdmin = !!getAdminKey();
    if(!conv){ body.innerHTML = '<div class="empty-hint">No hay ninguna salida convocada.</div>'; return; }
    const me = convMe();
    const course = convCourse(conv.courseId);
    let h = '<div class="conv-when">' + convEsc(convLongDate(conv.date)) + '</div>'
      + '<div class="conv-where">' + convEsc(course.name) + (convAlTiro(conv) ? ' · salida al tiro a las ' + convTime(conv.times[0]) : '') + '</div>';

    // Partidas por hora
    h += '<div class="conv-tees">' + conv.times.map((t, i) => {
      const g = conv.groups[i] || [];
      const seats = Array.from({ length: CONV_SLOTS }, (_, k) => g[k]
        ? '<div class="conv-seat filled' + (g[k] === me ? ' me' : '') + '">' + convEsc(g[k]) + '</div>'
        : '<div class="conv-seat">Libre</div>').join('');
      return '<div class="conv-tee"><div class="conv-tee-h"><span class="conv-tee-time">' + convEtq(conv, i) + '</span><span class="conv-tee-n">' + g.length + '/' + CONV_SLOTS + '</span></div>' + seats + '</div>';
    }).join('') + '</div>';

    if(conv.roundCode){
      h += '<div class="conv-created">' + icono('hecho') + ' Partida creada'
        + '<button type="button" class="conv-btn primary" id="convOpenRound">Abrir partida para apuntar</button></div>';
    }

    // Buscador de jugadores
    const names = (typeof FAVORITE_PLAYERS !== 'undefined' ? FAVORITE_PLAYERS.slice() : []);
    conv.groups.flat().forEach(n => { if(!names.includes(n)) names.push(n); }); // invitados ya apuntados
    if(convOpenPlayer && !names.includes(convOpenPlayer)) names.unshift(convOpenPlayer); // invitado que se está apuntando
    const f = convFilter.trim().toLowerCase();
    const shown = names.filter(n => !f || n.toLowerCase().includes(f))
      .sort((a, b) => (a === me ? -1 : b === me ? 1 : 0));
    h += '<div class="conv-eyebrow">¿Quién eres? Toca tu nombre</div>'
      + '<div class="search-box conv-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
      + '<input type="text" id="convFilterInput" placeholder="Busca tu nombre" autocomplete="off" value="' + convEsc(convFilter) + '"></div>'
      + '<div class="conv-list">';
    h += shown.map(n => {
      const s = convSlotOf(conv, n);
      const open = convOpenPlayer === n;
      let row = '<div class="conv-row' + (n === me ? ' me' : '') + (open ? ' open' : '') + '" data-name="' + convEsc(n) + '">'
        + '<span class="conv-row-name">' + convEsc(n) + '</span>'
        + '<span class="conv-row-tag' + (s >= 0 ? ' in' : '') + '">' + (s >= 0 ? convEtq(conv, s) : '—') + '</span></div>';
      if(open){
        row += '<div class="conv-pick">' + conv.times.map((t, i) => {
          const full = (conv.groups[i] || []).length >= CONV_SLOTS && s !== i;
          return '<button type="button" class="conv-pick-btn' + (s === i ? ' sel' : '') + '" data-slot="' + i + '"' + (full ? ' disabled' : '') + '>' + convEtq(conv, i) + (full ? ' · llena' : '') + '</button>';
        }).join('') + '<button type="button" class="conv-pick-btn no" data-slot="-1">No voy</button></div>';
      }
      return row;
    }).join('');
    if(f && !names.some(n => n.toLowerCase() === f)){
      h += '<div class="conv-row guest" data-guest="1"><span class="conv-row-name">＋ Apuntar a «' + convEsc(convFilter.trim()) + '» como invitado</span></div>';
    }
    if(!shown.length && !f) h += '<div class="empty-hint">Cargando jugadores…</div>';
    h += '</div>';

    // Acciones
    h += '<div class="conv-actions">'
      + '<a class="conv-btn wa" id="convShareWa" target="_blank" rel="noopener" href="' + convEsc(convWaHref()) + '">Enviar al grupo de WhatsApp</a>';
    if(isAdmin){
      if(!conv.roundCode) h += '<button type="button" class="conv-btn primary" id="convCreateRound">Crear la partida con los apuntados</button>';
      h += '<button type="button" class="conv-link" id="convNewBtn">Convocar otra salida</button>';
      h += '<button type="button" class="conv-btn borrar" id="convDeleteBtn">' + icono('papelera') + ' Borrar esta convocatoria</button>';
    }
    h += '</div>';
    body.innerHTML = h;
    bindConv(body);
  }

  function bindConv(body){
    const inp = document.getElementById('convFilterInput');
    if(inp) inp.addEventListener('input', ()=>{
      convFilter = inp.value; const pos = inp.selectionStart;
      renderConv();
      const again = document.getElementById('convFilterInput');
      if(again){ again.focus(); try { again.setSelectionRange(pos, pos); } catch(e){} }
    });
    body.querySelectorAll('.conv-row[data-name]').forEach(r => r.addEventListener('click', ()=>{
      convOpenPlayer = convOpenPlayer === r.dataset.name ? null : r.dataset.name; renderConv();
    }));
    const guest = body.querySelector('.conv-row[data-guest]');
    if(guest) guest.addEventListener('click', ()=>{
      const n = convFilter.trim().replace(/\s+/g, ' ');
      if(!n) return;
      convFilter = ''; convOpenPlayer = n; renderConv();
    });
    body.querySelectorAll('.conv-pick-btn').forEach(b => b.addEventListener('click', ev=>{
      ev.stopPropagation();
      if(b.disabled || !convOpenPlayer) return;
      convFilter = '';
      convSignUp(convOpenPlayer, parseInt(b.dataset.slot, 10));
    }));
    const cp = document.getElementById('convCopy'); if(cp) cp.addEventListener('click', ()=> convCopyList(cp));
    const cr = document.getElementById('convCreateRound'); if(cr) cr.addEventListener('click', ()=> convCreateRound(cr));
    const op = document.getElementById('convOpenRound'); if(op) op.addEventListener('click', convOpenRound);
    const nb = document.getElementById('convNewBtn'); if(nb) nb.addEventListener('click', renderConvNewForm);
    const db = document.getElementById('convDeleteBtn'); if(db) db.addEventListener('click', ()=> convDelete(db));
  }

  // ---------- Compartir ----------
  function convSummaryText(){
    return conv.times.map((t, i) => {
      const g = conv.groups[i] || [];
      return '⛳ ' + convEtq(conv, i) + (g.length ? ': ' + g.join(', ') : ': (libre)') + (g.length < CONV_SLOTS ? ' — quedan ' + (CONV_SLOTS - g.length) : ' — completa');
    }).join('\n');
  }
  // Enlace normal (no window.open): en el móvil con la app instalada, window.open se bloquea a menudo
  function convWaHref(){
    const link = APP_URL + '?conv=' + conv.code;
    const text = '🏌️ *Los Iscariotes* · ' + convLongDate(conv.date) + ' en ' + convCourse(conv.courseId).name + (convAlTiro(conv) ? ' · salida al tiro a las ' + convTime(conv.times[0]) : '') + '\n\n'
      + convSummaryText() + '\n\n👉 Apúntate tocando tu nombre: ' + link;
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }
  async function convCopyList(btn){
    const text = convLongDate(conv.date) + ' · ' + convCourse(conv.courseId).name + '\n' + conv.times.map((t, i) =>
      convEtq(conv, i) + '\n' + (conv.groups[i] || []).map(n => {
        const hcp = (typeof FAVORITE_HANDICAPS !== 'undefined' && FAVORITE_HANDICAPS[n] != null) ? ' (hcp ' + String(FAVORITE_HANDICAPS[n]).replace('.', ',') + ')' : '';
        return '  ' + n + hcp;
      }).join('\n')).join('\n');
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Lista copiada ✓'; }
    catch(e){ prompt('Copia la lista:', text); }
    setTimeout(()=>{ btn.textContent = 'Copiar lista (para golfdirecto)'; }, 2000);
  }

  // ---------- Crear la partida en la app ----------
  async function convCreateRound(btn){
    const client = initSupabase(); if(!client) return;
    const fresh = await convFetch(conv.code); if(fresh) conv = fresh;
    if(conv.roundCode){ renderConv(); return; }
    const withPlayers = conv.times.map((t, i) => ({ t, names: conv.groups[i] || [], hoyo: (conv.hoyos && conv.hoyos[i]) || null, etq: convEtq(conv, i) })).filter(x => x.names.length);
    if(!withPlayers.length){ alert('Todavía no se ha apuntado nadie.'); return; }
    if(!confirm(convAlTiro(conv)
      ? '¿Crear la partida al tiro con ' + withPlayers.length + ' grupos?\nCada grupo empieza en su hoyo: ' + withPlayers.map(x => x.etq.toLowerCase()).join(', ') + '.'
      : '¿Crear la partida con ' + withPlayers.map(x => x.names.length + ' a las ' + convTime(x.t)).join(' y ') + '?\nCada hora será un grupo con su propia tarjeta.')) return;
    const course = convCourse(conv.courseId);
    const groups = normalizeMatchGroups(withPlayers.map(x => ({
      hoyoSalida: x.hoyo || undefined,
      players: x.names.slice(0, 4),
      handicaps: x.names.slice(0, 4).map(n => (typeof FAVORITE_HANDICAPS !== 'undefined' && FAVORITE_HANDICAPS[n] != null) ? Number(FAVORITE_HANDICAPS[n]) : 0),
      scores: {},
    })));
    const d = new Date(conv.date + 'T12:00:00');
    const name = 'Liga · ' + d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' }).replace(',', '');
    btn.textContent = 'Creando…';
    try {
      const { data, error } = await client.from('rounds').insert({
        code: genRoundCode(), course_id: course.id, course_name: course.name, course_par: course.par,
        course_hcp: course.hcp || null, scoring_type: 'strokeplay', match_groups: groups, round_name: name,
        // la partida lleva la fecha y hora de la convocatoria aunque se cree antes (así cuenta en su semana)
        created_at: new Date(conv.date + 'T' + (withPlayers[0].t || '08:40') + ':00').toISOString(),
      }).select('code').single();
      if(error) throw error;
      await convMutate(c => { c.roundCode = data.code; return null; });
    } catch(e){
      console.error(e); alert('No se pudo crear la partida. Revisa la conexión.');
      btn.textContent = 'Crear la partida con los apuntados';
    }
  }
  async function convOpenRound(){
    const res = await joinSharedRound(conv.roundCode);
    if(res.ok){ closeConv(); goTo(3); } else alert(res.msg);
  }

  // ---------- Convocar una salida nueva (solo administrador) ----------
  function renderConvNewForm(){
    const body = document.getElementById('convBody'); if(!body) return;
    body.innerHTML = '<div class="conv-eyebrow">Nueva salida</div>'
      + '<div class="field"><label>Día</label><input type="date" id="convNewDate" value="' + convNextSunday() + '"></div>'
      + '<div class="field"><label>Campo</label><select id="convNewCourse"><option value="hato-verde">Club Hato Verde</option><option value="zaudin">Club Zaudín Golf</option></select></div>'
      + '<div class="field-row"><div class="field"><label>1ª partida</label><input type="time" id="convNewT1" value="' + CONV_DEFAULT_TIMES[0] + '"></div>'
      + '<div class="field"><label>2ª partida</label><input type="time" id="convNewT2" value="' + CONV_DEFAULT_TIMES[1] + '"></div></div>'
      + '<div class="conv-actions"><button type="button" class="conv-btn primary" id="convNewCreate">Crear convocatoria</button>'
      + (conv ? '<button type="button" class="conv-link" id="convNewCancel">Cancelar</button>' : '') + '</div>';
    document.getElementById('convNewCreate').addEventListener('click', convCreate);
    const c = document.getElementById('convNewCancel'); if(c) c.addEventListener('click', renderConv);
  }
  async function convCreate(){
    const client = initSupabase(); if(!client) return;
    const date = document.getElementById('convNewDate').value;
    const courseId = document.getElementById('convNewCourse').value;
    const times = [document.getElementById('convNewT1').value, document.getElementById('convNewT2').value].filter(Boolean);
    if(!date || !times.length){ alert('Pon el día y al menos una hora.'); return; }
    const fresh = { date, courseId, times, groups: times.map(() => []), roundCode: null };
    const btn = document.getElementById('convNewCreate'); btn.textContent = 'Creando…';
    try {
      const { data, error } = await client.from('rounds').insert({
        code: genRoundCode(), course_id: null, course_name: convCourse(courseId).name,
        round_name: CONV_TAG, scoring_type: 'stableford', match_groups: convToGroups(fresh),
      }).select('id, code, match_groups, updated_at').single();
      if(error) throw error;
      conv = convFromRow(data);
      convWatch();
      renderConv(); renderConvHome();
      history.replaceState(null, '', location.pathname + '?conv=' + conv.code);
    } catch(e){ console.error(e); alert('No se pudo crear la convocatoria. Revisa la conexión.'); btn.textContent = 'Crear convocatoria'; }
  }

  // Solo el administrador: borra la convocatoria para todos (la partida creada desde ella, si la hay, no se toca)
  async function convDelete(btn){
    if(!conv || btn.dataset.busy) return;
    if(!confirm('¿Borrar la convocatoria del ' + convLongDate(conv.date) + '?\nDesaparece para todos los jugadores y no se puede deshacer.')) return;
    btn.dataset.busy = '1'; btn.textContent = 'Borrando…';
    const res = await deleteSharedRound(conv.code);
    if(!res || !res.ok){ alert((res && res.msg) || 'No se pudo borrar la convocatoria'); delete btn.dataset.busy; btn.innerHTML = icono('papelera') + ' Borrar esta convocatoria'; return; }
    const client = initSupabase();
    if(convChannel && client){ try { client.removeChannel(convChannel); } catch(e){} convChannel = null; }
    convActivas = convActivas.filter(c => c.code !== conv.code);
    conv = convActivas[0] || null;
    if(conv) convWatch();
    closeConv();
    renderConvHome();
  }

  // ---------- Abrir / cerrar / tiempo real ----------
  function openConv(newOne){
    const ov = document.getElementById('convOverlay'); if(!ov) return;
    ov.hidden = false; convOpenPlayer = null; convFilter = '';
    if(newOne || !conv) renderConvNewForm(); else renderConv();
  }
  function closeConv(){
    const ov = document.getElementById('convOverlay'); if(ov) ov.hidden = true;
    if(/[?&]conv=/.test(location.search)) history.replaceState(null, '', location.pathname);
  }
  function convWatch(){
    const client = initSupabase(); if(!client || !conv) return;
    if(convChannel){ try { client.removeChannel(convChannel); } catch(e){} }
    convChannel = client.channel('conv-' + conv.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + conv.id }, payload => {
        if(!payload.new) return;
        conv = convFromRow(payload.new);
        const ov = document.getElementById('convOverlay');
        if(ov && !ov.hidden && !document.getElementById('convNewDate')){
          const inp = document.getElementById('convFilterInput');
          if(!(inp && document.activeElement === inp)) renderConv();
        }
        renderConvHome();
      }).subscribe();
  }

  (async function setupConvocatoria(){
    const close = document.getElementById('convClose'); if(close) close.addEventListener('click', closeConv);
    const code = (new URLSearchParams(location.search).get('conv') || '').trim().toUpperCase();
    try { convActivas = await convFetchActivas(); } catch(e){ convActivas = []; }
    try { conv = code ? await convFetch(code) : (convActivas[0] || await convFetch(null)); } catch(e){ conv = null; }
    if(conv) convWatch();
    renderConvHome();
    if(code) openConv(false);
    // al volver a la app (desde WhatsApp) se refresca
    document.addEventListener('visibilitychange', async ()=>{
      if(document.hidden) return;
      try { convActivas = await convFetchActivas(); } catch(e){}
      const fresh = await convFetch(conv ? conv.code : null).catch(()=> null);
      if(!fresh && conv){ conv = convActivas[0] || null; }
      renderConvHome();
      if(fresh){ conv = fresh; renderConvHome(); const ov = document.getElementById('convOverlay'); if(ov && !ov.hidden && !document.getElementById('convNewDate')) renderConv(); }
    });
    // la lista de jugadores de la liga llega un poco después: repintar cuando esté
    setTimeout(()=>{ const ov = document.getElementById('convOverlay'); if(ov && !ov.hidden && conv && !document.getElementById('convNewDate')) renderConv(); renderConvHome(); }, 1500);
  })();
