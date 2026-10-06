/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Especial Sevilla – Betis: torneo sevillistas contra béticos ---
  // Cada jugador se apunta en su equipo desde su móvil. Se ve el equilibrio de los equipos (número de
  // jugadores y hándicap medio) para cuadrarlos; el administrador puede pasar a alguien al otro equipo.
  // Se guarda como una fila de "rounds" sin campo (course_id vacío), igual que las convocatorias:
  // no sale en "Últimas partidas" ni cuenta para la liga.
  const DERBI_TAG = 'Especial Sevilla-Betis';
  const DERBI_EQ = {
    sevilla: { nombre: 'Sevilla', afic: 'Sevillistas', color: '#D2140A' },
    betis:   { nombre: 'Betis',   afic: 'Béticos',     color: '#0A9B4E' },
  };
  let derbi = null; // { id, code, updatedAt, sevilla:[], betis:[], roundCode, courseId }
  let derbiCampo = 'hato-verde';   // campo elegido para crear las partidas
  let derbiMarcador = null;        // { sevilla:{media,n}, betis:{media,n}, hoyos } de la partida en juego

  const derbiEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function derbiYo(){ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } }
  function derbiHcp(n){ const h = Number((typeof FAVORITE_HANDICAPS !== 'undefined' ? FAVORITE_HANDICAPS : {})[n]); return isNaN(h) ? null : h; }
  function derbiCorto(n){ const w = String(n || '').trim().split(/\s+/); return w[1] ? w[0] + ' ' + w[1] : w[0]; }

  function derbiFromRow(row){
    const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
    const de = k => ((mg.find(g => g && g.equipo === k) || {}).players || []).slice();
    const meta = (mg.find(g => g && g.meta) || {}).meta || {};
    return { id: row.id, code: row.code, updatedAt: row.updated_at, sevilla: de('sevilla'), betis: de('betis'), roundCode: meta.roundCode || null, courseId: meta.courseId || null };
  }
  function derbiToGroups(d){
    return ['sevilla', 'betis'].map(k => ({ equipo: k, players: d[k], handicaps: [], scores: {} }))
      .concat([{ players: [], handicaps: [], scores: {}, meta: { roundCode: d.roundCode || null, courseId: d.courseId || null } }]);
  }

  async function derbiFetch(){
    const client = initSupabase(); if(!client) return null;
    const { data, error } = await client.from('rounds').select('id, code, match_groups, updated_at')
      .is('course_id', null).eq('round_name', DERBI_TAG).order('created_at', { ascending: false }).limit(1);
    if(error) throw error;
    return data && data.length ? derbiFromRow(data[0]) : null;
  }
  async function derbiCrear(){
    const client = initSupabase(); if(!client) return null;
    const code = (typeof genRoundCode === 'function') ? genRoundCode() : String(Date.now());
    const { data, error } = await client.from('rounds').insert({
      code, course_id: null, course_name: null, round_name: DERBI_TAG, scoring_type: 'strokeplay',
      match_groups: derbiToGroups({ sevilla: [], betis: [] }),
    }).select('id, code, match_groups, updated_at').single();
    if(error) throw error;
    return derbiFromRow(data);
  }

  // Cambia el torneo sin pisar lo que haya hecho otro a la vez (se relee y se guarda solo si nadie lo tocó)
  async function derbiMutate(fn){
    const client = initSupabase(); if(!client) return false;
    for(let i = 0; i < 4; i++){
      let fresh = await derbiFetch();
      if(!fresh) fresh = await derbiCrear();
      if(!fresh) break;
      fn(fresh);
      const now = new Date().toISOString();
      const { data, error } = await client.from('rounds').update({ match_groups: derbiToGroups(fresh), updated_at: now })
        .eq('id', fresh.id).eq('updated_at', fresh.updatedAt).select('id');
      if(error){ console.error(error); break; }
      if(data && data.length){ fresh.updatedAt = now; derbi = fresh; derbiPintar(); return true; }
    }
    alert('No se pudo guardar. Revisa la conexión e inténtalo otra vez.');
    return false;
  }

  async function derbiApuntar(equipo, btn){
    if(derbiOcupado) return;
    let yo = derbiYo();
    if(!yo && typeof elegirQuienEres === 'function') yo = await elegirQuienEres();
    if(!yo) return;
    derbiOcupado = true;
    if(btn){ btn.classList.add('guardando'); const sp = btn.querySelector('span'); if(sp) sp.textContent = 'Guardando…'; }
    await derbiMutate(d => {
      d.sevilla = d.sevilla.filter(n => n !== yo); d.betis = d.betis.filter(n => n !== yo);
      if(equipo) d[equipo].push(yo);
    });
    derbiOcupado = false;
    derbiPintar();
  }
  async function derbiMover(nombre){ // solo administrador: pasar a un jugador al otro equipo
    const deSevilla = derbi && derbi.sevilla.includes(nombre);
    const destino = deSevilla ? 'betis' : 'sevilla';
    if(!confirm('¿Pasar a ' + derbiCorto(nombre) + ' al ' + DERBI_EQ[destino].nombre + '?')) return;
    await derbiMutate(d => {
      d.sevilla = d.sevilla.filter(n => n !== nombre); d.betis = d.betis.filter(n => n !== nombre);
      d[destino].push(nombre);
    });
  }

  async function derbiBaja(nombre){ // solo administrador: quitar a un jugador de la lista
    if(!confirm('¿Dar de baja a ' + derbiCorto(nombre) + ' del torneo?')) return;
    await derbiMutate(d => {
      d.sevilla = d.sevilla.filter(n => n !== nombre); d.betis = d.betis.filter(n => n !== nombre);
    });
  }

  // Propuesta de partidas: cada grupo con 2 sevillistas y 2 béticos de hándicap parecido (cara a cara),
  // y los que sobren completan grupos. Máximo MAX_GROUPS grupos de 4 (lo que admite una partida de la app).
  function derbiGrupos(d){
    const orden = l => l.slice().sort((a, b) => (derbiHcp(a) ?? 99) - (derbiHcp(b) ?? 99));
    const S = orden(d.sevilla), B = orden(d.betis);
    const grupos = [];
    while(S.length >= 2 && B.length >= 2) grupos.push([S.shift(), S.shift(), B.shift(), B.shift()]);
    const resto = S.concat(B);
    // primero se rellenan grupos incompletos; luego, grupos nuevos de hasta 4
    while(resto.length){
      const g = grupos.find(x => x.length < 4);
      if(g) g.push(resto.shift()); else grupos.push(resto.splice(0, 4));
    }
    // repartir mejor si el último grupo queda con 1 solo jugador
    const ult = grupos[grupos.length - 1];
    if(grupos.length > 1 && ult && ult.length === 1){ const prev = grupos[grupos.length - 2]; ult.unshift(prev.pop()); }
    return grupos;
  }
  const derbiEquipoDe = (d, n) => d.sevilla.includes(n) ? 'sevilla' : 'betis';

  async function derbiCrearPartidas(btn){
    const client = initSupabase(); if(!client) return;
    let fresh = null; try { fresh = await derbiFetch(); } catch(e){}
    if(fresh) derbi = fresh;
    if(!derbi || derbi.roundCode){ derbiPintar(); return; }
    const grupos = derbiGrupos(derbi);
    if(!grupos.length){ alert('Todavía no hay jugadores apuntados.'); return; }
    if(grupos.length > MAX_GROUPS){ alert('Sois más de ' + (MAX_GROUPS * 4) + ': una partida de la app admite ' + MAX_GROUPS + ' grupos de 4. Quita a alguien o lo hacemos en dos partidas.'); return; }
    const course = COURSES.find(c => c.id === derbiCampo) || COURSES[0];
    if(!confirm('¿Crear la partida del derbi en ' + course.name + ' con ' + grupos.length + (grupos.length === 1 ? ' grupo' : ' grupos') + '?')) return;
    const groups = normalizeMatchGroups(grupos.map(g => ({
      players: g, handicaps: g.map(n => derbiHcp(n) ?? 0), scores: {},
    })));
    btn.disabled = true; btn.textContent = 'Creando…';
    try {
      const { data, error } = await client.from('rounds').insert({
        code: genRoundCode(), course_id: course.id, course_name: course.name, course_par: course.par,
        course_hcp: course.hcp || null, scoring_type: 'strokeplay', match_groups: groups, round_name: 'Derbi Sevilla – Betis',
      }).select('code').single();
      if(error) throw error;
      await derbiMutate(d => { d.roundCode = data.code; d.courseId = course.id; });
      derbiCargarMarcador();
    } catch(e){
      console.error(e); alert('No se pudo crear la partida. Revisa la conexión.');
      btn.disabled = false; btn.textContent = 'Crear las partidas';
    }
  }

  // Marcador del derbi: media del resultado neto (respecto al par de los hoyos jugados) de cada equipo
  async function derbiCargarMarcador(){
    derbiMarcador = null;
    if(!derbi || !derbi.roundCode) return;
    const client = initSupabase(); if(!client) return;
    try {
      const { data } = await client.from('rounds').select('match_groups, course_par, course_hcp, course_id').eq('code', derbi.roundCode).single();
      if(!data) return;
      const par = data.course_par || [], si = data.course_hcp || [];
      const tot = { sevilla: [], betis: [] };
      let hoyosMax = 0;
      (data.match_groups || []).forEach(g => (g.players || []).forEach((n, i) => {
        if(!n) return;
        const sc = (g.scores || {})[i] || {}; const h = hcpCampo(Number((g.handicaps || [])[i]) || 0, { id: data.course_id, par });
        let dif = 0, jugados = 0;
        for(let k = 1; k <= 18; k++){
          const gl = parseInt(sc[k], 10); if(isNaN(gl) || gl <= 0) continue;
          dif += gl - strokesForHole(h, si[k - 1]) - par[k - 1]; jugados++;
        }
        hoyosMax = Math.max(hoyosMax, jugados);
        if(jugados) tot[derbiEquipoDe(derbi, n)].push(dif);
      }));
      const media = l => l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length * 10) / 10 : null;
      derbiMarcador = { sevilla: { media: media(tot.sevilla), n: tot.sevilla.length }, betis: { media: media(tot.betis), n: tot.betis.length }, hoyos: hoyosMax };
    } catch(e){ derbiMarcador = null; }
    derbiPintar();
  }
  async function derbiAbrirPartida(){
    const res = await joinSharedRound(derbi.roundCode);
    if(res && res.ok){ derbiCerrar(); goTo(3); } else alert((res && res.msg) || 'No se pudo abrir la partida.');
  }

  function derbiMedia(lista){
    const hs = lista.map(derbiHcp).filter(h => h !== null);
    return hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) / hs.length * 10) / 10 : null;
  }
  const derbiNum = v => v === null ? '—' : String(v).replace('.', ',');

  function derbiTexto(d){
    const linea = k => '*' + DERBI_EQ[k].nombre.toUpperCase() + '* (' + d[k].length + ')\n' + (d[k].length ? d[k].map(n => '· ' + n).join('\n') : '· (nadie aún)');
    return '⚽⛳ *ESPECIAL SEVILLA – BETIS* · Los Iscariotes\n\nSevillistas contra béticos. Apúntate en tu equipo desde la app:\n\n'
      + linea('sevilla') + '\n\n' + linea('betis') + '\n\n👉 ' + (typeof APP_URL !== 'undefined' ? APP_URL : location.origin + location.pathname);
  }

  function derbiColumna(k, yo, admin){
    const d = derbi || { sevilla: [], betis: [] };
    const eq = DERBI_EQ[k];
    const lista = d[k];
    return '<div class="dbi-col dbi-' + k + '">'
      + '<div class="dbi-col-h">' + derbiEscudo(k, 30) + '<div><b>' + eq.nombre + '</b><small>' + lista.length + (lista.length === 1 ? ' jugador' : ' jugadores') + ' · hcp medio ' + derbiNum(derbiMedia(lista)) + '</small></div></div>'
      + '<div class="dbi-lista">' + (lista.length ? lista.map(n => {
          const h = derbiHcp(n);
          const tag = admin ? 'button type="button" class="dbi-jug dbi-mover" data-n="' + derbiEsc(n) + '" aria-label="Pasar a ' + derbiEsc(n) + ' al otro equipo"' : 'div class="dbi-jug"';
          const cierre = admin ? 'button' : 'div';
          const fila = '<' + tag + '><span>' + derbiEsc(derbiCorto(n)) + (n === yo ? ' <em>(tú)</em>' : '') + '</span><b>' + (h === null ? '' : derbiNum(h)) + '</b></' + cierre + '>';
          return admin ? '<div class="dbi-fila">' + fila + '<button type="button" class="dbi-baja" data-n="' + derbiEsc(n) + '" aria-label="Dar de baja a ' + derbiEsc(n) + '">✕</button></div>' : fila;
        }).join('') : '<div class="dbi-vacio">Todavía nadie</div>') + '</div>'
      + (admin ? '<button type="button" class="dbi-add" data-eq="' + k + '">＋ Apuntar a alguien</button>' : '')
      + '</div>';
  }

  // Escudo propio de Los Iscariotes para cada bando (no es el escudo de ningún club): blasón con rayas
  // del color del equipo, banda dorada con "DERBI" y la inicial en un medallón.
  function derbiEscudo(k, tam){
    const c = k === 'sevilla' ? '#D2140A' : '#0A9B4E';
    const letra = k === 'sevilla' ? 'S' : 'B';
    const id = 'dbe' + k + Math.random().toString(36).slice(2, 7);
    let rayas = '';
    for(let i = 0; i < 7; i++) rayas += '<rect x="' + (10 + i * 12) + '" y="0" width="6" height="120" fill="' + c + '"/>';
    return '<svg class="dbi-escudo-svg" width="' + tam + '" height="' + Math.round(tam * 1.2) + '" viewBox="0 0 100 120" aria-hidden="true">'
      + '<defs><clipPath id="' + id + '"><path d="M50 4 L94 16 V58 C94 88 74 106 50 116 C26 106 6 88 6 58 V16 Z"/></clipPath></defs>'
      + '<g clip-path="url(#' + id + ')"><rect width="100" height="120" fill="#FFFFFF"/>' + rayas + '</g>'
      + '<path d="M50 4 L94 16 V58 C94 88 74 106 50 116 C26 106 6 88 6 58 V16 Z" fill="none" stroke="#D4AF37" stroke-width="5"/>'
      + '<rect x="6" y="66" width="88" height="16" fill="#0E1F3D"/><text x="50" y="78.5" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="800" font-size="11" letter-spacing="2.5" fill="#E8C45A">DERBI</text>'
      + '<circle cx="50" cy="40" r="19" fill="#0E1F3D" stroke="#D4AF37" stroke-width="3"/>'
      + '<text x="50" y="49" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="26" fill="#FFFFFF">' + letra + '</text>'
      + '</svg>';
  }

  let derbiOcupado = false;
  function derbiPintar(){
    const body = document.getElementById('derbiBody'); if(!body) return;
    const vs = document.getElementById('derbiCabVs');
    if(vs) vs.innerHTML = '<div class="dvs-eq">' + derbiEscudo('sevilla', 74) + '<span class="dvs-s">Sevilla</span></div><b>VS</b><div class="dvs-eq">' + derbiEscudo('betis', 74) + '<span class="dvs-b">Betis</span></div>';
    const yo = derbiYo();
    const admin = typeof isAdminDevice === 'function' ? isAdminDevice() : !!(typeof getAdminKey === 'function' && getAdminKey());
    const d = derbi || { sevilla: [], betis: [] };
    const miEq = yo ? (d.sevilla.includes(yo) ? 'sevilla' : d.betis.includes(yo) ? 'betis' : '') : '';
    const ns = d.sevilla.length, nb = d.betis.length;
    const ms = derbiMedia(d.sevilla), mb = derbiMedia(d.betis);
    const total = ns + nb;
    const pct = total ? Math.round(ns / total * 100) : 50;
    let consejo = '';
    if(total >= 2){
      if(Math.abs(ns - nb) >= 2) consejo = 'Hay ' + Math.abs(ns - nb) + ' jugadores más en el ' + (ns > nb ? 'Sevilla' : 'Betis') + '. Para cuadrarlo, alguien tendría que cambiarse.';
      else if(ms !== null && mb !== null && Math.abs(ms - mb) >= 3) consejo = 'El ' + (ms < mb ? 'Sevilla' : 'Betis') + ' tiene mejor hándicap medio (' + derbiNum(Math.min(ms, mb)) + ' frente a ' + derbiNum(Math.max(ms, mb)) + '). Conviene equilibrar.';
      else consejo = 'Equipos bastante igualados. ¡Así da gusto!';
    }
    const nombre = yo ? String(yo).split(/\s+/)[0] : '';

    // Paso 1: apuntarse (lo primero que se ve, con botones enormes)
    let paso;
    if(d.roundCode){
      paso = '<div class="dbi-paso"><div class="dbi-paso-t">Los equipos están cerrados</div><div class="dbi-paso-sub">Las partidas ya están hechas. ' + (miEq ? 'Juegas con el <b>' + DERBI_EQ[miEq].nombre + '</b>.' : '') + '</div></div>';
    } else if(!yo){
      paso = '<div class="dbi-paso"><div class="dbi-paso-t">Para apuntarte, primero dinos quién eres</div>'
        + '<button type="button" class="dbi-btn dbi-btn-oro" id="dbiQuien">Elegir mi nombre</button></div>';
    } else {
      paso = '<div class="dbi-paso">'
        + '<div class="dbi-paso-t">' + (miEq ? '¡Hecho, ' + derbiEsc(nombre) + '! Juegas con el ' + DERBI_EQ[miEq].nombre : 'Hola, ' + derbiEsc(nombre) + '. ¿Con quién vas?') + '</div>'
        + '<div class="dbi-paso-sub">' + (miEq ? 'Si te has equivocado, toca el otro equipo.' : 'Toca tu equipo y quedas apuntado.') + '</div>'
        + '<div class="dbi-elige">' + ['sevilla', 'betis'].map(k =>
            '<button type="button" class="dbi-elige-btn dbi-elige-' + k + (miEq === k ? ' on' : '') + (miEq && miEq !== k ? ' apagado' : '') + '" data-eq="' + k + '"' + (miEq === k ? ' aria-pressed="true"' : '') + '>'
            + derbiEscudo(k, 64) + '<b>' + DERBI_EQ[k].nombre + '</b>'
            + '<span>' + (miEq === k ? '✓ Estás aquí' : (miEq ? 'Cambiarme' : 'Me apunto')) + '</span></button>').join('') + '</div>'
        + '<div class="dbi-paso-pie">' + (miEq ? '<button type="button" class="dbi-link" id="dbiQuitar">Quitarme del torneo</button>' : '')
        + '<button type="button" class="dbi-link" id="dbiNoSoy">No soy ' + derbiEsc(nombre) + '</button></div>'
        + '</div>';
    }

    body.innerHTML = paso
      + '<div class="dbi-sec-t dbi-sec-t2">Así van los equipos</div>'
      + '<div class="dbi-balanza" aria-label="Equilibrio de los equipos">'
      + '<div class="dbi-bal-num"><b>' + ns + '</b><span>Sevilla</span></div>'
      + '<div class="dbi-bal-barra"><i style="width:' + pct + '%"></i></div>'
      + '<div class="dbi-bal-num"><b>' + nb + '</b><span>Betis</span></div>'
      + '</div>'
      + (consejo ? '<div class="dbi-consejo">' + consejo + '</div>' : '')
      + '<div class="dbi-cols">' + derbiColumna('sevilla', yo, admin && !d.roundCode) + derbiColumna('betis', yo, admin && !d.roundCode) + '</div>'
      + (admin && !d.roundCode ? '<div class="dbi-nota">Administrador: toca un nombre para pasarlo al otro equipo, ✕ para darlo de baja, o «＋ Apuntar a alguien» para apuntar a quien no lo haga desde su móvil.</div>' : '')
      + derbiSeccionPartidas(d, admin)
      + '<div class="dbi-intro"><p><b>¿Qué es esto?</b> Un torneo especial de sevillistas contra béticos. Cada uno se apunta en su equipo; con los equipos hechos se forman las partidas, cara a cara, y al final gana el equipo con mejor resultado. ¡El orgullo de la ciudad en juego!</p></div>'
      + '<div class="dbi-botones"><a class="dbi-btn dbi-btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(derbiTexto(d)) + '">Enviar los equipos al grupo</a></div>';

    body.querySelectorAll('.dbi-elige-btn').forEach(b => b.addEventListener('click', ()=>{ if(b.dataset.eq !== miEq) derbiApuntar(b.dataset.eq, b); }));
    const q = document.getElementById('dbiQuien'); if(q) q.addEventListener('click', async ()=>{ if(typeof elegirQuienEres === 'function'){ const n = await elegirQuienEres(); if(n) derbiPintar(); } });
    const ns2 = document.getElementById('dbiNoSoy'); if(ns2) ns2.addEventListener('click', async ()=>{ if(typeof elegirQuienEres === 'function'){ const n = await elegirQuienEres(); if(n) derbiPintar(); } });
    const qt = document.getElementById('dbiQuitar'); if(qt) qt.addEventListener('click', ()=>{ if(confirm('¿Quitarte del torneo?')) derbiApuntar('', qt); });
    body.querySelectorAll('.dbi-mover').forEach(b => b.addEventListener('click', ()=> derbiMover(b.dataset.n)));
    body.querySelectorAll('.dbi-baja').forEach(b => b.addEventListener('click', ()=> derbiBaja(b.dataset.n)));
    body.querySelectorAll('.dbi-add').forEach(b => b.addEventListener('click', ()=> derbiAnadirOtro(b.dataset.eq)));
    body.querySelectorAll('.dbi-campo').forEach(b => b.addEventListener('click', ()=>{ derbiCampo = b.dataset.c; derbiPintar(); }));
    const cr = document.getElementById('dbiCrear'); if(cr) cr.addEventListener('click', ()=> derbiCrearPartidas(cr));
    const ab = document.getElementById('dbiAbrir'); if(ab) ab.addEventListener('click', derbiAbrirPartida);
  }

  // Administrador: apuntar a otro jugador en un equipo (sin cambiar quién es el dueño del móvil)
  async function derbiAnadirOtro(equipo){
    if(typeof elegirQuienEres !== 'function') return;
    const n = await elegirQuienEres(true);
    if(!n) return;
    await derbiMutate(d => {
      d.sevilla = d.sevilla.filter(x => x !== n); d.betis = d.betis.filter(x => x !== n);
      d[equipo].push(n);
    });
  }

  function derbiSeccionPartidas(d, admin){
    const fila = n => '<div class="dbi-pj dbi-pj-' + derbiEquipoDe(d, n) + '"><span>' + derbiEsc(derbiCorto(n)) + '</span><b>' + derbiNum(derbiHcp(n)) + '</b></div>';
    if(d.roundCode){
      const m = derbiMarcador;
      const txt = v => v === null || v === undefined ? '—' : (v > 0 ? '+' : '') + String(v).replace('.', ',');
      let lider = '';
      if(m && m.sevilla.media !== null && m.betis.media !== null){
        lider = m.sevilla.media === m.betis.media ? 'Van empatados' : 'Gana el ' + (m.sevilla.media < m.betis.media ? 'Sevilla' : 'Betis');
      }
      return '<div class="dbi-sec"><div class="dbi-sec-t">Marcador del derbi</div>'
        + '<div class="dbi-marcador">'
        + '<div class="dbi-m dbi-m-sevilla"><span>Sevilla</span><b>' + txt(m && m.sevilla.media) + '</b></div>'
        + '<div class="dbi-m-vs">' + (lider || 'VS') + '</div>'
        + '<div class="dbi-m dbi-m-betis"><span>Betis</span><b>' + txt(m && m.betis.media) + '</b></div>'
        + '</div>'
        + '<div class="dbi-nota">Media del resultado neto de cada equipo respecto al par' + (m && m.hoyos ? ' · hasta el hoyo ' + m.hoyos : '') + '. Menos es mejor.</div>'
        + '<button type="button" class="dbi-btn dbi-btn-oro" id="dbiAbrir">Abrir la partida</button></div>';
    }
    const grupos = derbiGrupos(d);
    if(!grupos.length) return '';
    return '<div class="dbi-sec"><div class="dbi-sec-t">Propuesta de partidas</div>'
      + '<div class="dbi-nota" style="margin-top:0;">Cada grupo, cara a cara: sevillistas y béticos de hándicap parecido.</div>'
      + '<div class="dbi-partidas">' + grupos.map((g, i) => '<div class="dbi-partida"><div class="dbi-partida-t">Partida ' + (i + 1) + '</div>' + g.map(fila).join('') + '</div>').join('') + '</div>'
      + (grupos.length > MAX_GROUPS ? '<div class="dbi-consejo">Sois más de ' + (MAX_GROUPS * 4) + ': hay que hacerlo en dos partidas.</div>' : '')
      + (admin ? '<div class="dbi-campos">' + [['hato-verde', 'Hato Verde'], ['zaudin', 'Zaudín']].map(c => '<button type="button" class="dbi-campo' + (derbiCampo === c[0] ? ' on' : '') + '" data-c="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>'
        + '<button type="button" class="dbi-btn dbi-btn-oro" id="dbiCrear">Crear las partidas</button>' : '')
      + '</div>';
  }

  async function derbiAbrir(){
    const ov = document.getElementById('derbiOverlay'); if(!ov) return;
    ov.hidden = false;
    derbiPintar();
    try { derbi = await derbiFetch(); } catch(e){ /* sin conexión: se enseña vacío */ }
    derbiPintar();
    derbiCargarMarcador();
  }
  function derbiCerrar(){ const ov = document.getElementById('derbiOverlay'); if(ov) ov.hidden = true; }

  (function setupDerbi(){
    const b = document.getElementById('hmDerbi'); if(b) b.addEventListener('click', derbiAbrir);
    // En el botón del inicio, los dos escudos de Los Iscariotes
    const ins = b && b.querySelector('.derbi-insignia');
    if(ins){ ins.classList.add('con-escudos'); ins.innerHTML = derbiEscudo('sevilla', 26) + derbiEscudo('betis', 26); }
    const c = document.getElementById('derbiCerrar'); if(c) c.addEventListener('click', derbiCerrar);
    const v = document.getElementById('derbiVolver'); if(v) v.addEventListener('click', derbiCerrar);
  })();
