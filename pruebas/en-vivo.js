/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «Seguir en vivo»: la partida como en la tele, para los del grupo que NO juegan esa partida ---
// · Jugadores de la partida (y el administrador): todo igual que antes, «Continuar partida» y apuntan.
// · Los demás del grupo con cuenta: «👁 Seguir en vivo» abre esta pantalla, solo para mirar (no se toca nada).
// · Invitado sin registro: el botón sale con candado (invitado.js).
// Pensada como la tele de un bar: se entra en cualquier momento (hoyo 10, hoyo 17…) y en segundos se sabe cómo va:
//   1. Al entrar, «Así va la partida»: quién gana en neto, por qué hoyo va cada salida y lo mejor hasta ahora.
//   2. Arriba, siempre, la clasificación neta en vivo (golpes − golpes de regalo de los hoyos jugados).
//   3. Debajo, una rueda que cambia sola cada 20 s: clasificación de la liga, ¿sabías que…?, consejo, la app
//      y el patrocinador (una de cada cuatro). Más una franja fija del patrocinador abajo.
//   4. Cuando entra un golpe nuevo, Curro o Lola lo comentan. Si pasan 4 minutos sin golpes, rellenan con una curiosidad.
//   5. Al terminar: «El plató de acgolf», el resumen con Curro y Lola en el plató (con voz), durante 24 horas.
// Se cuenta (sin nombres) cuánta gente mira y cuántos minutos: sirve para enseñárselo a un patrocinador.
(function(){
  'use strict';
  // ---- El patrocinador (cambiar aquí cuando haya otro) ----
  const PATRO = {
    nombre: 'Bolarecuperada',
    franja: '3 bolas TaylorMade gratis con el código <b>acgolf</b>',
    oferta: '<b>3 bolas TaylorMade gratis</b> con cualquier pedido en Bolarecuperada, con el código <b>acgolf</b>.',
    url: 'https://bolarecuperada.com/'
  };
  const HORAS_RESUMEN = 24;          // el resumen se ofrece 24 horas después de terminar
  const MIN_RELLENO = 4;            // minutos sin golpes para que Curro o Lola rellenen

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  // En Foursome/Scramble cada pareja se guarda como un solo «jugador» con el nombre unido así:
  // «Carlos Acedo Domínguez / Jose Moises Romero Martinez». corto()/apellido() lo reconocen y
  // muestran «Carlos y Jose» en vez de recortar a un solo nombre o mezclar apellidos de los dos.
  const primeraPalabra = n => String(n || '').trim().split(/\s+/)[0] || String(n || '');
  const esEquipo = n => String(n || '').includes(' / ');
  const corto = n => esEquipo(n) ? n.split(' / ').map(primeraPalabra).filter(Boolean).join(' y ') : primeraPalabra(n);
  const apellido = n => {
    if(esEquipo(n)) return '';   // una pareja no tiene un solo apellido que mostrar
    const w = String(n || '').trim().split(/\s+/); return w.length >= 4 ? w[w.length - 2] : (w[1] || '');
  };
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || (() => { try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } })();
  const soyAdmin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);

  function jugadoresDe(round){
    const out = [];
    (round && round.match_groups || []).forEach(g => (g && g.players || []).forEach(n => {
      if(!n) return;
      String(n).split(' / ').forEach(p => { const t = p.trim(); if(t) out.push(t); });  // una pareja cuenta como sus dos jugadores
    }));
    return out;
  }
  const juegoYo = round => { const y = norm(yo()); return !!y && jugadoresDe(round).some(n => norm(n) === y); };

  const cliente = () => (typeof initSupabase === 'function') ? initSupabase() : null;
  async function leerRonda(code){
    const client = cliente();
    if(!client) return null;
    const { data, error } = await client.from('rounds').select('code, round_name, course_id, course_name, course_par, course_hcp, match_groups, created_at, updated_at').eq('code', code).maybeSingle();
    return error ? null : data;
  }
  function paresDe(round){
    try { const c = (typeof COURSES !== 'undefined' ? COURSES : []).find(x => x.id === round.course_id); if(c && Array.isArray(c.par)) return c.par; } catch(e){}
    if(Array.isArray(round.course_par)) return round.course_par;
    return Array(18).fill(4);
  }
  function dificultadDe(round){
    if(Array.isArray(round.course_hcp) && round.course_hcp.length >= 9) return round.course_hcp.map(Number);
    try { const c = (typeof COURSES !== 'undefined' ? COURSES : []).find(x => x.id === round.course_id); if(c && Array.isArray(c.hcp) && c.hcp.length >= 9) return c.hcp.map(Number); } catch(e){}
    return Array.from({ length: 18 }, (_, i) => i + 1);
  }
  const grupos = round => (round.match_groups || []).filter(g => g && (g.players || []).filter(Boolean).length);

  // REGLA PARA SIEMPRE: el resumen se cuenta según el hoyo por el que salió CADA grupo.
  // Si salió por el 10, su primer hoyo es el 10 y el último (el 18.º que juega) es el 9.
  // Nunca se da por hecho que se empieza en el 1 ni que se acaba en el 18.
  // Partida de 9 hoyos (media vuelta de una liga o «9 hoyos»): el grupo lleva la marca «nueve» y todo se cuenta sobre 9.
  const nHoyos = g => (g && g.nueve) ? 9 : 18;
  const salidaDe = g => { const s = Math.round(Number(g && g.hoyoSalida)); return s >= 1 && s <= nHoyos(g) ? s : 1; };
  const ordenDe = g => { const n = nHoyos(g), s = salidaDe(g), o = []; for(let k = 0; k < n; k++) o.push((s - 1 + k) % n + 1); return o; };
  // Qué número de hoyo juega en orden (1.º…18.º) un hoyo concreto de ese grupo
  const posDe = (g, h) => (((Number(h) - salidaDe(g)) % nHoyos(g)) + nHoyos(g)) % nHoyos(g) + 1;
  // Último hoyo jugado (el que va más adelante en el orden del grupo) según los golpes puestos
  function ultimoDe(g, hoyos){ let m = 0, r = 0; (hoyos || []).forEach(h => { const k = posDe(g, h); if(k > m){ m = k; r = +h; } }); return { h: r, pos: m }; }

  // Contador sin nombres: quién mira (número al azar del móvil) y la partida
  function apuntar(evento, code){
    try {
      const client = cliente(); if(!client) return;
      let v = ''; try { v = localStorage.getItem('acgolfVisitante') || ''; } catch(e){}
      client.from('visitas').insert({ visitante: v.slice(0, 40), origen: String(code || '').slice(0, 20), evento }).then(() => {}, () => {});
    } catch(e){}
  }

  // ---------- Clasificación neta (golpes − golpes de regalo de cada hoyo) ----------
  function golpesRegalo(h, si){
    if(typeof strokesForHole === 'function') return strokesForHole(h, si);
    if(isNaN(h) || h <= 0) return 0;
    const r = Math.round(h); return Math.floor(r / 18) + ((r % 18) >= si ? 1 : 0);
  }
  function hcpDe(round, g, p, pares){
    const h = Number((g.handicaps || [])[p]) || 0;
    const barra = (Array.isArray(g.barras) && g.barras[p]) || 'amarillas';
    try {
      // El campo completo (con sus barras) si lo conocemos; en 9 hoyos, medio hándicap
      const c = (typeof COURSES !== 'undefined' ? COURSES : []).find(x => x.id === round.course_id) || { id: round.course_id, par: pares, nueve: nHoyos(g) === 9 };
      if(typeof hcpCampo === 'function') return hcpCampo(h, c, barra);
    } catch(e){}
    return nHoyos(g) === 9 ? Math.round(h / 2) : Math.round(h);
  }
  // Puntos Stableford de un hoyo (tabla oficial): 2 − diferencia neta sobre par, nunca menos de 0.
  const stablefordPts = diff => Math.max(0, 2 - diff);
  function tabla(round){
    const pares = paresDe(round), si = dificultadDe(round), out = [];
    const esPtos = round.scoring_type === 'stableford';   // Scramble y cualquier partida por puntos: manda el punto, no el golpe
    grupos(round).forEach((g, gi) => (g.players || []).forEach((n, p) => {
      if(!n) return;
      const sc = (g.scores || {})[p] || {}, hc = hcpDe(round, g, p, pares);
      let bruto = 0, aPar = 0, neto = 0, pts = 0, jugados = 0, ultimo = 0, pos = 0;
      Object.keys(sc).forEach(h => {
        const v = +sc[h]; if(!(v > 0)) return;
        const par = pares[h - 1] || 4, rec = nHoyos(g) === 9 ? Math.floor(hc / 9) + ((hc % 9) >= (si[h - 1] || 9) ? 1 : 0) : golpesRegalo(hc, si[h - 1] || 18), diff = v - par - rec;
        bruto += v; aPar += v - par; neto += diff; pts += stablefordPts(diff); jugados++; if(posDe(g, h) > pos){ pos = posDe(g, h); ultimo = +h; }
      });
      out.push({ n, gi, p, g, hc, bruto, aPar, neto, pts, jugados, ultimo, pos, sc, esPtos, total: esPtos ? pts : bruto - hc });
    }));
    return out.filter(x => x.jugados).sort((a, b) => esPtos ? (b.pts - a.pts || a.bruto - b.bruto) : (a.neto - b.neto || a.aPar - b.aPar));
  }
  // Lo más destacado (para «Así va» y para el resumen)
  function momentos(round){
    const pares = paresDe(round), out = [];
    grupos(round).forEach((g, gi) => (g.players || []).forEach((n, p) => {
      const sc = (g.scores || {})[p] || {};
      Object.keys(sc).forEach(h => { const v = +sc[h]; if(v > 0) out.push({ n, gi, p, h: +h, pos: posDe(g, h), v, par: pares[h - 1] || 4, d: v - (pares[h - 1] || 4), sc }); });
    }));
    return out;
  }
  const nombreJugada = d => d <= -3 ? 'albatros' : d === -2 ? 'águila' : d === -1 ? 'berdi' : d === 0 ? 'par' : d === 1 ? 'bogui' : d === 2 ? 'doble bogui' : '+' + d;

  // ---------- Abrir según quién eres ----------
  async function abrir(code, btn, textoBtn){
    if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.textContent = 'Abriendo…'; }
    try {
      const res = await joinSharedRound(code);   // decide la puerta única: marcador si juegas, En vivo si no
      if(res && res.ok) goTo(3); else if(res && res.msg) alert(res.msg);
    } finally { if(btn){ delete btn.dataset.busy; btn.textContent = textoBtn; } }
  }

  // En la portada: si no juegas esa partida, el botón pasa a ser «👁 Seguir en vivo»
  function ajustarPortada(r){
    const btn = document.getElementById('homeContinuarBtn');
    if(!btn || !r) return;
    const y = norm(yo());
    const juego = !!y && (r.players || []).some(n => norm(n) === y);
    if(soyAdmin()) botonTele(r.code, btn);          // el administrador entra al marcador, pero también puede ver la tele
    if(juego || soyAdmin()) return;
    const nuevo = btn.cloneNode(false);
    nuevo.id = 'homeVivoBtn'; nuevo.className = btn.className + ' vv-btn';
    nuevo.textContent = '👁 Seguir en vivo ›';
    btn.replaceWith(nuevo);
    const t = document.querySelector('#homeEnMarcha .home-marcha-t'); if(t) t.innerHTML = '<span class="vv-dot"></span> Partida en directo';
    nuevo.addEventListener('click', () => abrir(r.code, nuevo, '👁 Seguir en vivo ›'));
  }
  // Solo para el administrador: «📺 Ver en acgolf TV» debajo de «Continuar partida»
  function botonTele(code, despues){
    if(!despues || !code) return;
    const sig = despues.nextElementSibling;
    if(sig && sig.classList.contains('vt-admin-btn') && sig.dataset.code === code) return;
    if(sig && sig.classList.contains('vt-admin-btn')) sig.remove();
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-big-btn vv-btn vt-admin-btn'; b.dataset.code = code;
    b.textContent = '📺 Ver en acgolf TV';
    b.addEventListener('click', async () => {
      if(b.dataset.busy) return; b.dataset.busy = '1'; b.textContent = 'Abriendo…';
      try { const round = await leerRonda(code); if(round) pantalla(code, round); else alert('No se ha podido abrir la partida.'); }
      finally { delete b.dataset.busy; b.textContent = '📺 Ver en acgolf TV'; }
    });
    despues.insertAdjacentElement('afterend', b);
  }
  // Debajo de «Partida en marcha»: las demás partidas en directo del grupo (si juegan varios grupos a la vez)
  // y el resumen de cada partida terminada hace menos de 24 horas (para todos)
  let extraN = 0;
  async function extrasPortada(recent){
    const box = document.getElementById('homeEnMarcha'); if(!box) return;
    const n = ++extraN;
    let cont = document.getElementById('vvExtras');
    if(!cont){ cont = document.createElement('div'); cont.id = 'vvExtras'; box.insertAdjacentElement('afterend', cont); }
    const ahora = Date.now(), lista = recent || [];
    const enMarcha = lista.filter(x => x.finished === false && x.date && new Date(x.date).getTime() >= ahora - 6 * 3600 * 1000);
    const otras = enMarcha.slice(1);                 // la primera ya la enseña «Partida en marcha»
    const hechas = lista.filter(x => x.finished && x.date && new Date(x.date).getTime() >= ahora - 12 * 3600 * 1000);
    const resumenes = [];
    for(const r of hechas){
      const round = await leerRonda(r.code);
      if(!round || !terminada(round)) continue;
      const hasta = new Date(round.updated_at || round.created_at).getTime() + HORAS_RESUMEN * 3600 * 1000;
      if(Date.now() <= hasta) resumenes.push({ round, hora: new Date(hasta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
    }
    if(n !== extraN) return;                        // ya se pintó otra vez mientras tanto
    const y = norm(yo());
    cont.innerHTML = otras.map(r => {
      const juego = soyAdmin() || (!!y && (r.players || []).some(x => norm(x) === y));
      return '<div class="home-marcha vv-home-otra"><div class="home-marcha-t">' + (juego ? 'Partida en marcha' : '<span class="vv-dot"></span> Partida en directo') + '</div>'
        + '<div class="home-marcha-sub">' + esc(r.roundName ? r.roundName + ' · ' : '') + esc(r.courseName || 'Campo') + '</div>'
        + '<div class="home-marcha-chips">' + (r.players || []).map(x => '<span>' + esc(corto(x)) + '</span>').join('') + '</div>'
        + '<button type="button" class="home-big-btn' + (juego ? '' : ' vv-btn vv-vivo-btn') + '" data-vv-abrir="' + esc(r.code) + '">' + (juego ? 'Continuar partida ›' : '👁 Seguir en vivo ›') + '</button></div>';
    }).join('') + resumenes.map(x => {
        const gan = tabla(x.round)[0];
        const ganaTxt = gan ? (corto(gan.n) + ' ' + apellido(gan.n)).trim() : '';
        return '<div class="home-marcha vv-home-res">'
        + '<div class="home-marcha-t">🎬 El plató de acgolf' + (ganaTxt ? ' · gana ' + esc(ganaTxt) : '') + '</div>'
        + '<div class="home-marcha-sub">Curro y Lola comentan ' + esc(x.round.round_name || 'la partida') + ' (' + grupos(x.round).map(g => g.players.filter(Boolean).map(corto).join(', ')).join(' · ') + ') · hasta las ' + x.hora + '</div>'
        + '<button type="button" class="home-big-btn vv-btn vv-res-btn" data-vv-res="' + esc(x.round.code) + '">▶ Ver el resumen</button></div>';
      }).join('');
    cont.querySelectorAll('[data-vv-abrir]').forEach(b => {
      b.addEventListener('click', () => abrir(b.dataset.vvAbrir, b, b.textContent));
      if(soyAdmin()) botonTele(b.dataset.vvAbrir, b);
    });
    cont.querySelectorAll('[data-vv-res]').forEach(b => b.addEventListener('click', () => {
      if(document.documentElement.classList.contains('es-invitado')) return;
      const x = resumenes.find(z => z.round.code === b.dataset.vvRes); if(x) pantalla(x.round.code, x.round, true);
    }));
  }
  function engancharPortada(){
    if(typeof window.renderHomeEnMarcha !== 'function' || window.renderHomeEnMarcha.__vv) return;
    const orig = window.renderHomeEnMarcha;
    const nuevo = function(recent){
      const res = orig.apply(this, arguments);
      try {
        const limite = Date.now() - 6 * 3600 * 1000;
        const r = (recent || []).find(x => x.finished === false && x.date && new Date(x.date).getTime() >= limite);
        if(r) ajustarPortada(r);
        extrasPortada(recent);
      } catch(e){}
      return res;
    };
    nuevo.__vv = true;
    window.renderHomeEnMarcha = nuevo;
  }
  // En «Últimas partidas»: «Continuar» de una partida que no juegas también abre En vivo
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('.recent-row .play-btn[data-code]');
    if(!b || b.textContent.trim() !== 'Continuar' || soyAdmin()) return;
    if(document.documentElement.classList.contains('es-invitado')) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    abrir(b.dataset.code, null, '');
  }, true);

  // ---------- La pantalla En vivo ----------
  let timer = null, previo = null, codigoAbierto = null, bannerT = null, rondaAbierta = null;
  let destacados = [];   // lo último destacado (birdie, águila, racha): máximo 2
  let ultimoGolpe = 0, ultimoRelleno = 0, ticks = 0, rueda = null, toqueRueda = 0, rellenoN = 0;
  function cerrar(){
    clearInterval(timer); timer = null; clearInterval(rueda); rueda = null; codigoAbierto = null; previo = null; rondaAbierta = null; destacados = [];
    paraPlato();
    try { if(window.acgolfTele) window.acgolfTele.quitar(); } catch(e){}
    const ov = document.getElementById('vvOverlay'); if(ov){ ov.hidden = true; ov.innerHTML = ''; }
    document.body.classList.remove('vv-abierto');
  }
  function pantalla(code, round, verResumen){
    let ov = document.getElementById('vvOverlay');
    if(!ov){
      ov = document.createElement('div'); ov.id = 'vvOverlay'; ov.className = 'vv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Partida en directo');
      document.body.appendChild(ov);
    }
    ov.hidden = false; document.body.classList.add('vv-abierto');
    codigoAbierto = code; previo = null; destacados = []; rondaAbierta = round; ultimoGolpe = Date.now(); ultimoRelleno = Date.now(); ticks = 0;
    const fin = terminada(round) && !window.__teleForzada;   // #vivo=CÓDIGO: la tele también con la partida terminada (para verla)
    ov.innerHTML = '<div class="vv-top"><span class="vv-live' + (fin ? ' vv-fin' : '') + '"><i></i>' + (fin ? 'FINAL' : 'EN DIRECTO') + '</span>'
      + '<div class="vv-tit"><b>' + esc(round.round_name || 'Partida') + '</b>' + esc(round.course_name || '') + '</div>'
      + '<button type="button" class="vv-x" aria-label="Cerrar">✕</button></div>'
      + (!fin && window.acgolfTele ? '<div class="vt-sitio"></div>' : '')
      + '<div class="vv-asi"></div><div class="vv-plato-sitio"></div>'
      + '<div class="vv-tableros"></div><div class="vv-ult" aria-live="polite"></div><div class="vv-dest"></div>'
      + '<div class="vv-car">' + tarjetas() + '</div>'
      + '<a class="vv-patro" href="' + esc(PATRO.url) + '" target="_blank" rel="noopener"><small>Patrocinado por</small> <b>' + esc(PATRO.nombre) + '</b><span>' + PATRO.franja + '</span></a>';
    ov.querySelector('.vv-x').onclick = cerrar;
    // El toque en el enlace del patrocinador ya lo cuenta patro-cuenta.js en toda la app (si se contaba aquí también, salía el doble)
    pintar(round);
    apuntar('envivo', code);
    // La rueda cambia sola cada 20 s (si no la está moviendo con el dedo)
    const car = ov.querySelector('.vv-car');
    ['touchstart', 'pointerdown', 'wheel'].forEach(ev => car.addEventListener(ev, () => { toqueRueda = Date.now(); }, { passive: true }));
    clearInterval(rueda);
    rueda = setInterval(() => {
      if(document.hidden || Date.now() - toqueRueda < 30000 || !car.children.length) return;
      const ancho = car.children[0].getBoundingClientRect().width + 10;
      const sig = Math.round(car.scrollLeft / ancho) + 1;
      car.scrollTo({ left: sig >= car.children.length ? 0 : sig * ancho, behavior: 'smooth' });
    }, 20000);
    if(fin) entradaResumen(round, !!verResumen);
    else if(window.acgolfTele && ov.querySelector('.vt-sitio')) window.acgolfTele.montar(code, round);   // acgolf TV (tele-directo.js)
    else resumenEntrada(round);
    clearInterval(timer);
    timer = setInterval(async () => {
      if(codigoAbierto !== code || document.hidden) return;
      ticks++;
      if(ticks % 6 === 0) apuntar('envivo_min', code);      // un minuto más mirando
      if(terminada(rondaAbierta) || window.__teleForzada) return;
      const r = await leerRonda(code); if(!r || codigoAbierto !== code) return;
      rondaAbierta = r; pintar(r);
      if(terminada(r)){ try { if(window.acgolfTele){ window.acgolfTele.quitar(); const vt = ov.querySelector('.vt-sitio'); if(vt) vt.remove(); } } catch(e){}
        const l = ov.querySelector('.vv-live'); if(l){ l.classList.add('vv-fin'); l.innerHTML = '<i></i>FINAL'; } entradaResumen(r, false); return; }
      if(Date.now() - ultimoGolpe > MIN_RELLENO * 60000 && Date.now() - ultimoRelleno > MIN_RELLENO * 60000) rellenar();
    }, 10000);
  }

  // Arriba, fija: la clasificación de verdad según se juegue la partida (puntos en Stableford, neto en Stroke Play)
  function pintarAsi(round){
    const box = document.querySelector('#vvOverlay .vv-asi'); if(!box) return;
    const t = tabla(round);
    const esPtos = round.scoring_type === 'stableford';
    const titulo = esPtos ? 'puntos' : 'neto';
    if(!t.length){ box.innerHTML = '<div class="vv-asi-t">Así va · ' + titulo + '</div><div class="vv-asi-v">Aún no hay golpes</div>'; return; }
    const fin = terminada(round);
    box.innerHTML = '<div class="vv-asi-t">' + (fin ? 'Clasificación final · ' + titulo : 'Así va · ' + titulo) + '</div><ol class="vv-asi-l">'
      + t.map((x, i) => '<li class="' + (i === 0 ? 'lider' : '') + '"><i>' + (i + 1) + '</i><b>' + esc(corto(x.n)) + '</b><span>' + (esPtos ? x.pts + ' pts' : (fin ? x.total : signo(x.neto))) + '</span><small>' + (fin ? x.bruto + (esPtos ? ' golpes' : '−' + x.hc) : (x.pos >= nHoyos(x.g) ? 'fin' : 'h' + x.ultimo)) + '</small></li>').join('')
      + '</ol>';
  }

  function pintar(round){
    const ov = document.getElementById('vvOverlay'); if(!ov) return;
    pintarAsi(round);
    try { if(window.acgolfTele && ov.querySelector('.vt')) window.acgolfTele.actualizar(round); } catch(e){}
    const pares = paresDe(round);
    const gs = grupos(round);
    const nuevos = [];
    const tb = tabla(round);   // resultado NETO (con el hándicap de cada uno) o puntos si se juega Stableford
    const html = gs.map((g, gi) => {
      const sc = g.scores || {};
      const nombres = g.players;
      const orden = ordenDe(g), hechos = [];
      nombres.forEach((_, p) => Object.keys(sc[p] || {}).forEach(h => { if(+sc[p][h] > 0) hechos.push(+h); }));
      const fin = ultimoDe(g, hechos), actual = fin.h;
      const ultimoPos = Math.max(fin.pos, 1);
      const desde = Math.floor((ultimoPos - 1) / 9) * 9 + 1, cols = [];   // bloques fijos de 9 hoyos, en el orden en que juega ESTE grupo (1.º-9.º jugados, luego 10.º-18.º)
      for(let k = desde; k <= Math.min(nHoyos(g), desde + 8); k++) cols.push(orden[k - 1]);
      const filas = nombres.map((n, p) => {
        const fila = tb.find(x => x.gi === gi && x.p === p);
        const celdas = cols.map(h => {
          const v = +((sc[p] || {})[h]); const par = pares[h - 1] || 4;
          const clave = gi + ':' + p + ':' + h;
          if(v > 0 && previo && !previo[clave]){
            nuevos.push({ n: corto(n), g: v, par, h });
            // Aviso destacado: birdie o mejor, o tercer par seguido (siguiendo el orden de salida de ESTE grupo)
            if(v - par <= -1) apuntaDest({ q: 'curro', t: v - par <= -2 ? '¡ÁGUILA!' : '¡BIRDIE!', n: corto(n) + ', en el ' + h, f: v - par <= -2 ? 'Esto hay que enmarcarlo.' : 'Birdie de categoría.' });
            else if(v === par){
              const o = ordenDe(g), k = posDe(g, h);
              const seguidos = k >= 3 && [1, 2].every(d => { const hh = o[k - 1 - d]; const x = +((sc[p] || {})[hh]); return x > 0 && x === (pares[hh - 1] || 4); });
              if(seguidos) apuntaDest({ q: 'lola', t: 'RACHA', n: corto(n) + ', 3 pares seguidos', f: 'Así me gusta, sin sustos.' });
            }
          }
          const d = v - par, nota = !(v > 0) ? '' : d <= -2 ? 'ag' : d === -1 ? 'bi' : d === 0 ? 'pa' : d === 1 ? 'bo' : 'db';
          return '<td class="' + (v > 0 ? '' : 'vacio') + (h === actual ? ' ahora' : '') + '">' + (v > 0 ? '<span class="nt ' + nota + '">' + v + '</span>' : '—') + '</td>';
        }).join('');
        const t = fila ? (fila.esPtos ? fila.pts : signo(fila.neto)) : '·';
        const hcp = fila ? '<small class="hc">hcp ' + fila.hc + '</small>' : '';
        return '<tr><td class="nom">' + esc(corto(n)) + hcp + '</td>' + celdas + '<td class="tot">' + t + '</td></tr>';
      }).join('');
      const hora = g.time ? 'Salida ' + esc(g.time) : (gs.length > 1 ? 'Partida ' + (gi + 1) : '');
      const salida = 'Sale por el ' + salidaDe(g) + ' · ' + (nHoyos(g) === 9 ? '9 hoyos' : '18 hoyos') + ' · termina en el ' + orden[nHoyos(g) - 1];   // siempre según el hoyo de salida de ESTE grupo
      return '<div class="vv-tab"><div class="vv-hoyo">' + (actual ? 'HOYO ' + actual + ' · PAR ' + (pares[actual - 1] || '') : 'AÚN SIN GOLPES') + '<span>' + hora + '</span></div><div class="vv-sale">' + salida + '</div>'
        + '<table><tr><th></th>' + cols.map(h => '<th>' + h + '</th>').join('') + '<th>' + (round.scoring_type === 'stableford' ? 'Pts' : 'Neto') + '</th></tr>' + filas + '</table></div>';
    }).join('');
    ov.querySelector('.vv-tableros').innerHTML = html || '<div class="vv-tab vv-vacia">Todavía no hay jugadores en esta partida.</div>';
    // Si entras con la partida ya empezada, «Lo último» arranca con los últimos birdies/águilas (el más reciente según el orden de cada grupo)
    if(!previo){
      (m0 => m0.filter(x => x.d <= -1 && x.pos >= Math.max(...m0.map(y => y.pos)) - 3))(momentos(round)).sort((x, y) => y.pos - x.pos || x.gi - y.gi).slice(0, 2).reverse()
        .forEach(x => apuntaDest({ q: 'curro', t: x.d <= -2 ? '¡ÁGUILA!' : '¡BIRDIE!', n: corto(x.n) + ', en el ' + x.h, f: x.d <= -2 ? 'Esto hay que enmarcarlo.' : 'Birdie de categoría.' }));
      pintarDest(ov);
    }
    // Recordar lo que había, para saber qué golpe es nuevo
    const ahora = {};
    gs.forEach((g, gi) => (g.players || []).forEach((_, p) => Object.keys((g.scores || {})[p] || {}).forEach(h => { if(+g.scores[p][h] > 0) ahora[gi + ':' + p + ':' + h] = 1; })));
    previo = ahora;
    pintarDest(ov);
    if(nuevos.length){ ultimoGolpe = Date.now(); comentar(nuevos[nuevos.length - 1]); }
  }

  // «Lo último»: tarjetas fijas con los dos últimos avisos (sin audios ni imágenes nuevas)
  function apuntaDest(x){ destacados.unshift(x); destacados = destacados.slice(0, 2); }
  function pintarDest(ov){
    const box = ov.querySelector('.vv-dest'); if(!box) return;
    box.innerHTML = destacados.length ? '<h5>Lo último</h5>' + destacados.map((x, i) =>
      '<div class="vv-dst' + (i ? ' viej' : '') + '"><img src="' + (x.q === 'lola' ? 'lola.webp?v=1' : 'curro-risa.webp?v=1') + '" alt=""><div><b>' + esc(x.t) + '</b><strong>' + esc(x.n) + '</strong><span>' + esc(x.f) + '</span></div></div>').join('') : '';
  }
  function burbuja(quien, titulo, texto, animo, segundos){
    const box = document.querySelector('#vvOverlay .vv-ult'); if(!box) return;
    const C = window.acgolfCurro;
    const cara = C && C.cara ? C.cara(animo || 'feliz', quien) : '';
    box.innerHTML = '<div class="vv-com ' + (quien === 'lola' ? 'lola' : '') + '">' + cara + '<div class="vv-bur"><b>' + (quien === 'lola' ? 'Lola' : 'Curro') + ' · ' + titulo + '</b><p>' + texto + '</p></div></div>';
    box.classList.remove('ver'); void box.offsetWidth; box.classList.add('ver');
    clearTimeout(bannerT); bannerT = setTimeout(() => box.classList.remove('ver'), (segundos || 9) * 1000);
  }
  // Curro o Lola comentan el último golpe (texto, sin voz)
  function comentar(x){
    const C = window.acgolfCurro;
    let f = null, fijo = null;
    // Se turnan por hoyo (impares Curro, pares Lola), igual en todos los móviles; si el jugador eligió uno solo, ese
    try { const m = C && C.modoCaddie ? C.modoCaddie() : 'turnos'; fijo = m === 'turnos' ? (x.h % 2 ? 'curro' : 'lola') : m; } catch(e){}
    try { if(C && C.frase) f = C.frase({ n: x.n, bruto: x.g - x.par, neto: x.g - x.par, h: x.h }, fijo); } catch(e){}
    burbuja((f && f.quien) || 'curro', 'hoyo ' + x.h, f ? f.t : esc(x.n) + ' hace ' + x.g + ' en el hoyo ' + x.h + '.', f && f.animo);
  }
  // Ratos muertos: una curiosidad, un consejo o la app
  function rellenar(){
    ultimoRelleno = Date.now(); rellenoN++;
    const quien = rellenoN % 2 ? 'lola' : 'curro';
    const H = window.historiaGolfDatos; let texto = '';
    const tipo = rellenoN % 3;
    if(tipo === 1 && Array.isArray(H) && H.length){ const h = H[Math.floor(Math.random() * H.length)]; texto = 'Mientras llegan los golpes… ¿sabías que en ' + esc(h.ano) + ' ' + esc(h.t).replace(/^./, c => c.toLowerCase()) + '?'; }
    else if(tipo === 2){ try { const m = CONSEJOS_GOLF.mentalidad; const c = m[Math.floor(Math.random() * m.length)]; texto = 'Un consejo mientras tanto: <strong>' + esc(c.t) + '.</strong> ' + esc(c.d); } catch(e){} }
    if(!texto) texto = quien === 'lola' ? 'Están pensando el golpe, que el golf no tiene prisa. ¡Seguimos atentos!' : 'Aquí no se mueve nadie, quillo. Seguro que están buscando una bola en el rough…';
    burbuja(quien, 'mientras tanto', texto, 'feliz', 14);
  }

  // Al entrar: «Así va la partida» (para quien llega a mitad)
  function resumenEntrada(round){
    const t = tabla(round), m = momentos(round);
    const sitio = document.querySelector('#vvOverlay .vv-plato-sitio'); if(!sitio) return;
    let lineas = [];
    if(!t.length) lineas.push('Todavía no han empezado. ¡Quédate, que esto empieza enseguida!');
    else {
      const l = t[0], esPtos = l.esPtos;
      const marca = x => esPtos ? x.pts + ' puntos' : signo(x.neto) + ' neto';
      lineas.push('Va ganando <strong>' + esc(corto(l.n)) + '</strong> con ' + marca(l) + (t[1] ? ', y <strong>' + esc(corto(t[1].n)) + '</strong> le sigue con ' + marca(t[1]) : '') + '.');
      grupos(round).forEach((g, gi) => {
        const u = t.filter(x => x.gi === gi).reduce((a, x) => Math.max(a, x.pos), 0);
        if(u) lineas.push((g.time ? 'La salida de las ' + esc(g.time) : 'El grupo ' + (gi + 1)) + (u >= nHoyos(g) ? ' ya ha terminado.' : ' va por el hoyo ' + ordenDe(g)[u] + '.'));
      });
      const mejor = m.slice().sort((a, b) => a.d - b.d || b.pos - a.pos)[0];
      if(mejor && mejor.d < 0) lineas.push('Lo mejor hasta ahora: <strong>' + nombreJugada(mejor.d) + ' de ' + esc(corto(mejor.n)) + '</strong> en el hoyo ' + mejor.h + '.');
    }
    const C = window.acgolfCurro, cara = C && C.cara ? C.cara('feliz', 'curro') : '';
    sitio.innerHTML = '<div class="vv-entra"><div class="vv-com">' + cara + '<div class="vv-bur"><b>Curro · así va la partida</b><p>' + lineas.join('<br>') + '</p></div></div>'
      + '<button type="button" class="vv-entra-ok">Ver en directo ›</button></div>';
    const quitar = () => { const e = sitio.querySelector('.vv-entra'); if(e){ e.classList.add('fuera'); setTimeout(() => { if(e.parentNode) e.remove(); }, 400); } };
    sitio.querySelector('.vv-entra-ok').onclick = quitar;
    setTimeout(quitar, 15000);
  }

  // Carrusel: clasificación, ¿sabías que…?, consejo, la app… y el patrocinador una de cada cuatro
  function tarjetas(){
    const otras = [];
    const clas = document.getElementById('homeLigaBody');
    if(clas && clas.textContent.trim()) otras.push('<div class="vv-card"><h4>📊 La liga esta semana</h4><div class="vv-clas">' + clas.innerHTML + '</div></div>');
    const H = window.historiaGolfDatos;
    if(Array.isArray(H) && H.length){ const h = H[Math.floor(Math.random() * H.length)]; otras.push('<div class="vv-card"><h4>⛳ ¿Sabías que…? · ' + esc(h.ano) + '</h4><p><b>' + esc(h.t) + '.</b> ' + esc(h.p) + '</p></div>'); }
    try {
      const m = (typeof CONSEJOS_GOLF !== 'undefined' && CONSEJOS_GOLF.mentalidad) || [];
      if(m.length){ const c = m[Math.floor(Math.random() * m.length)]; otras.push('<div class="vv-card"><h4>💡 Consejo</h4><p><b>' + esc(c.t) + '.</b> ' + esc(c.d) + '</p></div>'); }
    } catch(e){}
    otras.push('<div class="vv-card"><h4>📅 Organiza tus partidas</h4><p>Convoca al grupo, apúntate a una salida y se crea la partida con los apuntados. Todo desde <b>acgolf</b>.</p></div>');
    otras.push('<div class="vv-card"><h4>📲 Instálala en tu móvil</h4><p>Ponla en la pantalla de inicio y ábrela como una app más: gratis y sin tiendas.</p></div>');
    if(H && H.length > 1){ const h = H[Math.floor(Math.random() * H.length)]; otras.push('<div class="vv-card"><h4>⛳ ¿Sabías que…? · ' + esc(h.ano) + '</h4><p><b>' + esc(h.t) + '.</b> ' + esc(h.p) + '</p></div>'); }
    const promo = '<div class="vv-card vv-promo"><h4>📢 Patrocinador oficial</h4><p>' + PATRO.oferta + '</p><a href="' + esc(PATRO.url) + '" target="_blank" rel="noopener">Ver más ›</a></div>';
    const out = [];
    otras.forEach((c, i) => { out.push(c); if(i % 3 === 2) out.push(promo); });
    if(!out.includes(promo)) out.push(promo);
    return out.join('');
  }

  // ---------- «El plató de acgolf»: el resumen con Curro y Lola (al terminar, durante 24 horas) ----------
  // Frases grabadas (voz/plato-curro-N.mp3 y voz/plato-lola-N.mp3), sin nombres: los nombres van en el rótulo.
  const PC = { hola:1, repaso:2, otraSalida:3, atencionBerdi:4, berdi:5, aguila:6, par:7, bogui:8, largo:9, bonito:10, parTres:11, ganadorEs:12, enhorabuena:13, adios:14 };
  const PL = { hola:1, fuerte:2, aguila:3, berdi:4, parLimpito:5, parCuenta:6, bogui:7, doble:8, lapiz:9, solido:10, seSale:11, ultimos:12, revancha:13, adios:14 };
  let platoAudio = null, platoPasos = null, platoI = 0, platoT = null, platoPausa = false;

  function entradaResumen(round, empezarYa){
    const sitio = document.querySelector('#vvOverlay .vv-plato-sitio'); if(!sitio || sitio.querySelector('.vv-plato')) return;
    sitio.innerHTML = '<div class="vv-plato"><video class="vv-pv" src="plato-risa.mp4?v=1" poster="plato.webp?v=1" muted playsinline loop preload="auto"></video>'
      + '<div class="vv-pbug">🎬 EL <b>PLATÓ</b></div><div class="vv-prot"></div>'
      + '<button type="button" class="vv-pplay">▶<span>Ver el resumen con Curro y Lola</span></button>'
      + '<div class="vv-pctl" hidden><button type="button" class="vv-ppausa">Pausa</button><button type="button" class="vv-potra">↺ Otra vez</button></div></div>';
    const pl = sitio.querySelector('.vv-pplay');
    pl.onclick = () => { pl.hidden = true; sitio.querySelector('.vv-pctl').hidden = false; empezarPlato(round); };
    sitio.querySelector('.vv-ppausa').onclick = e => {
      platoPausa = !platoPausa; e.target.textContent = platoPausa ? 'Seguir' : 'Pausa';
      const v = sitio.querySelector('.vv-pv');
      if(platoPausa){ if(platoAudio) platoAudio.pause(); if(v) v.pause(); clearTimeout(platoT); }
      else { if(v) v.play().catch(() => {}); if(platoAudio && !platoAudio.ended && platoAudio.src) platoAudio.play().catch(() => siguientePaso()); else siguientePaso(); }
    };
    sitio.querySelector('.vv-potra').onclick = () => { platoPausa = false; sitio.querySelector('.vv-ppausa').textContent = 'Pausa'; empezarPlato(round); };
    if(empezarYa) pl.click();
    apuntar('envivo', 'R:' + round.code);
  }
  function paraPlato(){ clearTimeout(platoT); platoPasos = null; try { if(platoAudio){ platoAudio.pause(); platoAudio.src = ''; } } catch(e){} }

  function rotulo(tipo, d){
    if(tipo === 'titulo') return '<div class="vv-r"><small>Resumen de la partida</small><h3>' + esc(d.nombre) + '</h3><p>' + esc(d.campo) + ' · ' + d.n + ' jugadores</p></div>';
    if(tipo === 'salida') return '<div class="vv-r"><small>' + esc(d.titulo) + '</small><div class="vv-rchips">' + d.nombres.map(n => '<span>' + esc(corto(n)) + '</span>').join('') + '</div></div>';
    if(tipo === 'jugada'){
      const col = d.d <= -2 ? 'ag' : d.d === -1 ? 'bi' : d.d === 0 ? 'p' : d.d === 1 ? 'bo' : 'mal';
      const ord = d.orden || ordenDe({}), lo = d.pos <= 9 ? 0 : 9, tira = [];
      for(let k = lo; k < Math.min(lo + 9, ord.length); k++){
        const x = ord[k], v = +d.sc[x], par = d.pares[x - 1] || 4, dd = v - par;
        const c = !(v > 0) || k + 1 > d.pos ? '' : dd <= -2 ? 'ag' : dd === -1 ? 'bi' : dd === 0 ? 'p' : dd === 1 ? 'bo' : 'mal';
        tira.push('<div class="' + (x === d.h ? 'now' : '') + '"><em>' + x + '</em><b class="' + c + '">' + (v > 0 && k + 1 <= d.pos ? v : '·') + '</b></div>');
      }
      const palabra = d.d <= 2 ? nombreJugada(d.d) : '+' + d.d;
      const ape = apellido(d.n);
      return '<div class="vv-r"><small>Hoyo ' + d.h + ' · Par ' + d.par + '</small><div class="vv-rnom">' + esc(corto(d.n)) + (ape ? ' <i>' + esc(ape) + '</i>' : '') + '</div>'
        + '<div class="vv-rres"><b class="' + col + '">' + esc(palabra) + '</b><span><big>' + d.v + '</big>golpes</span></div><div class="vv-rtira">' + tira.join('') + '</div></div>';
    }
    if(tipo === 'apretado') return '<div class="vv-r"><small>Se decide por ' + (d.esPtos ? (d.dif === 1 ? 'un punto' : d.dif + ' puntos') : (d.dif === 1 ? 'un golpe' : d.dif + ' golpes') + ' · neto') + '</small><ol class="vv-rk">' + d.t.slice(0, 2).map(x => '<li><span>' + esc((corto(x.n) + ' ' + apellido(x.n)).trim()) + '</span><em>' + (d.esPtos ? x.bruto + ' golpes' : x.bruto + ' − ' + x.hc) + '</em><b>' + (d.esPtos ? x.pts + ' pts' : x.total) + '</b></li>').join('') + '</ol></div>';
    if(tipo === 'suspense') return '<div class="vv-r"><small>Y el ganador del día es…</small><h3 class="vv-rsus">¿ ? ? ?</h3></div>';
    if(tipo === 'ganador') return '<div class="vv-r"><small>Ganador del día 🏆</small><h3 class="vv-rwin">' + esc((corto(d.x.n) + ' ' + apellido(d.x.n)).trim()) + '</h3><p>' + (d.esPtos ? d.x.pts + ' puntos · ' + d.x.bruto + ' golpes · hándicap ' + d.x.hc : d.x.total + ' netos · ' + d.x.bruto + ' golpes − ' + d.x.hc + ' de hándicap') + (d.mejor ? '<br>Mejor tarjeta: ' + esc(corto(d.mejor.n)) + ', ' + d.mejor.bruto + ' golpes' : '') + '</p></div>';
    if(tipo === 'ranking') return '<div class="vv-r"><small>Clasificación · ' + (d.esPtos ? 'puntos' : 'neto') + '</small><ol class="vv-rk">' + d.t.slice(0, 6).map((x, i) => '<li class="' + (i === 0 ? 'win' : '') + '"><i>' + (i + 1) + '</i><span>' + esc((corto(x.n) + ' ' + apellido(x.n)).trim()) + '</span><em>' + (d.esPtos ? x.bruto + ' golpes' : x.bruto + ' − ' + x.hc) + '</em><b>' + (d.esPtos ? x.pts + ' pts' : x.total) + '</b></li>').join('') + '</ol></div>';
    if(tipo === 'cta') return '<div class="vv-r vv-rcta"><small>Apunta tus partidas</small><h3>acgolf<b>.es</b></h3><p>Este resumen os lo trae <b>' + esc(PATRO.nombre) + '</b></p></div>';
    return '';
  }

  // El guion se hace solo con los resultados de la partida
  function guion(round){
    const pares = paresDe(round), gs = grupos(round);
    const esPtos = round.scoring_type === 'stableford';
    // tabla() ya viene ordenada de ganador a último según se juegue: puntos (más, mejor) o neto (menos, mejor)
    const t = tabla(round).slice();
    const pasos = [];
    const C = (k, r, v) => pasos.push({ q: 'curro', f: PC[k], r, v: v || 'curro' });
    const L = (k, r, v) => pasos.push({ q: 'lola', f: PL[k], r, v: v || 'lola' });
    const titulo = rotulo('titulo', { nombre: round.round_name || 'Partida', campo: round.course_name || '', n: t.length });
    C('hola', titulo); L('hola', titulo);
    let np = 0;   // cada frase de «par» solo una vez
    gs.forEach((g, gi) => {
      const sal = rotulo('salida', { titulo: (gi === 0 ? 'Primera salida' : 'Siguiente salida') + (g.time ? ' · ' + g.time : ''), nombres: g.players.filter(Boolean) });
      if(gi === 0) C('repaso', sal); else C('otraSalida', sal);
      // Los momentos de este grupo: lo mejor de cada uno y algún hoyo muy malo, en orden de hoyo
      const ms = momentos(round).filter(m => m.gi === gi);
      const elegidos = [];
      g.players.forEach((n, p) => {
        const suyos = ms.filter(m => m.p === p); if(!suyos.length) return;
        const bajos = suyos.filter(m => m.d < 0).sort((a, b) => a.d - b.d || a.pos - b.pos);
        bajos.slice(0, 2).forEach(m => elegidos.push(m));
        if(!bajos.length){ const par = suyos.filter(m => m.d === 0).sort((a, b) => a.par - b.par || a.pos - b.pos)[0]; if(par) elegidos.push(par); }
      });
      // Solo el peor hoyo del grupo (si fue muy malo), para no repetir
      const peor = ms.slice().sort((a, b) => b.d - a.d || a.pos - b.pos)[0];
      if(peor && peor.d >= 3) elegidos.push(peor);
      if(!elegidos.length && ms.length) elegidos.push(ms.slice().sort((a, b) => a.d - b.d)[0]);
      // Un bogui para dar juego si el grupo va escaso
      if(elegidos.length < 2){ const b = ms.find(m => m.d === 1 && !elegidos.includes(m)); if(b) elegidos.push(b); }
      elegidos.sort((a, b) => a.pos - b.pos).slice(0, 5).forEach(m => {
        const r = rotulo('jugada', Object.assign({ pares, orden: ordenDe(g) }, m));
        if(m.d <= -2){ L('aguila', r); C('aguila', r); L('seSale', r); }
        else if(m.d === -1){ C('atencionBerdi', r); L('berdi', r); }
        else if(m.d === 0){ const k = ['c:par', 'l:parLimpito', 'l:parCuenta'][np++]; if(k){ const [q, f] = k.split(':'); if(q === 'c') C(f, r); else L(f, r); } }
        else if(m.d === 1){ L('bogui', r); }
        else if(m.d === 2){ L('doble', r); }
        else { C('largo', r); L('lapiz', r); }
      });
    });
    if(t.length){
      const mejor = t.slice().sort((a, b) => a.bruto - b.bruto)[0];
      const dif = t[1] ? Math.abs(t[1].total - t[0].total) : null;
      if(dif != null && dif <= 2){ const r = rotulo('apretado', { t, dif, esPtos }); L('ultimos', r); C('bonito', r); }
      C('ganadorEs', rotulo('suspense'));
      C('enhorabuena', rotulo('ganador', { x: t[0], mejor: mejor !== t[0] ? mejor : null, esPtos }));
      L('revancha', rotulo('ranking', { t, esPtos }));
    }
    const cta = rotulo('cta');
    C('adios', cta); L('adios', cta, 'risa');
    return pasos;
  }
  function empezarPlato(round){
    paraPlato();
    platoPasos = guion(round); platoI = 0;
    if(!platoAudio) platoAudio = new Audio();
    platoAudio.onended = () => { platoT = setTimeout(siguientePaso, 350); };
    platoAudio.onerror = () => { platoT = setTimeout(siguientePaso, 3500); };
    try { if('speechSynthesis' in window) speechSynthesis.cancel(); } catch(e){}
    paso();
  }
  function paso(){
    const sitio = document.querySelector('#vvOverlay .vv-plato'); if(!sitio || !platoPasos) return;
    if(platoI >= platoPasos.length){ finPlato(); return; }
    const s = platoPasos[platoI];
    const v = sitio.querySelector('.vv-pv'), src = 'plato-' + s.v + '.mp4?v=1';
    if(v && !v.src.endsWith(src)){ v.src = src; v.play().catch(() => {}); } else if(v && v.paused) v.play().catch(() => {});
    const rot = sitio.querySelector('.vv-prot');
    if(rot.dataset.html !== s.r){ rot.dataset.html = s.r; rot.innerHTML = s.r; rot.classList.remove('ver'); void rot.offsetWidth; rot.classList.add('ver'); }
    platoAudio.src = 'voz/plato-' + s.q + '-' + s.f + '.mp3?v=1';
    const p = platoAudio.play(); if(p && p.catch) p.catch(() => { platoT = setTimeout(siguientePaso, 3500); });
  }
  function siguientePaso(){ if(platoPausa || !platoPasos) return; platoI++; paso(); }
  function finPlato(){
    const sitio = document.querySelector('#vvOverlay .vv-plato'); if(!sitio) return;
    const v = sitio.querySelector('.vv-pv'); if(v) v.pause();
    platoPasos = null;
  }

  // ---------- Puerta única: entrar al marcador SOLO si juegas la partida (o eres administrador) ----------
  // Sea cual sea el camino (botón, enlace de WhatsApp, código a mano, convocatoria, derbi…), quien no juega
  // esa partida va a «En vivo» (solo mirar). Las partidas ya terminadas se pueden ver como siempre.
  let silencioHasta = 0;
  const alertaOrig = window.alert;
  window.alert = function(){ if(Date.now() < silencioHasta) return; return alertaOrig.apply(window, arguments); };
  function terminada(round){
    const gs = grupos(round || {});
    return gs.length > 0 && gs.every(g => g.players.every((n, p) => { if(!n) return true; const sc = (g.scores || {})[p] || {}; return Object.keys(sc).filter(h => +sc[h] > 0).length >= nHoyos(g); }));
  }
  function engancharEntrada(){
    if(typeof window.joinSharedRound !== 'function' || window.joinSharedRound.__vv) return;
    const orig = window.joinSharedRound;
    const nuevo = async function(codeRaw){
      try {
        const code = String(codeRaw || '').trim().toUpperCase();
        if(code && !soyAdmin()){
          const round = await leerRonda(code);
          if(round && !juegoYo(round) && !terminada(round)){
            silencioHasta = Date.now() + 1500;        // que no salga ningún aviso de «no se pudo abrir»
            pantalla(code, round);
            return { ok: false, msg: '', enVivo: true };
          }
        }
      } catch(e){}
      return orig.apply(this, arguments);
    };
    nuevo.__vv = true;
    window.joinSharedRound = nuevo;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', engancharEntrada); else engancharEntrada();
  window.addEventListener('load', engancharEntrada);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', engancharPortada); else engancharPortada();
  window.addEventListener('load', engancharPortada);
  window.acgolfEnVivo = { abrir, cerrar, pantalla, pintar, guion, tabla, momentos, rellenar, leerRonda };
})();
