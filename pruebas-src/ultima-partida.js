// © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE.
// «Tu última partida» (sustituye al Hoyo 19 con la cerveza): marcador profesional hoyo a hoyo + resumen técnico.
// Según la modalidad: golpes (neto con signo sobre el par) o Stableford (puntos). Colores de los hoyos: los de siempre, sin hándicap.
(function(){
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const signo = d => d === 0 ? 'E' : (d > 0 ? '+' : '−') + Math.abs(d);
  const coma = n => String(n).replace('.', ',');
  const clase = d => d <= -2 ? 'eag' : d === -1 ? 'bir' : d === 0 ? 'par' : d === 1 ? 'bog' : 'dob';

  // Todo lo que sale de una partida terminada para UN jugador (sin tocar nada de la base)
  function datos(round, nombre){
    const V = window.acgolfEnVivo; if(!V || !round) return null;
    const tb = V.tabla(round) || [], yo = norm(nombre);
    const idx = tb.findIndex(x => norm(x.n) === yo); if(idx < 0) return null;
    const e = tb[idx], g = e.g, pares = V.paresDe(round), si = V.dificultadDe(round), n = V.nHoyos(g), orden = V.ordenDe(g);
    const rec = h => n === 9 ? Math.floor(e.hc / 9) + ((e.hc % 9) >= (si[h - 1] || 9) ? 1 : 0) : V.golpesRegalo(e.hc, si[h - 1] || 18);
    const holes = orden.map(h => {
      const v = +e.sc[h] || 0, par = pares[h - 1] || 4, r = rec(h);
      return { h, par, v, r, d: v ? v - par : null, pts: v ? Math.max(0, 2 - (v - par - r)) : null };
    });
    const hechos = holes.filter(x => x.v > 0);
    let puesto = 1; for(let i = 0; i < idx; i++){ const o = tb[i], mejor = e.esPtos ? o.pts > e.pts : o.neto < e.neto; if(mejor) puesto++; }
    return { e, holes, hechos, n, esPtos: !!e.esPtos, jugadores: tb.length, puesto, salida: V.ordenDe(g)[0], pares };
  }

  function chips(h){ return h.map(x => '<div class="up-h"><i>' + x.h + '</i><span class="up-s ' + (x.v ? clase(x.d) : 'vac') + '">' + (x.v || '–') + '</span></div>').join(''); }

  // Tarjeta pequeña del Inicio
  function tarjeta(D, campo, cuando){
    const big = D.esPtos ? D.e.pts + '<small> puntos</small>' : signo(D.e.neto) + '<small> neto</small>';
    const sub = D.esPtos ? D.e.bruto + ' golpes' : D.e.bruto + ' golpes − ' + D.e.hc + ' de hándicap';
    const filas = [D.holes.slice(0, 9)].concat(D.holes.length > 9 ? [D.holes.slice(9)] : []);
    return '<div class="lm-k">Tu última partida' + (cuando ? ' · ' + esc(cuando) : '') + '</div>'
      + '<div class="up-cab"><div class="up-big">' + big + '</div><div class="up-dnd"><b>' + esc(campo || '') + '</b><span>' + esc(sub) + '</span></div></div>'
      + filas.map(f => '<div class="up-tira">' + chips(f) + '</div>').join('')
      + '<button type="button" class="lm-oro" data-up="abrir">Ver la partida completa</button>';
  }

  // Tabla de 9 hoyos (ida o vuelta)
  function tabla9(D, h, titulo, etqTot){
    const sum = f => h.reduce((a, x) => a + (f(x) || 0), 0);
    const filaH = '<tr><th class="l">HOYO</th>' + h.map(x => '<th>' + x.h + '</th>').join('') + '<th class="t">' + etqTot + '</th></tr>';
    const filaP = '<tr class="par"><td class="l">PAR</td>' + h.map(x => '<td>' + x.par + '</td>').join('') + '<td class="t">' + sum(x => x.par) + '</td></tr>';
    const filaR = '<tr><td class="l">HCP</td>' + h.map(x => '<td>' + (x.r > 0 ? '<i class="dot"></i>'.repeat(Math.min(x.r, 3)) : '') + '</td>').join('') + '<td class="t"></td></tr>';
    const filaG = '<tr class="gol"><td class="l">GOLPES</td>' + h.map(x => '<td><div class="up-s ' + (x.v ? clase(x.d) : 'vac') + '">' + (x.v || '–') + '</div></td>').join('') + '<td class="t">' + sum(x => x.v) + '</td></tr>';
    const filaS = '<tr class="pts"><td class="l">PUNTOS</td>' + h.map(x => '<td>' + (x.v ? x.pts : '–') + '</td>').join('') + '<td class="t">' + sum(x => x.pts) + '</td></tr>';
    return '<div class="up-c"><div class="up-e">' + titulo + '</div><table class="up-t' + (D.esPtos ? ' up-ptos' : '') + '">' + filaH + filaP + filaR + filaG + (D.esPtos ? filaS : '') + '</table></div>';
  }

  function resumen(D){
    const H = D.hechos, e = D.e;
    const cuenta = f => H.filter(f).length;
    const tipos = [3, 4, 5].map(p => { const x = H.filter(h => h.par === p); return { p, n: x.length, media: x.length ? x.reduce((a, h) => a + h.v, 0) / x.length : 0, sobre: x.reduce((a, h) => a + h.d, 0), pts: x.reduce((a, h) => a + h.pts, 0), mpts: x.length ? x.reduce((a, h) => a + h.pts, 0) / x.length : 0 }; }).filter(t => t.n);
    const mitad = D.holes.length > 9 ? [D.holes.slice(0, 9).filter(x => x.v), D.holes.slice(9).filter(x => x.v)] : null;
    let k;
    if(D.esPtos){
      k = [[e.pts, 'Puntos'], [cuenta(h => h.pts >= 3), 'Hoyos de 3 o más'], [cuenta(h => h.pts === 2), 'Hoyos de 2'], [cuenta(h => h.pts === 1), 'Hoyos de 1'], [cuenta(h => h.pts === 0), 'Hoyos sin puntos'], [coma((e.pts / Math.max(1, H.length)).toFixed(1)), 'Puntos por hoyo']];
    } else {
      k = [[cuenta(h => h.d <= -1), 'Birdies o mejor'], [cuenta(h => h.d === 0), 'Pares'], [cuenta(h => h.d === 1), 'Bogeys'], [cuenta(h => h.d >= 2), 'Dobles o peor'], [mitad ? mitad[0].reduce((a, x) => a + x.v, 0) + ' / ' + mitad[1].reduce((a, x) => a + x.v, 0) : e.bruto, mitad ? 'Primeros 9 / últimos 9' : 'Golpes'], [signo(e.neto), 'Neto']];
    }
    const kHtml = '<div class="up-k">' + k.map(x => '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>').join('') + '</div>';
    const tipoHtml = '<div class="up-c"><table class="up-t up-tp"><tr><th class="l">TIPO</th><th>HOYOS</th><th>MEDIA</th><th>' + (D.esPtos ? 'PUNTOS' : 'SOBRE EL PAR') + '</th></tr>'
      + tipos.map(t => '<tr><td class="l">Par ' + t.p + '</td><td>' + t.n + '</td><td>' + coma(t.media.toFixed(1)) + '</td><td class="hi">' + (D.esPtos ? t.pts : signo(t.sobre)) + '</td></tr>').join('') + '</table></div>';
    let mitHtml = '';
    if(mitad && mitad[0].length && mitad[1].length){
      const val = a => D.esPtos ? a.reduce((s, x) => s + x.pts, 0) : a.reduce((s, x) => s + x.d, 0);
      const A = val(mitad[0]), B = val(mitad[1]), mx = Math.max(1, Math.abs(A), Math.abs(B));
      const fila = (t, v) => '<div class="up-bar"><span>' + t + '</span><i><u style="width:' + Math.max(8, Math.round(Math.abs(v) / mx * 100)) + '%"></u></i><b>' + (D.esPtos ? v + ' pts' : signo(v)) + '</b></div>';
      mitHtml = '<div class="up-st">IDA CONTRA VUELTA</div><div class="up-c">' + fila(D.salida === 1 ? 'Ida' : 'Primeros 9', A) + fila(D.salida === 1 ? 'Vuelta' : 'Últimos 9', B) + '<div class="up-nota">' + (D.esPtos ? 'Puntos Stableford' : 'Sobre el par, sin hándicap') + '</div></div>';
    }
    // Mejor, peor y racha
    const val = x => D.esPtos ? x.pts : -x.d;
    const mejorV = Math.max(...H.map(val)), peorV = Math.min(...H.map(val));
    const lista = v => H.filter(x => val(x) === v).map(x => x.h);
    const descr = x => D.esPtos ? x + ' pts' : signo(-x);
    let racha = 0, ini = 0, rIni = 0, rFin = 0;
    H.forEach((x, i) => { const bien = D.esPtos ? x.pts >= 2 : x.d <= 0; if(bien){ if(!racha) ini = i; racha++; if(racha > (rFin - rIni + 1 || 0) || (rFin === 0 && rIni === 0)){ rIni = ini; rFin = i; } } else racha = 0; });
    const rl = H.length ? rFin - rIni + 1 : 0, rachaOk = H.length && (D.esPtos ? H[rIni].pts >= 2 : H[rIni].d <= 0) && rl >= 3;
    const mp = '<div class="up-c up-mp"><p><b>Mejor:</b> hoyo' + (lista(mejorV).length > 1 ? 's ' : ' ') + lista(mejorV).join(' y ') + ' (' + (D.esPtos ? mejorV + ' pts' : (mejorV === 1 ? 'birdie' : mejorV >= 2 ? 'águila o mejor' : signo(-mejorV))) + ')</p>'
      + '<p><b>Peor:</b> hoyo' + (lista(peorV).length > 1 ? 's ' : ' ') + lista(peorV).join(' y ') + ' (' + (D.esPtos ? peorV + ' pts' : signo(-peorV)) + ')</p>'
      + (rachaOk ? '<p><b>Mejor racha:</b> hoyos ' + H[rIni].h + ' al ' + H[rFin].h + (D.esPtos ? ', con 2 puntos o más cada uno' : ', sin pasar del par') + '</p>' : '') + '</div>';
    return '<div class="up-st">DATOS CLAVE</div>' + kHtml + '<div class="up-st">POR TIPO DE HOYO</div>' + tipoHtml + mitHtml + '<div class="up-st">LO MEJOR Y LO PEOR</div>' + mp;
  }

  function pantalla(D, info){
    const e = D.e, V = window.acgolfEnVivo;
    const big = D.esPtos ? e.pts + '<small> puntos</small>' : signo(e.neto) + '<small> neto</small>';
    const sub = D.esPtos ? e.bruto + ' golpes · neto ' + signo(e.neto) : e.bruto + ' golpes − ' + e.hc + ' de hándicap';
    const sub2 = '';
    const parts = D.holes.length > 9 ? [D.holes.slice(0, 9), D.holes.slice(9)] : [D.holes];
    const tit = (i, h) => D.holes.length > 9 && D.salida === 1 ? (i ? 'VUELTA · HOYOS 10 A 18' : 'IDA · HOYOS 1 A 9') : 'HOYOS ' + h[0].h + ' A ' + h[h.length - 1].h + (D.holes.length > 9 ? '' : '');
    const etq = i => D.holes.length > 9 && D.salida === 1 ? (i ? 'IN' : 'OUT') : 'SUMA';
    return '<button type="button" class="up-vol" data-up="cerrar">‹ Volver</button>'
      + '<h1 class="up-h1">Tu partida</h1><p class="up-sub">' + esc([info.nombre, info.campo, info.cuando].filter(Boolean).join(' · ')) + '</p>'
      + '<div class="up-c up-res"><div class="up-e">RESULTADO</div><div class="up-cab"><div class="up-big">' + big + '</div><div class="up-dnd">'
      + (D.jugadores > 1 ? '<span class="up-chip">' + D.puesto + '.º de ' + D.jugadores + '</span>' : '') + '<span>' + esc(sub) + '</span>' + (sub2 ? '<span>' + sub2 + '</span>' : '') + '</div></div></div>'
      + parts.map((h, i) => tabla9(D, h, tit(i, h), etq(i))).join('')
      + '<div class="up-ley"><span class="up-s eag">2</span>Águila<span class="up-s bir">3</span>Birdie<span class="up-s par">4</span>Par<span class="up-s bog">5</span>Bogey<span class="up-s dob">6</span>Doble o más<span><i class="dot"></i> golpe de hándicap</span></div>'
      + '<h1 class="up-h1 up-h2">Resumen técnico</h1>' + resumen(D)
      + '<button type="button" class="up-rojo" data-up="completa">Ver la partida completa</button>';
  }

  // ---------- Inicio y pantalla ----------
  let ov = null, actual = null;
  function abrir(){
    if(!actual) return;
    if(!ov){ ov = document.createElement('div'); ov.id = 'upPant'; ov.className = 'up-ov'; ov.hidden = true; document.body.appendChild(ov);
      ov.addEventListener('click', async ev => { const b = ev.target.closest('[data-up]'); if(!b) return;
        if(b.dataset.up === 'cerrar'){ ov.hidden = true; document.documentElement.classList.remove('up-abierto'); return; }
        if(b.dataset.up === 'completa' && actual && typeof joinSharedRound === 'function' && !b.dataset.busy){
          b.dataset.busy = '1'; const t = b.textContent; b.textContent = 'Abriendo…';
          try { const res = await joinSharedRound(actual.code); if(res && res.ok && typeof goTo === 'function'){ ov.hidden = true; document.documentElement.classList.remove('up-abierto'); goTo(3); } }
          finally { delete b.dataset.busy; b.textContent = t; } } });
    }
    ov.innerHTML = pantalla(actual.D, actual); ov.scrollTop = 0; ov.hidden = false; document.documentElement.classList.add('up-abierto');
  }

  function cuandoTxt(fecha){
    if(!fecha) return '';
    const d = new Date(fecha); if(isNaN(d)) return '';
    const dif = Math.round((new Date(new Date().toDateString()) - new Date(d.toDateString())) / 86400000);
    return dif <= 0 ? 'hoy' : dif === 1 ? 'ayer' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }

  window.acgolfUltima = { datos, tarjeta, pantalla, abrir,
    poner(round, code, fecha){ const nombre = window.miPerfil && window.miPerfil.player_name; const D = datos(round, nombre); if(!D || !D.hechos.length) return null;
      const campo = (round.course_name || '').replace(/^Club( de Golf)?\s+/i, ''); actual = { D, code, campo, nombre, cuando: cuandoTxt(fecha) }; return actual; },
    html(){ return actual ? tarjeta(actual.D, actual.campo, actual.cuando) : ''; } };
})();
