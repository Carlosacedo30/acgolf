/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «¿Cómo jugué?» (desde el Inicio): solo el jugador de la cuenta, con tres pestañas ---
//  · Mi partida: hoy frente a tu media, golpes perdidos en hoyos desastre, qué trabajar y por tipo de hoyo
//    (debajo sigue el resumen de siempre: tarjeta, hándicap, medallas y clasificación).
//  · Mi evolución: dobles por partida y golpes sobre el par mes a mes, los 3 hoyos que más cuestan
//    y, al tocar, el detalle hoyo a hoyo de cada tarjeta.
//  · Comparar: tú contra otro jugador, con el hándicap descontado y en los mismos campos.
// Las tarjetas salen de ultimas_tarjetas() (partidas de la app + historial de golfdirecto).
(function(){
  'use strict';
  if(typeof window.goTo !== 'function') return;
  const N = 18;
  const COL = { birdie:'#E5484D', par:'#FFFFFF', bogey:'#8DB8FF', doble:'#2F5BD3', verde:'#2E7D32', oscuro:'#0E3324', gris:'#5C6670' };
  const MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clave = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const f1 = v => v == null || !isFinite(v) ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  const sg = v => (v > 0.04 ? '+' : '') + f1(v);
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };
  const inic = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  const fechaCorta = f => { const d = new Date(f); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const dia = f => String(f || '').slice(0, 10);
  const suma = a => a.reduce((x, y) => x + y, 0);
  const media = (lista, f) => lista.length ? suma(lista.map(f)) / lista.length : null;
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const leer = k => { try { return localStorage.getItem(k) || ''; } catch(e){ return ''; } };

  // ---------- Cuentas de una tarjeta ----------
  const sobre = t => suma(t.golpes) - suma(t.par);
  const dobles = t => t.golpes.filter((g, i) => g - t.par[i] >= 2).length;
  const desastre = t => suma(t.golpes.map((g, i) => Math.max(0, g - t.par[i] - 1)));   // golpes de más en hoyos de doble o peor
  const neto = t => sobre(t) - (t.hcp || 0);
  const tipo = (g, p) => { const d = g - p; return d <= -1 ? 'birdie' : d === 0 ? 'par' : d === 1 ? 'bogey' : 'doble'; };
  const nombreTipo = (g, p) => ({ birdie: g - p <= -2 ? 'eagle o mejor' : 'birdie', par:'par', bogey:'bogey', doble: g - p === 2 ? 'doble bogey' : 'triple o peor' })[tipo(g, p)];
  const recibe = (h, si) => { h = Math.round(h || 0); if(h <= 0) return 0; return Math.floor(h / 18) + (si <= h % 18 ? 1 : 0); };
  const campoApp = nombre => (typeof COURSES !== 'undefined' ? COURSES : []).find(c => clave(c.name) === clave(nombre) && Array.isArray(c.hcp) && c.hcp.length === 18);

  // ---------- Datos ----------
  const cache = {};
  async function tarjetasDe(nombre){
    const k = clave(nombre), c = cache[k];
    if(c && Date.now() - c.cuando < 10 * 60 * 1000) return c.lista;
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) throw new Error('sin conexión');
    const { data, error } = await client.rpc('ultimas_tarjetas', { p_jugador: nombre, p_limite: N });
    if(error) throw error;
    const lista = (Array.isArray(data) ? data : []).map(t => ({
      fecha: t.fecha, campo: t.campo || 'Campo', hcp: t.hcp == null ? null : Number(t.hcp),
      par: (t.par || []).map(Number), golpes: (t.golpes || []).map(Number),
    })).filter(t => t.par.length === 18 && t.golpes.length === 18 && t.golpes.every(g => g > 0));
    cache[k] = { cuando: Date.now(), lista };
    return lista;
  }
  let jugadores = null;
  async function listaJugadores(){
    if(jugadores) return jugadores;
    const client = typeof initSupabase === 'function' ? initSupabase() : null;
    if(!client) return [];
    const { data } = await client.from('league_players').select('name');
    const vistos = {};
    jugadores = (data || []).map(x => String(x.name || '').trim()).filter(n => n && !vistos[clave(n)] && (vistos[clave(n)] = 1))
      .sort((a, b) => a.localeCompare(b, 'es'));
    return jugadores;
  }

  // ---------- Piezas ----------
  const tarjeta = (titulo, cuerpo) => '<div class="cmj-card"><div class="cmj-h">' + titulo + '</div>' + cuerpo + '</div>';
  const nota = t => '<p class="cmj-nota">' + t + '</p>';
  const item = (n, ok, titulo, sub) => '<div class="cmj-it' + (ok ? ' ok' : '') + '"><div class="cmj-num">' + n + '</div><div><b>' + titulo + '</b><span>' + sub + '</span></div></div>';
  const pocas = '<div class="cmj-card cmj-vacio">Necesitas al menos <b>3 partidas completas de 18 hoyos</b> para ver este análisis. ¡Sigue jugando y anotando!</div>';

  // ---------- 1) Mi partida ----------
  function miPartida(ts){
    if(ts.length < 3) return pocas;
    const hoy = ts[ts.length - 1], antes = ts.slice(0, -1), prev = antes.slice(-6);
    const dif = sobre(hoy) - media(prev, sobre);
    const des = desastre(hoy), desM = media(prev, desastre);
    let h = tarjeta('Hoy frente a tu media',
      '<div class="cmj-big"><b class="' + (dif > 0.04 ? 'mal' : 'bien') + '">' + sg(dif) + '</b><span>golpes ' + (dif > 0.04 ? 'peor' : 'mejor') + '<br>que tu media</span></div>'
      + nota(esc(fechaCorta(hoy.fecha)) + ' en ' + esc(hoy.campo) + ': ' + suma(hoy.golpes) + ' golpes (' + sg(sobre(hoy)).replace(',0', '') + ' al par). Tu media de las ' + prev.length + ' partidas anteriores: ' + sg(media(prev, sobre)) + '.'));
    h += tarjeta('Hoyos desastre',
      '<div class="cmj-dos"><div class="cmj-kpi"><b class="' + (des > desM + 0.04 ? 'mal' : 'bien') + '">' + des + '</b><span>golpes perdidos hoy en dobles o peor</span></div><div class="cmj-kpi"><b>' + f1(desM) + '</b><span>tu media</span></div></div>'
      + nota('Son los golpes de más en los hoyos de doble bogey o peor. <strong>Es lo primero que hay que bajar</strong> para bajar hándicap.'));
    // Hoyo a hoyo frente a lo que sueles hacer en ese mismo campo
    const mismo = antes.filter(t => clave(t.campo) === clave(hoy.campo)).slice(-10);
    if(mismo.length >= 2){
      const hoyos = hoy.golpes.map((g, i) => { const m = media(mismo, t => t.golpes[i]); return { h: i + 1, par: hoy.par[i], g, m, d: g - m }; });
      const malos = hoyos.filter(x => x.d > 0.4).sort((a, b) => b.d - a.d).slice(0, 3);
      const buenos = hoyos.filter(x => x.d < -0.4).sort((a, b) => a.d - b.d).slice(0, 2);
      const linea = (x, i, ok) => item(i + 1, ok, 'Hoyo ' + x.h + ' (par ' + x.par + '): ' + x.g + ' golpes', nombreTipo(x.g, x.par) + ' · sueles hacer ' + f1(x.m));
      h += tarjeta('Qué trabajar', (malos.length ? malos.map((x, i) => linea(x, i, false)).join('') : nota('Hoy ningún hoyo te salió claramente peor de lo normal. ¡Bien!'))
        + (buenos.length ? '<div class="cmj-h cmj-h2">Lo que te salió bien</div>' + buenos.map((x, i) => linea(x, i, true)).join('') : ''));
    }
    const porPar = (t, p) => { const v = t.golpes.filter((g, i) => t.par[i] === p); return v.length ? suma(v) / v.length : null; };
    const tipos = [3, 4, 5].map(p => { const a = porPar(hoy, p); const prevP = prev.filter(t => porPar(t, p) != null); return { p, a, d: a == null || !prevP.length ? null : a - media(prevP, t => porPar(t, p)) }; }).filter(x => x.a != null);
    h += tarjeta('Por tipo de hoyo', '<div class="cmj-pars">' + tipos.map(t => '<div><small>Par ' + t.p + '</small><b>' + f1(t.a) + '</b>'
      + (t.d == null ? '' : '<em class="' + (t.d > 0.05 ? 'mal' : t.d < -0.05 ? 'bien' : '') + '">' + (Math.abs(t.d) <= 0.05 ? 'igual' : (t.d > 0 ? 'peor ' : 'mejor ') + f1(Math.abs(t.d))) + '</em>') + '</div>').join('') + '</div>'
      + nota('Golpes de media por hoyo hoy, frente a lo que sueles hacer.'));
    return h;
  }

  // ---------- 2) Mi evolución ----------
  function barras(meses, vals, color, fmt){
    const W = 340, H = 170, mx = Math.max(...vals, 0.5) * 1.25, n = meses.length, bw = Math.min(56, (W - 40) / n - 12), gap = (W - 40 - n * bw) / (n + 1);
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cmj-svg" role="img">';
    meses.forEach((m, i) => {
      const x = 20 + gap + (bw + gap) * i, hh = Math.max(2, vals[i] / mx * (H - 50)), y = H - 28 - hh, ult = i === n - 1;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + hh + '" rx="8" fill="' + (ult ? color : '#C9CFD4') + '"/>'
        + '<text x="' + (x + bw / 2) + '" y="' + (y - 8) + '" text-anchor="middle" class="cmj-et" fill="' + (ult ? color : COL.gris) + '">' + fmt(vals[i]) + '</text>'
        + '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="cmj-eje">' + m.n + ' (' + m.ts.length + ')</text>';
    });
    return s + '</svg>';
  }
  function mapaCalor(ts){
    const W = 340, izq = 44, arriba = 18, celda = (W - izq - 4) / 18, alto = Math.min(16, celda), H = arriba + ts.length * alto + 4;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cmj-svg" role="img">';
    for(let h = 0; h < 18; h++) s += '<text x="' + (izq + h * celda + celda / 2) + '" y="12" class="cmj-eje" text-anchor="middle">' + (h + 1) + '</text>';
    ts.forEach((t, r) => {
      const y = arriba + r * alto;
      s += '<text x="' + (izq - 6) + '" y="' + (y + alto * 0.72) + '" class="cmj-eje" text-anchor="end">' + fechaCorta(t.fecha) + '</text>';
      t.golpes.forEach((g, h) => { const k = tipo(g, t.par[h]);
        s += '<rect x="' + (izq + h * celda + 0.5) + '" y="' + (y + 0.5) + '" width="' + (celda - 1) + '" height="' + (alto - 1) + '" rx="2" fill="' + COL[k] + '"' + (k === 'par' ? ' stroke="#B8C0C7" stroke-width="0.8"' : '') + '/>'; });
    });
    return s + '</svg>';
  }
  function miEvolucion(ts){
    if(ts.length < 3) return pocas;
    const grupos = {};
    ts.forEach(t => { const d = new Date(t.fecha), k = d.getFullYear() * 12 + d.getMonth(); (grupos[k] = grupos[k] || { k, n: MES[d.getMonth()], ts: [] }).ts.push(t); });
    const meses = Object.values(grupos).sort((a, b) => a.k - b.k).slice(-5);
    const dm = meses.map(m => media(m.ts, dobles)), sm = meses.map(m => media(m.ts, sobre));
    const hcps = ts.map(t => t.hcp).filter(v => v != null);
    let h = tarjeta('Dobles o peor por partida', barras(meses, dm, COL.doble, f1) + nota('Media de cada mes (entre paréntesis, partidas jugadas). <strong>Cuanto más baja la barra, mejor.</strong>'));
    h += tarjeta('Golpes sobre el par', barras(meses, sm, COL.oscuro, v => '+' + f1(v)) + nota('Media de cada mes.' + (hcps.length > 1 ? ' Hándicap: ' + f1(hcps[0]) + ' → ' + f1(hcps[hcps.length - 1]) + '.' : '')));
    // Los hoyos que más cuestan: en el campo donde más juegas
    const cuenta = {}; ts.forEach(t => { cuenta[t.campo] = (cuenta[t.campo] || 0) + 1; });
    const campo = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a])[0];
    const delCampo = ts.filter(t => t.campo === campo);
    const peores = delCampo[0].par.map((p, i) => ({ h: i + 1, par: p, m: media(delCampo, t => t.golpes[i] - t.par[i]) })).sort((a, b) => b.m - a.m).slice(0, 3);
    h += tarjeta('Los 3 hoyos que más te cuestan', peores.map((x, i) => item(i + 1, false, 'Hoyo ' + x.h + ' · par ' + x.par, sg(x.m) + ' golpes sobre el par de media')).join('')
      + nota('En ' + esc(campo) + ' (' + delCampo.length + ' tarjetas).')
      + '<button type="button" class="cmj-btn" id="cmjVerDetalle">Ver el detalle hoyo a hoyo ›</button>'
      + '<div id="cmjDetalle" hidden>' + mapaCalor(ts.slice().reverse())
      + '<div class="cmj-ley"><span><i style="background:' + COL.birdie + '"></i>Birdie</span><span><i style="background:#fff;border:1px solid #B8C0C7"></i>Par</span><span><i style="background:' + COL.bogey + '"></i>Bogey</span><span><i style="background:' + COL.doble + '"></i>Doble o más</span></div>'
      + nota('Cada fila es una tarjeta (la más reciente arriba). Cada casilla, un hoyo.') + '</div>');
    return h;
  }

  // ---------- 3) Comparar ----------
  function comparar(yo, mias, rival, suyas, lista){
    const opciones = lista.filter(n => clave(n) !== clave(yo));
    let h = '<div class="cmj-card"><div class="cmj-vs"><div><div class="cmj-av" style="background:' + COL.verde + '">' + esc(inic(yo)) + '</div><b>' + esc(corto(yo)) + '</b></div><div class="cmj-x">VS</div>'
      + '<div><div class="cmj-av" style="background:' + (rival ? COL.doble : '#C9CFD4') + '">' + (rival ? esc(inic(rival)) : '?') + '</div><b>' + (rival ? esc(corto(rival)) : 'Elige') + '</b></div></div>'
      + '<label class="cmj-sel"><span>Comparar con:</span><select id="cmjRival"><option value="">Elige un jugador…</option>'
      + opciones.map(n => '<option value="' + esc(n) + '"' + (rival && clave(n) === clave(rival) ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label></div>';
    if(!rival) return h + '<div class="cmj-card cmj-vacio">Elige un jugador de tu grupo para ver quién juega mejor.</div>';
    if(!suyas) return h + '<div class="cmj-card cmj-vacio">Cargando las tarjetas de ' + esc(corto(rival)) + '…</div>';
    if(mias.length < 1 || suyas.length < 1) return h + '<div class="cmj-card cmj-vacio">' + esc(corto(mias.length ? rival : yo)) + ' todavía no tiene tarjetas completas de 18 hoyos.</div>';
    // Solo los campos que habéis jugado los dos (si no hay ninguno en común, todas)
    const comunes = mias.map(t => clave(t.campo)).filter(c => suyas.some(t => clave(t.campo) === c));
    const A = comunes.length ? mias.filter(t => comunes.includes(clave(t.campo))) : mias;
    const B = comunes.length ? suyas.filter(t => comunes.includes(clave(t.campo))) : suyas;
    const fila = (l, sub, a, b, fmt) => '<div class="cmj-duo"><span class="n' + (a < b - 0.04 ? ' win' : '') + '">' + fmt(a) + '</span><div class="l">' + l + '<small>' + sub + '</small></div><span class="n' + (b < a - 0.04 ? ' win2' : '') + '">' + fmt(b) + '</span></div>';
    h += tarjeta('Con el hándicap descontado',
      fila('Neto sobre el par', 'por partida', media(A, neto), media(B, neto), sg)
      + fila('Dobles o peor', 'por partida', media(A, dobles), media(B, dobles), f1)
      + fila('Golpes perdidos', 'en hoyos desastre', media(A, desastre), media(B, desastre), f1)
      + nota(A.length + ' tarjetas tuyas y ' + B.length + ' de ' + esc(corto(rival)) + (comunes.length ? ', solo en campos que habéis jugado los dos' : ' (no tenéis campos en común)') + '. En color, quien sale mejor: cuanto más bajo, mejor.'));
    // Cara a cara: mismo día y mismo campo, gana el mejor neto
    let ga = 0, gb = 0, em = 0;
    mias.forEach(t => { const o = suyas.find(r => dia(r.fecha) === dia(t.fecha) && clave(r.campo) === clave(t.campo)); if(!o) return; const a = neto(t), b = neto(o); if(a < b - 0.04) ga++; else if(b < a - 0.04) gb++; else em++; });
    const jugadas = ga + gb + em;
    h += tarjeta('Cara a cara', jugadas
      ? '<div class="cmj-h2h"><div><b class="bien">' + ga + '</b><span>ganas tú</span></div><div><b>' + em + '</b><span>empates</span></div><div><b class="azul">' + gb + '</b><span>gana ' + esc(corto(rival).split(' ')[0]) + '</span></div></div>'
        + nota(jugadas + (jugadas === 1 ? ' partida jugada' : ' partidas jugadas') + ' el mismo día y en el mismo campo. Gana el mejor neto.')
      : nota('Todavía no tenéis partidas el mismo día entre las últimas tarjetas.'));
    // Hoyo a hoyo en el campo que más habéis jugado los dos (neto, con los golpes de hándicap de cada hoyo)
    const cuenta = {}; A.forEach(t => { cuenta[t.campo] = (cuenta[t.campo] || 0) + 1; });
    const campo = Object.keys(cuenta).filter(c => B.some(t => clave(t.campo) === clave(c))).sort((a, b) => cuenta[b] - cuenta[a])[0];
    const ca = campo && campoApp(campo);
    if(ca){
      const a2 = A.filter(t => clave(t.campo) === clave(campo)), b2 = B.filter(t => clave(t.campo) === clave(campo));
      const nh = (ts, i) => media(ts, t => t.golpes[i] - recibe(t.hcp, ca.hcp[i]));
      let gy = 0, ge = 0;
      const casillas = ca.hcp.map((si, i) => { const a = nh(a2, i), b = nh(b2, i), c = a < b - 0.1 ? 'yo' : b < a - 0.1 ? 'el' : ''; if(c === 'yo') gy++; if(c === 'el') ge++; return '<div class="' + c + '">' + (i + 1) + '</div>'; }).join('');
      h += tarjeta('Hoyo a hoyo en ' + esc(campo) + ' (neto)', '<div class="cmj-hh">' + casillas + '</div>'
        + '<div class="cmj-ley"><span><i style="background:' + COL.verde + '"></i>Tú mejor (' + gy + ')</span><span><i style="background:' + COL.doble + '"></i>' + esc(corto(rival).split(' ')[0]) + ' mejor (' + ge + ')</span></div>'
        + nota('Media de cada hoyo restando los golpes de hándicap que recibe cada uno.'));
    }
    return h;
  }

  // ---------- Pantalla ----------
  const est = { activo: false, tab: 'p', yo: '', mias: null, error: false, rival: '', suyas: null, lista: [] };

  function cuerpo(){
    if(est.error) return '<div class="cmj-card cmj-vacio">No se han podido cargar tus tarjetas. Revisa la cobertura.<button type="button" class="cmj-btn" id="cmjReintentar">Probar otra vez</button></div>';
    if(!est.mias) return '<div class="cmj-card cmj-vacio">Cargando tus partidas…</div>';
    if(est.tab === 'e') return miEvolucion(est.mias);
    if(est.tab === 'c') return comparar(est.yo, est.mias, est.rival, est.suyas, est.lista);
    return miPartida(est.mias);
  }

  function pintar(){
    const box = document.getElementById('cmjBox'); if(!box) return;
    document.documentElement.classList.toggle('cmj-otra', est.tab !== 'p');
    document.querySelectorAll('#cmjTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === est.tab));
    box.innerHTML = cuerpo();
    const v = document.getElementById('cmjVerDetalle');
    if(v) v.onclick = () => { const d = document.getElementById('cmjDetalle'); d.hidden = !d.hidden; v.textContent = d.hidden ? 'Ver el detalle hoyo a hoyo ›' : 'Ocultar el detalle'; };
    const r = document.getElementById('cmjReintentar'); if(r) r.onclick = () => cargar(true);
    const s = document.getElementById('cmjRival'); if(s) s.onchange = () => elegirRival(s.value);
  }

  async function elegirRival(nombre){
    est.rival = nombre; est.suyas = null; guardar('acgolfCompararCon', nombre); pintar();
    if(!nombre) return;
    try { const l = await tarjetasDe(nombre); if(est.rival === nombre){ est.suyas = l; pintar(); } }
    catch(e){ if(est.rival === nombre){ est.suyas = []; pintar(); } }
  }

  async function cargar(forzar){
    est.error = false; if(forzar) est.mias = null; pintar();
    try {
      if(forzar) delete cache[clave(est.yo)];
      est.mias = await tarjetasDe(est.yo);
    } catch(e){ est.error = true; }
    pintar();
    listaJugadores().then(l => { est.lista = l; if(est.tab === 'c') pintar(); }).catch(() => {});
  }

  function montar(){
    const scr = document.querySelector('.screen[data-screen="4"] .screen-content');
    if(!scr) return;
    let tabs = document.getElementById('cmjTabs');
    if(!tabs){
      tabs = document.createElement('div'); tabs.id = 'cmjTabs'; tabs.className = 'cmj-tabs';
      tabs.innerHTML = '<button type="button" data-t="p">Mi partida</button><button type="button" data-t="e">Mi evolución</button><button type="button" data-t="c">Comparar</button>';
      const bar = scr.querySelector('.app-bar');
      if(bar) bar.after(tabs); else scr.prepend(tabs);
      tabs.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        est.tab = b.dataset.t; pintar();
        if(est.tab === 'c' && est.rival && !est.suyas) elegirRival(est.rival);
        try { scr.scrollTo({ top: 0 }); } catch(e){ scr.scrollTop = 0; } window.scrollTo(0, 0);
      }));
    }
    let box = document.getElementById('cmjBox');
    if(!box){ box = document.createElement('div'); box.id = 'cmjBox'; box.className = 'cmj-box'; tabs.after(box); }
    document.documentElement.classList.add('cmj-on');
    est.activo = true; est.tab = 'p';
    est.rival = leer('acgolfCompararCon'); est.suyas = null;
    cargar(false);
  }
  function desmontar(){
    est.activo = false;
    document.documentElement.classList.remove('cmj-on', 'cmj-otra');
    ['cmjTabs', 'cmjBox'].forEach(id => { const x = document.getElementById(id); if(x) x.remove(); });
  }

  const goOrig = window.goTo;
  window.goTo = function(n){
    const antes = document.querySelector('.screen.active');
    const desdePartida = antes && antes.dataset.screen === '3';
    const r = goOrig.apply(this, arguments);
    const yo = (window.miPerfil && window.miPerfil.player_name) || leer('golfAppConvMe');
    if(n === 4 && !desdePartida && yo){ est.yo = yo; desmontar(); montar(); }
    else if(est.activo) desmontar();
    return r;
  };

  // Para la vista de pruebas sin conexión
  window.cmjVista = { miPartida, miEvolucion, comparar };
})();
