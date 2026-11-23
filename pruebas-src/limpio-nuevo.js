/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Norma de DISEÑO LIMPIO para las 4 pestañas (Inicio, Jugar, Liga y Mi cuenta) — dibujos de Carlos del 23-nov-2026 ---
// Fondo blanco, todo en tarjetas azules, un solo botón rojo por pantalla, pocas filas y lo secundario en una línea gris abajo.
// Este archivo SOLO pone piezas de aspecto y pulsa los botones de siempre: no guarda nada ni cambia cómo funciona la app.
// · Inicio: UNA tarjeta según el momento:
//     1) «Tu partida de hoy» (podio con el resultado NETO y «Ver la partida completa») desde que terminas una partida hasta las 12 de la noche;
//     2) si no, el evento más próximo (los demás, en el mismo orden de fecha, se ven con «Ver N más»);
//     3) si no hay nada, «Nada organizado · Organizar un partido».
// · Jugar: sin «Ganadores de la semana» (pasa a Liga · Premios) y con el número de partidos organizados.
// · Liga: título «Liga» con el nombre de la liga debajo; «Ganadores de la semana» en Premios; «Normas de la liga» y «Ligas» en la línea de abajo.
// · Mi cuenta: cabecera con iniciales, nombre completo y grupo; hándicap y partidas; Mi golf; Mi grupo; y abajo «Ajustes · Ayuda · Cerrar sesión».
//   «Ajustes» y «Ayuda» despliegan lo de siempre (perfil, avisos, administrador, redes, borrar cuenta / reglas, manual, soporte).
(function(){
  'use strict';
  const H = document.documentElement;
  const pant = document.querySelector('.screen[data-screen="0"]');
  const ahora = document.getElementById('homeAhora');
  if(!pant || !ahora || !document.getElementById('inNav')) return;
  H.classList.add('lm-on');
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);
  const crear = (etq, clase, html) => { const e = document.createElement(etq); if(clase) e.className = clase; if(html) e.innerHTML = html; return e; };
  const pon = (el, prop, v) => { if(el && el[prop] !== v) el[prop] = v; };
  const diaDe = d => { const x = new Date(d); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate(); };
  const yo = () => norm(window.miPerfil && window.miPerfil.player_name);

  // Lectura de la partida terminada (la misma tabla «rounds» que lee En vivo). Se deja a mano para las pruebas.
  const L = window.acgolfLimpio = {
    leer: async code => {
      const client = typeof initSupabase === 'function' ? initSupabase() : null;
      if(!client) return null;
      const { data, error } = await client.from('rounds').select('code, round_name, course_id, course_name, course_par, course_hcp, match_groups, scoring_type, created_at, updated_at').eq('code', code).maybeSingle();
      return error ? null : data;
    }
  };

  // ======================= INICIO =======================
  // 1) Tu partida de hoy (hasta las 12 de la noche)
  const hoyCard = crear('div', 'lm-card lm-hoy'); hoyCard.id = 'lmHoy'; hoyCard.hidden = true;
  ahora.appendChild(hoyCard);
  let hoy = null, pedido = 0;
  async function buscarHoy(recent){
    const n = ++pedido, y = yo();
    const r = y ? (recent || []).find(x => x && x.finished === true && x.date && diaDe(x.date) === diaDe(Date.now()) && (x.players || []).some(p => norm(p) === y)) : null;
    if(!r){ if(n === pedido){ hoy = null; pintarHoy(); } return; }
    if(hoy && hoy.code === r.code && hoy.dia === diaDe(Date.now())) return;
    let round = null;
    try { round = await L.leer(r.code); } catch(e){}
    if(n !== pedido) return;
    hoy = round ? { code: r.code, dia: diaDe(Date.now()), round, campo: (round.course_name || r.courseName || '').replace(/^Club( de Golf)?\s+/i, '') } : null;
    pintarHoy();
  }
  function podio(round){
    const V = window.acgolfEnVivo; if(!V) return null;
    if(round.scoring_type === 'matchplay') return [];
    const pts = round.scoring_type === 'stableford';
    let filas = null;
    try { const pr = V.parejas && V.parejas(round); if(pr && pr.length) filas = pr.map(x => ({ n: x.nombre, v: x.total })); } catch(e){}
    if(!filas){ try { filas = (V.tabla(round) || []).map(x => ({ n: x.n, v: pts ? x.pts : x.neto })); } catch(e){ filas = []; } }
    return filas.slice(0, 3).map((f, i, a) => {
      let pos = i; while(pos > 0 && a[pos - 1].v === f.v) pos--;   // empatados, mismo puesto
      return { pos: pos + 1, n: f.n, r: pts ? f.v + ' pts' : signo(f.v) };
    });
  }
  function pintarHoy(){
    if(hoy && hoy.dia !== diaDe(Date.now())) hoy = null;   // a las 12 de la noche se quita
    const filas = hoy ? podio(hoy.round) : null;
    if(!hoy || !filas){ pon(hoyCard, 'hidden', true); hoyCard.dataset.html = ''; repasarInicio(); return; }
    const html = '<div class="lm-k">Tu partida de hoy' + (hoy.campo ? ' · ' + esc(hoy.campo) : '') + '</div>'
      + (filas.length ? '<ol class="lm-pod">' + filas.map(f => '<li><span class="lm-pn">' + f.pos + '</span><span class="lm-pnom">' + esc(f.n) + '</span><span class="lm-pr">' + esc(f.r) + '</span></li>').join('') + '</ol>'
                      : '<p class="lm-s">' + esc(hoy.round.round_name || 'Partida terminada') + '</p>')
      + '<button type="button" class="lm-oro" data-lm="verHoy">Ver la partida completa</button>'
      + '<button type="button" class="lm-link" data-lm="resumenHoy" hidden>Ver el resumen de Curro y Lola</button>';
    if(hoyCard.dataset.html !== html){ hoyCard.innerHTML = html; hoyCard.dataset.html = html; }
    pon(hoyCard, 'hidden', false);
    repasarInicio();
  }
  hoyCard.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-lm]'); if(!b || !hoy) return;
    if(b.dataset.lm === 'resumenHoy'){ const r = resumenDe(hoy.code); if(r) r.click(); return; }
    // Igual que «Ver» en «Últimas partidas»: abre la partida terminada
    if(b.dataset.busy || typeof joinSharedRound !== 'function') return;
    b.dataset.busy = '1'; const t = b.textContent; b.textContent = 'Abriendo…';
    try { const res = await joinSharedRound(hoy.code); if(res && res.ok && typeof goTo === 'function') goTo(3); }
    finally { delete b.dataset.busy; b.textContent = t; }
  });
  // El resumen de Curro y Lola de esa misma partida no sale aparte (un evento, una sola tarjeta): se abre desde la tarjeta
  const resumenDe = code => document.querySelector('#vvExtras [data-vv-res="' + (window.CSS && CSS.escape ? CSS.escape(code) : code) + '"]');

  // Se engancha a lo que ya pinta el Inicio con las últimas partidas (rondas-compartidas.js → renderHomeEnMarcha)
  function enganchar(){
    const f = window.renderHomeEnMarcha;
    if(typeof f !== 'function' || f.__lm) return;
    const nuevo = function(recent){ const r = f.apply(this, arguments); try { buscarHoy(recent); } catch(e){} return r; };
    nuevo.__lm = true; if(f.__vv) nuevo.__vv = true;
    window.renderHomeEnMarcha = nuevo;
  }
  if(document.readyState === 'complete') enganchar(); else window.addEventListener('load', () => setTimeout(enganchar, 0));
  setInterval(() => { if(hoy && hoy.dia !== diaDe(Date.now())) pintarHoy(); }, 60000);

  // 3) Nada organizado
  const nada = crear('div', 'lm-card lm-nada', '<div class="lm-k">Lo próximo</div><b class="lm-t">Nada organizado</b><span class="lm-s">¿Quedáis para jugar?</span>'
    + '<button type="button" class="lm-oro" data-lm="organizar">Organizar un partido</button>');
  nada.id = 'lmNada'; nada.hidden = true;
  ahora.appendChild(nada);
  nada.addEventListener('click', ev => { if(ev.target.closest('[data-lm="organizar"]')){ const b = $('convHomeNew'); if(b) b.click(); } });

  // 2) El evento más próximo; los demás, plegados en «Ver N más»
  const mas = crear('button', 'lm-mas'); mas.type = 'button'; mas.id = 'lmMas'; mas.hidden = true;
  ahora.appendChild(mas);
  let abiertoMas = false;
  mas.addEventListener('click', () => { abiertoMas = !abiertoMas; repasarInicio(); });

  function repasarInicio(){
    const box = $('convHome');
    const eventos = box ? Array.from(box.children).filter(n => n.matches('.ip-card, .og-card')) : [];
    const conHoy = !hoyCard.hidden;
    const visibles = conHoy ? 0 : 1;
    eventos.forEach((n, i) => { const o = !abiertoMas && i >= visibles; if(n.classList.contains('lm-oculta') !== o) n.classList.toggle('lm-oculta', o); });
    pon(nada, 'hidden', conHoy || eventos.length > 0);
    const org = nada.querySelector('[data-lm="organizar"]'); pon(org, 'hidden', !$('convHomeNew'));
    const resto = eventos.length - visibles;
    pon(mas, 'hidden', resto <= 0);
    const txt = abiertoMas ? 'Ver menos' : conHoy ? 'Lo próximo (' + resto + ')' : 'Ver ' + resto + ' más';
    pon(mas, 'textContent', txt);
    mas.classList.toggle('lm-abierto', abiertoMas);
    // El resumen de Curro y Lola de tu partida de hoy va dentro de su tarjeta
    document.querySelectorAll('#vvExtras .vv-home-res.lm-dentro').forEach(c => c.classList.remove('lm-dentro'));
    const r = conHoy && hoy ? resumenDe(hoy.code) : null;
    if(r) r.closest('.vv-home-res').classList.add('lm-dentro');
    const lk = hoyCard.querySelector('[data-lm="resumenHoy"]'); if(lk) pon(lk, 'hidden', !r);
  }
  let cola = false;
  const avisar = () => { if(cola) return; cola = true; setTimeout(() => { cola = false; try { repasarInicio(); } catch(e){} }, 80); };
  new MutationObserver(avisar).observe(ahora, { childList: true, subtree: true });
  repasarInicio();

  // ======================= JUGAR =======================
  (function(){
    const jg = $('jgPant'); if(!jg) return;
    const sub = jg.querySelector('.jg-sub'); if(sub) sub.textContent = '¿Qué te apetece hoy?';
    const prox = jg.querySelector('[data-va="proximos"] .jg-tx');
    const cuenta = prox ? prox.appendChild(crear('span', 'lm-sub')) : null;
    function repasar(){
      if(jg.hidden || !cuenta) return;
      const box = $('convHome');
      const n = box ? box.querySelectorAll(':scope > .ip-card, :scope > .og-card').length : 0;
      pon(cuenta, 'textContent', n ? n + (n === 1 ? ' organizado' : ' organizados') : 'Ahora no hay ninguno');
    }
    setInterval(repasar, 1000);
    new MutationObserver(repasar).observe(jg, { attributes: true, attributeFilter: ['hidden'] });
    // «Próximos partidos» lleva al Inicio con TODOS los partidos a la vista (no solo el primero)
    const fp = jg.querySelector('[data-va="proximos"]');
    if(fp) fp.addEventListener('click', () => {
      abiertoMas = true; repasarInicio();
      setTimeout(() => {
        const c = pant.querySelector('.screen-content'), p = document.querySelector('#convHome > .ip-card, #convHome > .og-card, #lmNada:not([hidden])');
        if(c && p) c.scrollTop = Math.max(0, c.scrollTop + p.getBoundingClientRect().top - c.getBoundingClientRect().top - 24);
      }, 60);
    });
  })();

  // ======================= LIGA =======================
  (function(){
    const lg = $('lgPant'); if(!lg) return;
    const cab = lg.querySelector('.lg-cab > div');
    const tit = crear('h1', 'lm-tit'); tit.textContent = 'Liga';
    const sub = crear('p', 'lm-subt'); sub.hidden = true;
    if(cab){ cab.appendChild(tit); cab.appendChild(sub); }
    // «Ganadores de la semana» pasa a Premios (pulsa el botón de siempre)
    const premios = lg.querySelector('.lg-sec + .lg-card');
    const gan = crear('button', 'lg-row lm-gan', '<span class="lg-tx"><b>Ganadores de la semana</b></span><i class="lg-fl" aria-hidden="true"></i>');
    gan.type = 'button';
    if(premios) premios.insertBefore(gan, premios.firstChild);
    gan.addEventListener('click', () => { const b = document.querySelector('.home-menu-btn[data-foco="premios"]'); if(b) b.click(); });
    // Línea discreta de abajo: Normas de la liga · Ligas (solo administrador)
    const pie = crear('p', 'lm-pie', '<button type="button" data-lm="normas">Normas de la liga</button><button type="button" data-lm="ligas">Ligas (solo administrador)</button>');
    lg.insertBefore(pie, lg.querySelector('.lg-fin'));
    pie.addEventListener('click', ev => {
      const b = ev.target.closest('[data-lm]'); if(!b) return;
      if(b.dataset.lm === 'normas'){ const n = $('homeNormasBtn'); if(n) n.click(); }
      else { const l = lg.querySelector('.lg-row[data-va="ligas"]'); if(l) l.click(); }
    });
    function repasar(){
      if(lg.hidden) return;
      const t = $('lgTitulo'), s = $('lgSub');
      const nombre = t && t.textContent.trim() !== 'Liga' ? t.textContent.trim() : '';
      const txt = [nombre, s && !s.hidden ? s.textContent.trim() : ''].filter(Boolean).join(' · ');
      pon(sub, 'textContent', txt); pon(sub, 'hidden', !txt);
      pon(gan, 'hidden', !document.querySelector('.home-menu-btn[data-foco="premios"]'));
      if(premios){ const vacio = !premios.querySelector('.lg-row:not([hidden])'); pon(premios, 'hidden', vacio); const sec = lg.querySelector('.lg-sec'); if(sec) pon(sec, 'hidden', vacio); }
      const lr = lg.querySelector('.lg-row[data-va="ligas"]');
      const bl = pie.querySelector('[data-lm="ligas"]'), bn = pie.querySelector('[data-lm="normas"]');
      pon(bl, 'hidden', !lr || lr.hidden);
      pon(bn, 'hidden', !($('homeNormasBtn') && typeof abrirNormas === 'function'));
      pon(pie, 'hidden', bl.hidden && bn.hidden);
    }
    setInterval(repasar, 1000);
    new MutationObserver(() => setTimeout(repasar, 0)).observe(lg, { attributes: true, attributeFilter: ['hidden'] });
  })();

  // ======================= MI CUENTA =======================
  (function(){
    const cn = $('cnPant'), todo = $('cnTodo'), main = $('cnMain'); if(!cn || !todo) return;
    // Cada trozo de la lista de siempre, con su sitio en la pantalla limpia
    const SITIO = { 'mi golf': 'golf', 'mi grupo': 'grupo', 'mi perfil y avisos': 'ajustes', 'ayuda y club': 'ayuda', 'siguenos y valoranos': 'ajustes' };
    let sitio = 'golf';
    Array.from(todo.children).forEach(e => {
      if(e.classList.contains('cn-sec')) sitio = SITIO[norm(e.textContent)] || sitio;
      if(e.classList.contains('cn-sesion')) sitio = 'sesion';
      e.dataset.lmSec = e.id === 'cnAdm' ? 'ajustes' : sitio;
    });
    const fl = '<i class="cn-fl" aria-hidden="true"></i>';
    const fila = (va, t, s) => '<button type="button" class="lm-fila" data-de="' + va + '"><span class="lm-ftx"><b>' + t + '</b>' + (s ? '<span>' + s + '</span>' : '') + '</span>' + fl + '</button>';
    const bloque = crear('div', 'lm-cn',
        '<div class="lm-cn-cab"><button type="button" class="lm-ava" data-de="foto" aria-label="Cambiar mi foto o avatar"></button><h2 class="lm-nom"></h2><p class="lm-gru"></p></div>'
      + '<div class="lm-stats"><div class="lm-stat" data-st="hcp"><b></b><span>Mi hándicap</span></div><div class="lm-stat" data-st="part"><b></b><span>Partidas</span></div></div>'
      + '<div class="lm-card lm-golf"><div class="lm-k">Mi golf</div>' + fila('hcp', 'Mi hándicap', 'Cómo se calcula') + fila('partidas', 'Últimas partidas') + fila('como', '¿Cómo jugué?') + '</div>'
      + '<div class="lm-card lm-grupo"><div class="lm-k">Mi grupo</div>' + fila('misGrupos', 'Cambiar de grupo') + fila('invitar', 'Invitar amigos') + '</div>'
      + '<p class="lm-pie"><button type="button" data-lm="ajustes">Ajustes</button><button type="button" data-lm="ayuda">Ayuda</button><button type="button" data-lm="salir">Cerrar sesión</button><button type="button" data-lm="super">Panel general</button></p>');
    todo.insertBefore(bloque, todo.firstChild);
    const orig = va => va === 'foto' ? $('cnFoto') : todo.querySelector('[data-va="' + va + '"]:not(.lm-fila)');
    const seVe = el => !!el && !el.hidden && !(el.closest('.cn-card, .cn-raps, .cn-gran') || {}).hidden;
    bloque.addEventListener('click', ev => {
      const p = ev.target.closest('[data-de]');
      if(p){ const o = orig(p.dataset.de); if(o) o.click(); return; }
      const b = ev.target.closest('[data-lm]'); if(!b) return;
      const q = b.dataset.lm;
      if(q === 'salir'){ const s = todo.querySelector('[data-va="salir"]'); if(s) s.click(); return; }
      if(q === 'super'){ const C = window.acgolfCuentaNueva; if(C && C.irSuper) C.irSuper(); return; }
      const abre = !cn.classList.contains('lm-' + q);
      cn.classList.toggle('lm-' + q, abre);
      b.classList.toggle('on', abre);
      if(abre){ const primero = todo.querySelector('[data-lm-sec="' + q + '"]:not([hidden])'); if(primero && main) setTimeout(() => { main.scrollTop = Math.max(0, primero.offsetTop - main.offsetTop - 8); }, 30); }
    });
    function partidas(){
      try {
        if(typeof hcpDatos === 'undefined' || !hcpDatos || typeof hClave !== 'function') return '';
        const y = hClave(window.miPerfil && window.miPerfil.player_name);
        return String(hcpDatos.tarjetas.filter(t => hClave(t.jugador) === y).length);
      } catch(e){ return ''; }
    }
    function repasar(){
      if(cn.hidden) return;
      const p = window.miPerfil || {};
      const ini = $('cnIni');
      pon(bloque.querySelector('.lm-ava'), 'textContent', ini ? ini.textContent : '');
      pon(bloque.querySelector('.lm-nom'), 'textContent', p.player_name || '');
      const gn = $('inNombre'), gt = gn ? gn.textContent.trim() : (p.grupo || '');
      const gru = bloque.querySelector('.lm-gru'); pon(gru, 'textContent', gt); pon(gru, 'hidden', !gt);
      const hc = $('cnHcp') ? $('cnHcp').textContent.trim() : '', pa = partidas();
      const sh = bloque.querySelector('[data-st="hcp"]'), sp = bloque.querySelector('[data-st="part"]');
      pon(sh.firstChild, 'textContent', hc); pon(sh, 'hidden', !hc);
      pon(sp.firstChild, 'textContent', pa); pon(sp, 'hidden', !pa);
      pon(bloque.querySelector('.lm-stats'), 'hidden', !hc && !pa);
      bloque.querySelectorAll('.lm-fila[data-de]').forEach(f => pon(f, 'hidden', !seVe(orig(f.dataset.de))));
      bloque.querySelectorAll('.lm-card').forEach(c => pon(c, 'hidden', !c.querySelector('.lm-fila:not([hidden])')));
      pon(bloque.querySelector('[data-lm="super"]'), 'hidden', !p.es_super);
      pon(bloque.querySelector('[data-lm="salir"]'), 'hidden', !todo.querySelector('[data-va="salir"]'));
    }
    setInterval(repasar, 800);
    new MutationObserver(() => setTimeout(repasar, 0)).observe(cn, { attributes: true, attributeFilter: ['hidden'] });
  })();
})();
