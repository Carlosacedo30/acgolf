/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Al terminar la partida (acgolf.es): resumen de cada jugador en vez del diagnóstico ---
// Un botón grande por jugador. Al tocarlo: su tarjeta entera, si le cambia el hándicap,
// las medallas que ha conseguido y cómo va en la clasificación de la semana y del mes.
(function(){
  if(typeof goTo !== 'function') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clave = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };
  const coma = n => String(Math.round(Number(n) * 10) / 10).replace('.', ',');
  let elegido = null;     // índice del jugador abierto (null = la lista de botones)
  let datos = null, cargandoDatos = null;

  const golpes = (h, i) => { const x = document.querySelector('.golpes-input[data-hole="' + h + '"][data-player-index="' + i + '"]'); const v = x ? parseInt(x.value, 10) : NaN; return isNaN(v) || v <= 0 ? null : v; };
  const parDe = h => { const x = document.querySelector('.golpes-input[data-hole="' + h + '"]'); return x ? parseInt(x.dataset.par, 10) : null; };
  const siDe = h => { const x = document.querySelector('.golpes-input[data-hole="' + h + '"]'); return x ? parseInt(x.dataset.strokeIndex, 10) : null; };

  // Golpes, neto y puntos de la partida de un jugador del grupo activo
  function cuentas(i){
    const hcp = Number((playerHandicaps || [])[i]) || 0;
    let bruto = 0, neto = 0, pts = 0, n = 0, par = 0;
    for(let h = 1; h <= 18; h++){
      const v = golpes(h, i), p = parDe(h), si = siDe(h);
      if(v == null || p == null) continue;
      const rec = (typeof strokesForHole === 'function' && si != null) ? strokesForHole(typeof hcpJuego === 'function' ? hcpJuego(i) : hcp, si) : 0;
      bruto += v; par += p; n++;
      neto += v - rec;
      pts += Math.max(0, 2 + p - (v - rec));
    }
    return { hcp, bruto, neto, pts, n, par };
  }

  // Lo que viene de la base de datos: hándicaps, historial, medallas y liga del mes
  async function cargar(){
    const client = initSupabase();
    if(!client) return null;
    const hoy = new Date();
    const [lp, hist, med, liga] = await Promise.all([
      client.from('league_players').select('name, hcp'),
      client.from('handicap_historial').select('player_name, hcp_antes, hcp_despues, cambiado_en').gte('cambiado_en', new Date(Date.now() - 20 * 3600 * 1000).toISOString()).order('cambiado_en', { ascending: true }),
      client.rpc('medallas_liga'),
      client.rpc('liga_mes', { p_anio: hoy.getFullYear(), p_mes: hoy.getMonth() + 1 }),
    ]);
    return { jugadores: lp.data || [], historial: hist.data || [], medallas: med.data || null, liga: liga.data || null };
  }
  function pedirDatos(forzar){
    if(forzar || !cargandoDatos) cargandoDatos = cargar().then(d => { datos = d; pintar(); return d; }).catch(() => { datos = { error: true }; pintar(); });
    return cargandoDatos;
  }

  // ---------- Pantalla ----------
  function caja(){
    const scr = document.querySelector('.screen[data-screen="4"] .screen-content');
    if(!scr) return null;
    let b = document.getElementById('rjBox');
    if(!b){
      b = document.createElement('section'); b.id = 'rjBox'; b.className = 'rj-box';
      const ref = document.getElementById('s4ShareSection');
      if(ref) ref.before(b); else scr.appendChild(b);
    }
    const h1 = scr.querySelector('.app-bar h1'); if(h1) h1.textContent = 'Resumen de la partida';
    return b;
  }

  // Las cervezas: paga la mitad de abajo de la clasificación (si son impares, el del medio se libra)
  function cervezas(){
    if(typeof computeStandings !== 'function' || scoringType === 'matchplay') return '';
    const jug = computeStandings().filter(s => s.holesFilled > 0);
    const n = Math.floor(jug.length / 2);
    if(!n) return '';
    const pagan = jug.slice(jug.length - n);
    const libra = jug.length % 2 ? jug[n] : null;
    const nom = s => String(s.name).includes(' / ') ? nombrePareja(String(s.name).split(' / ')) : corto(s.name);
    const lista = pagan.map(nom);
    const y = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0];
    const frases = ['La barra os espera 🍻', 'Que no se calienten 🧊', 'Hoy el green fue cruel, la caña no 😄', 'Pagar también es de caballeros ⛳'];
    const frase = frases[(new Date().getDate()) % frases.length];
    const texto = '🍺 *HOY PAGAN LAS CERVEZAS*\n' + lista.map(n => '• ' + n).join('\n')
      + (libra ? '\n\n😅 Se libra por los pelos: ' + nom(libra) : '') + '\n\n' + frase + '\n' + location.origin + '/';
    return '<div class="rj-birra"><div class="rj-birra-t">🍺 Hoy pagan las cervezas</div>'
      + '<div class="rj-birra-n">' + esc(y(lista)) + '</div>'
      + (libra ? '<div class="rj-birra-l">Se libra por los pelos: <b>' + esc(nom(libra)) + '</b></div>' : '')
      + '<div class="rj-birra-f">' + esc(frase) + '</div>'
      + '<a class="rj-birra-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texto) + '">Avisar al grupo por WhatsApp</a></div>';
  }

  function botones(){
    const lista = players.map((n, i) => ({ n, i, c: cuentas(i) })).filter(x => x.n);
    const sf = scoringType === 'stableford';
    return cervezas() + '<div class="rj-t">Toca un jugador para ver su resumen</div><div class="rj-botones">'
      + lista.map(x => {
          const dif = x.c.n ? x.c.neto - x.c.par : null;
          const res = !x.c.n ? 'Sin golpes' : sf ? x.c.pts + ' puntos' : x.c.bruto + ' golpes · ' + (dif === 0 ? 'par' : (dif > 0 ? '+' : '') + dif + ' neto');
          return '<button type="button" class="rj-jug" data-i="' + x.i + '"><b>' + esc(corto(x.n)) + '</b><span>' + esc(res) + '</span><i>Ver resumen ›</i></button>';
        }).join('') + '</div>';
  }

  function seccion(titulo, cuerpo){ return '<div class="rj-sec"><div class="rj-sec-t">' + titulo + '</div>' + cuerpo + '</div>'; }

  function detalle(i){
    const nombre = players[i];
    const c = cuentas(i);
    const sf = scoringType === 'stableford';
    const dif = c.neto - c.par;
    let h = '<div class="rj-cab"><button type="button" class="rj-volver" id="rjVolver">‹ Todos</button>'
      + '<div><div class="rj-nom">' + esc(nombre) + '</div><div class="rj-sub">HCP de juego ' + coma(c.hcp) + '</div></div></div>';

    // Resultado y tarjeta entera
    h += '<div class="rj-cifras">'
      + '<div><b>' + (c.n ? c.bruto : '—') + '</b><span>golpes</span></div>'
      + '<div><b>' + (c.n ? c.neto : '—') + '</b><span>neto</span></div>'
      + '<div><b class="' + (c.n && dif < 0 ? 'bajo' : '') + '">' + (!c.n ? '—' : dif === 0 ? 'PAR' : (dif > 0 ? '+' : '') + dif) + '</b><span>al par</span></div>'
      + '<div><b>' + (c.n ? c.pts : '—') + '</b><span>puntos</span></div></div>';
    if(typeof window.tbBloque === 'function') h += seccion('Su tarjeta', window.tbBloque(i, 1, 0) + window.tbBloque(i, 10, 0));

    if(!datos){ h += '<p class="rj-p">Cargando hándicap, medallas y clasificación…</p>'; return h; }
    if(datos.error){ h += '<p class="rj-p">No se ha podido cargar el resto. Revisa la cobertura.</p><button type="button" class="rj-otra" id="rjReintentar">Probar otra vez</button>'; return h; }

    // Hándicap
    const k = clave(nombre);
    const lp = datos.jugadores.find(x => clave(x.name) === k);
    const cambios = datos.historial.filter(x => clave(x.player_name) === k);
    const antes = cambios.length ? Number(cambios[0].hcp_antes) : c.hcp;
    const ahora = lp && lp.hcp != null ? Number(lp.hcp) : (cambios.length ? Number(cambios[cambios.length - 1].hcp_despues) : null);
    let hcpTxt;
    if(ahora == null) hcpTxt = '<p class="rj-p">No juega la liga: su hándicap no se calcula aquí.</p>';
    else if(Math.abs(ahora - antes) < 0.05) hcpTxt = '<div class="rj-hcp"><b>' + coma(ahora) + '</b><span>Se queda igual</span></div>';
    else hcpTxt = '<div class="rj-hcp ' + (ahora < antes ? 'baja' : 'sube') + '"><b>' + coma(antes) + ' → ' + coma(ahora) + '</b><span>' + (ahora < antes ? '▼ Baja ' : '▲ Sube ') + coma(Math.abs(ahora - antes)) + '</span></div>';
    h += seccion('Hándicap', hcpTxt + '<p class="rj-nota">Cuenta cuando la tarjeta es oficial (entregada y confirmada).</p>');

    // Medallas
    const m = datos.medallas && (datos.medallas.jugadores || []).find(x => clave(x.jugador) === k);
    const todas = (m && m.medallas) || [];
    const limite = Date.now() - 20 * 3600 * 1000;
    const nuevas = todas.filter(x => new Date(x.cuando).getTime() >= limite);
    const fila = x => {
      const md = (typeof MEDALLA_POR_ID !== 'undefined') ? MEDALLA_POR_ID[x.id] : null;
      if(!md) return '';
      const det = typeof medDetalle === 'function' ? medDetalle(x) : '';
      return '<div class="rj-med">' + (typeof medIns === 'function' ? medIns(md) : '') + '<span><b>' + md.nombre + '</b>' + (det ? '<small>' + det + '</small>' : '') + '</span></div>';
    };
    h += seccion('Medallas', (nuevas.length ? '<div class="rj-sub2">¡Nuevas en esta partida!</div>' + nuevas.map(fila).join('') : '<p class="rj-p">Hoy no ha conseguido medallas nuevas.</p>')
      + (todas.length ? '<p class="rj-nota">' + todas.length + (todas.length === 1 ? ' medalla' : ' medallas') + ' esta temporada.</p>' : ''));

    // Clasificación de la semana y del mes
    const liga = datos.liga || {};
    const hoyIso = new Date().toISOString().slice(0, 10);
    const sem = (liga.semanas || []).find(s => s.desde <= hoyIso && hoyIso <= s.hasta) || (liga.semanas || [])[0];
    const tabla = (lista, valor, unidad) => {
      if(!lista || !lista.length) return '<p class="rj-p">Todavía no hay tarjetas.</p>';
      const pos = lista.findIndex(x => clave(x.jugador) === k);
      const ver = lista.slice(0, 3).map((x, j) => ({ x, j }));
      if(pos >= 3) ver.push({ x: lista[pos], j: pos, aparte: true });
      return '<div class="rj-tabla">' + ver.map(v => '<div class="rj-fila' + (v.j === pos ? ' yo' : '') + (v.aparte ? ' aparte' : '') + '"><span>' + (v.j + 1) + 'º</span><b>' + esc(corto(v.x.jugador)) + '</b><span>' + valor(v.x) + unidad + '</span></div>').join('') + '</div>'
        + (pos < 0 ? '<p class="rj-nota">Aún no tiene tarjeta en esta clasificación.</p>' : '');
    };
    h += seccion('Clasificación de la semana' + (sem ? ' <small>' + sem.desde.slice(8) + '/' + sem.desde.slice(5, 7) + ' – ' + sem.hasta.slice(8) + '/' + sem.hasta.slice(5, 7) + '</small>' : ''),
      tabla(sem && sem.clasificacion, x => x.neto, ' netos'));
    h += seccion('Clasificación del mes', tabla(liga.clasificacion, x => x.puntos, ' pts'));
    return h;
  }

  function pintar(){
    if(!document.querySelector('.screen.active[data-screen="4"]')) return;
    const b = caja(); if(!b) return;
    b.innerHTML = elegido == null ? botones() : detalle(elegido);
    b.querySelectorAll('.rj-jug').forEach(x => x.addEventListener('click', () => { elegido = +x.dataset.i; pintar(); b.scrollIntoView({ block: 'start' }); }));
    const v = document.getElementById('rjVolver'); if(v) v.addEventListener('click', () => { elegido = null; pintar(); });
    const r = document.getElementById('rjReintentar'); if(r) r.addEventListener('click', () => pedirDatos(true));
  }

  const goOrig = window.goTo;
  window.goTo = function(n){
    const antes = document.querySelector('.screen.active');
    const desdePartida = antes && antes.dataset.screen === '3';
    const r = goOrig.apply(this, arguments);
    if(n === 4){
      document.documentElement.classList.add('rj-on');
      // Desde «¿Cómo jugué?» del inicio: se abre directamente el resumen de ese jugador
      elegido = (!desdePartida && typeof diagActivePlayer === 'number' && players[diagActivePlayer]) ? diagActivePlayer : null;
      pedirDatos(true);
      setTimeout(pintar, 0);
    }
    return r;
  };
})();
