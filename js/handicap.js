/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Mi hándicap: cómo cambia y por qué ---
  // Lee lo mismo que usa la base de datos para calcularlo (recalcular_handicaps_liga):
  //  · league_players: hándicap actual y el de salida (hcp_base)
  //  · tarjetas_liga_whs: cada tarjeta de la liga con sus golpes ajustados y su diferencial
  //  · handicap_historial: cada cambio, con el hándicap de antes y el de después
  // Regla: últimas 20 tarjetas; si hay menos, las que faltan cuentan como el hándicap de salida; media de las 8 mejores.
  const HCP_CAMPOS = { 'hato-verde': { n: 'Hato Verde', cr: 68.3, sl: 122 }, 'zaudin': { n: 'Zaudín', cr: 70.5, sl: 133 } };
  let hcpDatos = null;     // { jugadores, tarjetas, historial }
  let hcpVer = '';         // jugador que se está viendo

  const hEsc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const hNum = v => (v === null || v === undefined || isNaN(v)) ? '—' : (Math.round(Number(v) * 10) / 10).toFixed(1).replace('.', ',');
  const hClave = n => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const hCorto = n => { const w = String(n || '').trim().split(/\s+/); return w[1] ? w[0] + ' ' + w[1] : w[0]; };
  const hFecha = iso => { const d = new Date(iso); return d.toLocaleDateString('es-ES', { day:'numeric', month:'short' }).replace('.', ''); };

  async function hcpCargar(){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) throw new Error('sin conexión');
    const [j, t, h] = await Promise.all([
      client.from('league_players').select('name, hcp, hcp_base, active'),
      client.from('tarjetas_liga_whs').select('code, played_at, course_id, jugador, ags, diferencial'),
      client.from('handicap_historial').select('player_name, hcp_antes, hcp_despues, tarjetas_liga, cambiado_en').order('cambiado_en', { ascending: true }),
    ]);
    if(j.error) throw j.error;
    hcpDatos = { jugadores: (j.data || []).filter(x => x.active !== false), tarjetas: t.data || [], historial: h.data || [] };
  }

  // Historial limpio: un cambio por día (primer «antes» y último «después»); quita los días sin cambio real
  function hcpHistorial(nombre){
    const dias = [];
    hcpDatos.historial.filter(x => hClave(x.player_name) === hClave(nombre)).forEach(x => {
      const dia = String(x.cambiado_en).slice(0, 10), u = dias[dias.length - 1];
      if(u && u.dia === dia){ u.hcp_despues = x.hcp_despues; u.cambiado_en = x.cambiado_en; }
      else dias.push({ dia, hcp_antes: x.hcp_antes, hcp_despues: x.hcp_despues, cambiado_en: x.cambiado_en });
    });
    return dias.filter(d => Math.abs(Number(d.hcp_despues) - Number(d.hcp_antes)) >= 0.05);
  }

  // Calcula el hándicap de un jugador igual que la base de datos y devuelve todo lo necesario para explicarlo
  function hcpCalculo(nombre){
    const jug = hcpDatos.jugadores.find(x => hClave(x.name) === hClave(nombre));
    if(!jug) return null;
    const base = jug.hcp_base != null ? Number(jug.hcp_base) : Number(jug.hcp);
    const tarjetas = hcpDatos.tarjetas.filter(x => hClave(x.jugador) === hClave(jug.name))
      .sort((a, b) => new Date(b.played_at) - new Date(a.played_at)).slice(0, 20);
    const casillas = tarjetas.map(x => ({ d: Number(x.diferencial), tipo: 'tarjeta', t: x }));
    while(casillas.length < 20) casillas.push({ d: base, tipo: 'salida' });
    const orden = casillas.map((c, i) => ({ i, d: c.d })).sort((a, b) => a.d - b.d);
    const mejores = new Set(orden.slice(0, 8).map(x => x.i));
    const media = orden.slice(0, 8).reduce((s, x) => s + x.d, 0) / 8;
    const corte = orden[7].d; // la peor de las 8 que cuentan: para bajar hay que mejorarla
    const hist = hcpHistorial(jug.name);
    const ultimo = hist[hist.length - 1] || null;
    return { jug, base, casillas, mejores, media, corte, hist, ultimo, n: tarjetas.length, tarjetas };
  }

  // Línea de evolución: salida → cada cambio
  function hcpGrafico(c){
    const puntos = [{ v: c.base, f: 'Salida' }].concat(c.hist.map(x => ({ v: Number(x.hcp_despues), f: hFecha(x.cambiado_en) })));
    if(puntos.length < 2) return '<div class="hp-vacio">Cuando juegues tarjetas de la liga, aquí verás cómo va cambiando tu hándicap.</div>';
    const W = 320, H = 130, pad = 28;
    const vs = puntos.map(p => p.v), min = Math.min(...vs), max = Math.max(...vs), rango = (max - min) || 1;
    const x = i => pad + i * (W - 2 * pad) / (puntos.length - 1);
    const y = v => pad + (v - min) * (H - 2 * pad) / rango; // más bajo = mejor, va arriba
    const linea = puntos.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    return '<svg class="hp-graf" viewBox="0 0 ' + W + ' ' + (H + 22) + '" role="img" aria-label="Evolución del hándicap">'
      + '<path d="' + linea + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
      + puntos.map((p, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (i === puntos.length - 1 ? 6 : 4) + '" class="' + (i === puntos.length - 1 ? 'hp-ult' : 'hp-pt') + '"/>'
        + ((i === 0 || i === puntos.length - 1) ? '<text x="' + x(i).toFixed(1) + '" y="' + (y(p.v) - 10).toFixed(1) + '" text-anchor="' + (i === 0 ? 'start' : 'end') + '" class="hp-txt">' + hNum(p.v) + '</text>' : '')).join('')
      + '<text x="' + pad + '" y="' + (H + 18) + '" class="hp-eje">' + puntos[0].f + '</text>'
      + '<text x="' + (W - pad) + '" y="' + (H + 18) + '" text-anchor="end" class="hp-eje">' + puntos[puntos.length - 1].f + '</text>'
      + '</svg><div class="hp-leyenda">Más arriba es mejor (menos hándicap)</div>';
  }

  function hcpPintar(){
    const body = document.getElementById('hcpBody'); if(!body) return;
    if(!hcpDatos){ body.innerHTML = '<div class="hp-vacio">Cargando…</div>'; return; }
    const c = hcpCalculo(hcpVer);
    if(!c){
      body.innerHTML = '<div class="hp-vacio">No encuentro a ese jugador en la liga.</div>' + hcpTodos();
      hcpEnlazar(body); return;
    }
    const actual = Number(c.jug.hcp);
    const antes = c.ultimo ? Number(c.ultimo.hcp_antes) : c.base;
    const dif = Math.round((actual - antes) * 10) / 10;
    const flecha = dif < 0 ? '<span class="hp-baja">▼ ' + hNum(-dif) + '</span>' : dif > 0 ? '<span class="hp-sube">▲ ' + hNum(dif) + '</span>' : '<span class="hp-igual">= sin cambios</span>';
    const yo = (()=>{ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } })();

    // Qué hace falta para bajar: una tarjeta con diferencial menor que el corte
    const objetivo = ['hato-verde', 'zaudin'].map(k => {
      const cp = HCP_CAMPOS[k];
      const ags = Math.floor(cp.cr + c.corte * cp.sl / 113 - 0.0001);
      return '<div class="hp-obj"><b>' + cp.n + '</b><span>' + ags + ' golpes o menos</span></div>';
    }).join('');

    body.innerHTML =
      '<div class="hp-quien"><div><small>' + (hClave(c.jug.name) === hClave(yo) ? 'Tu hándicap' : 'Hándicap de') + '</small><b>' + hEsc(c.jug.name) + '</b></div>'
      + '<button type="button" class="hp-otro" id="hpOtro">Ver otro</button></div>'
      + '<div class="hp-hero">'
      + '<div class="hp-col"><small>Antes</small><span class="hp-antes">' + hNum(antes) + '</span></div>'
      + '<div class="hp-flecha" aria-hidden="true">→</div>'
      + '<div class="hp-col hp-col-act"><small>Ahora</small><span class="hp-ahora">' + hNum(actual) + '</span></div>'
      + '</div>'
      + '<div class="hp-cambio">' + flecha + (c.ultimo ? ' <em>· último cambio el ' + hFecha(c.ultimo.cambiado_en) + '</em>' : ' <em>· todavía con el de salida (' + hNum(c.base) + ')</em>') + '</div>'

      + '<div class="hp-sec-t">Cómo ha ido</div>' + hcpGrafico(c)

      + '<div class="hp-sec-t">De dónde sale tu número</div>'
      + '<div class="hp-expl">Se miran tus <b>últimas 20 tarjetas</b> de la liga. Llevas <b>' + c.n + '</b>; las ' + (20 - c.n) + ' que faltan cuentan como tu hándicap de salida (' + hNum(c.base) + '). De las 20 se cogen las <b>8 mejores</b> (en verde) y se hace la media.</div>'
      + '<div class="hp-rejilla">' + c.casillas.map((x, i) =>
          '<div class="hp-cas ' + x.tipo + (c.mejores.has(i) ? ' cuenta' : '') + '"' + (x.tipo === 'tarjeta' ? ' title="' + hFecha(x.t.played_at) + '"' : '') + '><b>' + hNum(x.d) + '</b><small>' + (x.tipo === 'tarjeta' ? hFecha(x.t.played_at) : 'salida') + '</small></div>').join('') + '</div>'
      + '<div class="hp-suma">Media de las 8 mejores = <b>' + hNum(c.media) + '</b></div>'

      + '<div class="hp-sec-t">Para bajar tu hándicap</div>'
      + '<div class="hp-expl">Necesitas una tarjeta mejor que la peor de tus 8 que cuentan (' + hNum(c.corte) + '). En golpes, más o menos:</div>'
      + '<div class="hp-objs">' + objetivo + '</div>'
      + '<div class="hp-nota">Son golpes «ajustados»: en cada hoyo, como mucho cuenta doble bogey más tus golpes de regalo.</div>'

      + (c.tarjetas.length ? '<div class="hp-sec-t">Tus tarjetas de la liga</div><div class="hp-tarjetas">' + c.tarjetas.map(t => {
          const cp = HCP_CAMPOS[t.course_id] || { n: t.course_id };
          return '<div class="hp-tj"><span>' + hFecha(t.played_at) + ' · ' + hEsc(cp.n) + '</span><span>' + t.ags + ' golpes aj.</span><b>' + hNum(t.diferencial) + '</b></div>';
        }).join('') + '</div>' : '')

      + '<details class="rg-item hp-como"><summary><span class="rg-st"><b>¿Cómo se calcula? Explicado fácil</b><small>La regla de la Federación, en 5 pasos</small></span><span class="rg-mas" aria-hidden="true"></span></summary>'
      + '<ul class="rg-pasos">'
      + '<li><b>Golpes ajustados.</b> En cada hoyo, como máximo cuenta un doble bogey más los golpes que te regala tu hándicap. Así un hoyo desastroso no te hunde.</li>'
      + '<li><b>La dificultad del campo.</b> Cada campo tiene dos números: Hato Verde 68,3 y 122; Zaudín 70,5 y 133. Zaudín es más difícil, así que el mismo resultado allí vale más.</li>'
      + '<li><b>El diferencial.</b> Con eso, cada tarjeta da un número: (golpes ajustados − 68,3) × 113 ÷ 122 en Hato Verde. Cuanto más bajo, mejor jugaste.</li>'
      + '<li><b>Tu hándicap.</b> La media de tus 8 mejores diferenciales de las últimas 20 tarjetas. Se recalcula solo después de cada partida y nadie puede tocarlo a mano.</li>'
      + '<li><b>Los golpes de regalo.</b> En cada partida recibes los golpes que te tocan en ese campo: tu hándicap × slope ÷ 113 + (rating − par). En Hato Verde salen casi los mismos que tu hándicap; en Zaudín, unos cuantos más porque es más difícil.</li>'
      + '</ul></details>'

      + hcpTodos();
    hcpEnlazar(body);
  }

  // Toda la liga: antes y ahora de cada uno
  function hcpTodos(){
    const filas = hcpDatos.jugadores.map(j => {
      const hist = hcpHistorial(j.name);
      const ult = hist[hist.length - 1];
      const antes = ult ? Number(ult.hcp_antes) : Number(j.hcp_base != null ? j.hcp_base : j.hcp);
      return { j, antes, ahora: Number(j.hcp), dif: Math.round((Number(j.hcp) - antes) * 10) / 10 };
    }).sort((a, b) => a.ahora - b.ahora);
    return '<div class="hp-sec-t">Toda la liga</div><div class="hp-liga">'
      + '<div class="hp-lf hp-lcab"><span>Jugador</span><span>Antes</span><span>Ahora</span></div>'
      + filas.map(f => '<button type="button" class="hp-lf" data-n="' + hEsc(f.j.name) + '"><span>' + hEsc(hCorto(f.j.name)) + '</span><span>' + hNum(f.antes) + '</span><span class="' + (f.dif < 0 ? 'hp-baja' : f.dif > 0 ? 'hp-sube' : '') + '">' + hNum(f.ahora) + (f.dif < 0 ? ' ▼' : f.dif > 0 ? ' ▲' : '') + '</span></button>').join('')
      + '</div>';
  }

  function hcpEnlazar(body){
    body.querySelectorAll('.hp-lf[data-n]').forEach(b => b.addEventListener('click', ()=>{ hcpVer = b.dataset.n; hcpPintar(); const card = document.querySelector('.hcp-card'); if(card) card.scrollTop = 0; }));
    const o = document.getElementById('hpOtro');
    if(o) o.addEventListener('click', async ()=>{ if(typeof elegirQuienEres === 'function'){ const n = await elegirQuienEres(true); if(n){ hcpVer = n; hcpPintar(); } } });
  }

  async function hcpAbrir(){
    const ov = document.getElementById('hcpOverlay'); if(!ov) return;
    let yo = ''; try { yo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
    if(!yo && typeof elegirQuienEres === 'function') yo = await elegirQuienEres();
    hcpVer = yo || hcpVer;
    ov.hidden = false;
    const card = ov.querySelector('.hcp-card'); if(card) card.scrollTop = 0;
    hcpPintar();
    try { await hcpCargar(); if(!hcpVer && hcpDatos.jugadores[0]) hcpVer = hcpDatos.jugadores[0].name; hcpPintar(); }
    catch(e){ const body = document.getElementById('hcpBody'); if(body) body.innerHTML = '<div class="hp-vacio">No se pudo cargar. Revisa la conexión.</div>'; }
  }
  function hcpCerrar(){ const ov = document.getElementById('hcpOverlay'); if(ov) ov.hidden = true; }

  (function(){
    const b = document.getElementById('hmHcp'); if(b) b.addEventListener('click', hcpAbrir);
    ['hcpCerrar', 'hcpVolver', 'hcpVolver2'].forEach(id => { const x = document.getElementById(id); if(x) x.addEventListener('click', hcpCerrar); });
  })();
