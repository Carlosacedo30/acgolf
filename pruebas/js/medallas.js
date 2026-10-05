/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Medallas de la liga: logros que cada jugador consigue con sus tarjetas ---
  // Se calculan en Supabase con medallas_liga() SOLO con las partidas de la liga jugadas con la app
  // (las antiguas de golfdirecto no cuentan), así que nadie tiene que apuntar nada. Cada medalla se gana una sola vez y guarda el día en que se consiguió.
  // Se ven en: Inicio (medallas nuevas de la semana), la Liga (vitrina de cada jugador) y al terminar una partida.
  const MEDALLAS = [
    { id:'rompe100', ico:'🥉', et:'&lt;100', tono:'bronce', nombre:'Rompe el 100', como:'Acabar una vuelta con menos de 100 golpes' },
    { id:'rompe90',  ico:'🥈', et:'&lt;90', tono:'plata', nombre:'Rompe el 90',  como:'Acabar una vuelta con menos de 90 golpes' },
    { id:'rompe80',  ico:'🥇', et:'&lt;80', tono:'oro', nombre:'Rompe el 80',  como:'Acabar una vuelta con menos de 80 golpes' },
    { id:'bajopar',  ico:'🎯', et:'−P', tono:'oro', nombre:'Bajo par neto', como:'Acabar por debajo del par después de restar tu hándicap' },
    { id:'birdie',   ico:'🐦', et:'−1', tono:'bronce', nombre:'Primer birdie', como:'Hacer un hoyo con un golpe menos que el par' },
    { id:'aguila',   ico:'🦅', et:'−2', tono:'oro', nombre:'Águila', como:'Hacer un hoyo con dos golpes menos que el par' },
    { id:'hoyo1',    ico:'💎', et:'H1', tono:'diamante', nombre:'Hoyo en uno', como:'Meter la bola de un solo golpe. ¡La leyenda!' },
    { id:'limpia',   ico:'🧼', et:'✓', tono:'plata', nombre:'Tarjeta limpia', como:'18 hoyos sin pasarte nunca 3 golpes o más del par' },
    { id:'remontada',ico:'🚀', et:'+15', tono:'plata', nombre:'Remontada', como:'Mejorar 15 golpes o más respecto a tu tarjeta anterior' },
    { id:'fijo10',   ico:'⛳', et:'10', tono:'bronce', nombre:'10 partidas', como:'Jugar 10 partidas de la liga' },
    { id:'fijo25',   ico:'🏌️', et:'25', tono:'plata', nombre:'25 partidas', como:'Jugar 25 partidas de la liga' },
    { id:'fijo50',   ico:'🔥', et:'50', tono:'oro', nombre:'50 partidas', como:'Jugar 50 partidas de la liga' },
    { id:'fijo100',  ico:'💯', et:'100', tono:'diamante', nombre:'100 partidas', como:'Jugar 100 partidas de la liga' },
  ];
  // Insignia redonda de la medalla (en la app); el emoji "ico" queda solo para el mensaje de WhatsApp
  function medIns(md){ return md ? '<span class="med-ins ' + md.tono + (md.et.replace('&lt;', '<').length > 3 ? ' largo' : '') + '" title="' + md.nombre + '">' + md.et + '</span>' : ''; }
  const MEDALLA_POR_ID = {};
  MEDALLAS.forEach(m => { MEDALLA_POR_ID[m.id] = m; });
  let medallasData = null;

  const medEsc = s => (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s);
  const medCorto = n => (typeof ligaNombreCorto === 'function') ? ligaNombreCorto(n) : n;
  const medClave = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const MED_MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function medFecha(iso){
    const [y, m, d] = String(iso).split('-').map(Number);
    return d + ' ' + MED_MESES[m - 1] + ' ' + y;
  }
  // Frase corta con el dato de cuando se ganó ("con 89 golpes", "neto 64"...)
  function medDetalle(m){
    if(m.dato == null || m.dato === '') return '';
    if(m.id === 'rompe100' || m.id === 'rompe90' || m.id === 'rompe80' || m.id === 'limpia') return 'con ' + m.dato + ' golpes';
    if(m.id === 'bajopar') return 'neto ' + m.dato;
    if(m.id === 'remontada') return m.dato + ' golpes mejor que la anterior';
    return '';
  }

  async function cargarMedallas(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return null;
    try {
      const { data, error } = await client.rpc('medallas_liga');
      if(error || !data) return null;
      medallasData = data;
      return data;
    } catch(e){ return null; }
  }

  // Medallas ganadas entre dos fechas (aaaa-mm-dd), de todos los jugadores: [{jugador, medalla}]
  function medallasEntre(desde, hasta){
    const out = [];
    ((medallasData && medallasData.jugadores) || []).forEach(j => {
      (j.medallas || []).forEach(m => {
        if(m.fecha >= desde && m.fecha <= hasta && MEDALLA_POR_ID[m.id]) out.push({ jugador: j.jugador, m });
      });
    });
    return out.sort((a, b) => String(a.m.cuando).localeCompare(String(b.m.cuando)));
  }

  // ---- Inicio: medallas nuevas de la semana pasada (una fila por jugador) ----
  function medallasPorJugador(lista){
    const grupos = [];
    lista.forEach(x => {
      let g = grupos.find(y => y.jugador === x.jugador);
      if(!g){ g = { jugador: x.jugador, meds: [] }; grupos.push(g); }
      g.meds.push(x.m);
    });
    return grupos.sort((a, b) => b.meds.length - a.meds.length);
  }
  function medNombreConDato(m){
    const det = medDetalle(m);
    return MEDALLA_POR_ID[m.id].nombre + (det ? ' (' + det + ')' : '');
  }
  function medallasTextoWhatsApp(grupos, d){
    return '🏅 *MEDALLAS NUEVAS* · ' + medFecha(d.desde).replace(/ \d{4}$/, '') + ' – ' + medFecha(d.hasta).replace(/ \d{4}$/, '') + '\n'
      + grupos.map(g => '\n*' + g.jugador + '*\n' + g.meds.map(m => MEDALLA_POR_ID[m.id].ico + ' ' + medNombreConDato(m)).join('\n')).join('\n')
      + '\n\n¡Enhorabuena! Mira tu vitrina en la app 👉 ' + location.origin + location.pathname;
  }

  function renderMedallasHome(){
    const el = document.getElementById('medallasHome');
    if(!el) return;
    const d = medallasData;
    if(!d || !d.jugadores){ el.style.display = 'none'; return; }
    const grupos = medallasPorJugador(medallasEntre(d.desde, d.hasta));
    el.style.display = '';
    el.innerHTML =
      '<div class="premios-head"><div><div class="eyebrow" style="margin:0;">' + icono('medalla') + ' Medallas nuevas</div>'
      + '<div class="premios-fechas">' + medFecha(d.desde).replace(/ \d{4}$/, '') + ' – ' + medFecha(d.hasta).replace(/ \d{4}$/, '') + '</div></div></div>'
      + (grupos.length
          ? '<div class="premios-lista">' + grupos.map(g =>
              '<div class="premio med-fila" data-jugador="' + medEsc(g.jugador) + '"><div class="premio-ico med-fila-icos">' + g.meds.map(m => medIns(MEDALLA_POR_ID[m.id])).join('') + '</div>'
              + '<div class="premio-txt"><div class="premio-quien">' + medEsc(g.jugador) + '</div>'
              + '<div class="premio-detalle">' + g.meds.map(medNombreConDato).join(' · ') + '</div></div></div>'
            ).join('') + '</div>'
            + '<a class="premios-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(medallasTextoWhatsApp(grupos, d)) + '">' + icono('medalla') + ' Enviar al grupo</a>'
          : '<div class="premios-fechas" style="margin-top:10px;">Nadie ganó medallas nuevas esta semana. ¡A por ellas!</div>')
      + '<button type="button" class="home-link" id="medallasVerTodas">Ver las vitrinas de todos ›</button>';
    el.querySelectorAll('.med-fila').forEach(f => f.addEventListener('click', ()=> abrirVitrina(f.dataset.jugador)));
    const ver = document.getElementById('medallasVerTodas');
    if(ver) ver.addEventListener('click', abrirListaVitrinas);
  }

  // ---- Liga: lista de jugadores con sus medallas ----
  function renderMedallasLiga(){
    const box = document.getElementById('ligaMedallas');
    const sec = document.getElementById('ligaMedallasSection');
    if(!box) return;
    const js = ((medallasData && medallasData.jugadores) || []).filter(j => j.partidas > 0);
    if(sec) sec.style.display = js.length ? '' : 'none';
    box.innerHTML = medallasFilasJugadores(js);
    box.querySelectorAll('.med-jug').forEach(f => f.addEventListener('click', ()=> abrirVitrina(f.dataset.jugador)));
  }
  function medallasFilasJugadores(js){
    return js.map(j => {
      const meds = (j.medallas || []).filter(m => MEDALLA_POR_ID[m.id]);
      return '<button type="button" class="med-jug" data-jugador="' + medEsc(j.jugador) + '">'
        + '<span class="med-jug-nom">' + medEsc(medCorto(j.jugador)) + '</span>'
        + '<span class="med-jug-icos">' + meds.map(m => medIns(MEDALLA_POR_ID[m.id])).join('') + '</span>'
        + '<span class="med-jug-n">' + meds.length + '/' + MEDALLAS.length + ' ›</span></button>';
    }).join('');
  }

  // ---- Vitrina de un jugador (ventana) ----
  function medOverlay(){
    let ov = document.getElementById('medallasOverlay');
    if(ov) return ov;
    ov = document.createElement('div');
    ov.id = 'medallasOverlay';
    ov.className = 'modal-overlay';
    ov.hidden = true;
    ov.innerHTML = '<div class="modal-card lp-card med-card" role="dialog" aria-label="Medallas" style="position:relative;">'
      + '<button type="button" class="conv-close" id="medallasCerrar" aria-label="Cerrar">✕</button><div id="medallasBody"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if(e.target === ov) ov.hidden = true; });
    document.getElementById('medallasCerrar').addEventListener('click', ()=>{ ov.hidden = true; });
    return ov;
  }

  function abrirListaVitrinas(){
    const ov = medOverlay();
    const js = ((medallasData && medallasData.jugadores) || []).filter(j => j.partidas > 0);
    document.getElementById('medallasBody').innerHTML =
      '<h2 class="med-titulo">' + icono('medalla') + ' Vitrinas de la liga</h2>'
      + '<div class="section-sub">Toca un jugador para ver sus medallas y las que le faltan.</div>'
      + '<div class="med-lista">' + medallasFilasJugadores(js) + '</div>';
    ov.querySelectorAll('.med-jug').forEach(f => f.addEventListener('click', ()=> abrirVitrina(f.dataset.jugador, true)));
    ov.hidden = false;
  }

  function abrirVitrina(nombre, desdeLista){
    const ov = medOverlay();
    const j = ((medallasData && medallasData.jugadores) || []).find(x => medClave(x.jugador) === medClave(nombre));
    if(!j) return;
    const ganadas = {};
    (j.medallas || []).forEach(m => { ganadas[m.id] = m; });
    const n = MEDALLAS.filter(m => ganadas[m.id]).length;
    const dato = (v, t) => '<div class="med-stat"><div class="med-stat-v">' + (v == null ? '—' : v) + '</div><div class="med-stat-t">' + t + '</div></div>';
    document.getElementById('medallasBody').innerHTML =
      (desdeLista ? '<button type="button" class="med-volver" id="medallasVolver">‹ Todos</button>' : '')
      + '<h2 class="med-titulo">' + medEsc(j.jugador) + '</h2>'
      + '<div class="section-sub">' + n + ' de ' + MEDALLAS.length + ' medallas conseguidas</div>'
      + '<div class="med-stats">' + dato(j.partidas, 'partidas') + dato(j.mejor_bruto, 'mejor tarjeta') + dato(j.mejor_neto, 'mejor neto') + dato(j.birdies, 'birdies') + '</div>'
      + '<div class="med-grid">' + MEDALLAS.map(md => {
          const g = ganadas[md.id];
          const det = g ? medDetalle(g) : '';
          return '<div class="med' + (g ? ' ok' : '') + '"><div class="med-ico">' + medIns(md) + '</div>'
            + '<div class="med-nom">' + md.nombre + '</div>'
            + '<div class="med-txt">' + (g ? medFecha(g.fecha) + (det ? '<br>' + det : '') : md.como) + '</div></div>';
        }).join('') + '</div>';
    const volver = document.getElementById('medallasVolver');
    if(volver) volver.addEventListener('click', abrirListaVitrinas);
    ov.hidden = false;
  }

  // ---- Al terminar una partida: aviso de medallas nuevas de los jugadores de esa partida ----
  // Se llama tras guardar la ronda completa; mira las medallas conseguidas en las últimas 18 horas.
  async function mostrarMedallasRonda(playerNames){
    const el = document.getElementById('medallasRondaNote');
    if(!el) return;
    el.style.display = 'none';
    const d = await cargarMedallas();
    if(!d) return;
    renderMedallasHome();
    renderMedallasLiga();
    const claves = new Set((playerNames || []).map(medClave));
    const limite = Date.now() - 18 * 3600 * 1000;
    const nuevas = [];
    (d.jugadores || []).forEach(j => {
      if(!claves.has(medClave(j.jugador))) return;
      (j.medallas || []).forEach(m => {
        if(MEDALLA_POR_ID[m.id] && new Date(m.cuando).getTime() >= limite) nuevas.push({ jugador: j.jugador, m });
      });
    });
    if(!nuevas.length) return;
    el.innerHTML = '<div class="pattern med-aviso"><p>' + icono('brillo') + ' <strong>¡Medallas nuevas!</strong></p>'
      + nuevas.map(x => {
          const md = MEDALLA_POR_ID[x.m.id], det = medDetalle(x.m);
          return '<p class="med-aviso-fila" data-jugador="' + medEsc(x.jugador) + '">' + medIns(md) + ' <strong>' + medEsc(medCorto(x.jugador)) + '</strong>: ' + md.nombre + (det ? ' <span>(' + det + ')</span>' : '') + '</p>';
        }).join('') + '</div>';
    el.querySelectorAll('.med-aviso-fila').forEach(f => f.addEventListener('click', ()=> abrirVitrina(f.dataset.jugador)));
    el.style.display = '';
  }

  cargarMedallas().then(()=>{ renderMedallasHome(); renderMedallasLiga(); });
