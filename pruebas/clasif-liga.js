/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Clasificación liga (norma de Carlos, 14-nov-2026): dos pestañas, «Esta liga» y «General del año».
// - Esta liga: la clasificación de una liga del grupo (puntos de la propia liga: F1 o Stableford).
// - General del año: al terminar cada liga, todos los que han jugado suman 100 × (jugadores − puesto + 1) ÷ jugadores
//   (empates: se reparten); cuenta el 80 % de las ligas de cada uno (hacia abajo, mínimo 1), las mejores.
// El nombre de cada liga es el que se puso al crearla. Sustituye a la clasificación del mes.
(function(){
  'use strict';
  if(typeof ligaResultados !== 'function' || typeof ligaTabla !== 'function' || typeof ligaDesdeFila !== 'function') return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const miNombre = () => (window.miPerfil && window.miPerfil.player_name) || '';
  const soyYo = n => !!miNombre() && norm(n) === norm(miNombre());
  const hoyIso = () => (typeof ligaHoy === 'function' ? ligaHoy() : new Date().toISOString().slice(0, 10));

  let ligas = [], datos = {}, cargado = false, cargando = false;
  let vista = { tab: 'esta', code: null, anio: new Date().getFullYear(), detalle: false };

  async function cargarLigas(){
    const client = initSupabase(); if(!client) return [];
    let q = client.from('rounds').select('id, code, grupo_id, match_groups, updated_at, created_at').is('course_id', null).eq('round_name', LIGA_TAG);
    const gid = window.miPerfil && window.miPerfil.grupo_id;
    if(gid) q = q.eq('grupo_id', gid);
    const { data, error } = await q.order('created_at', { ascending: false });
    if(error) throw error;
    return (data || []).map(r => Object.assign(ligaDesdeFila(r), { grupo_id: r.grupo_id }));
  }
  const parTotal = j => { try { const c = ligaCampo(j.courseId); return (c.par || []).reduce((a, b) => a + Number(b || 0), 0); } catch(e){ return 72; } };

  // Resumen de una liga: tabla, estado y resultados
  function resumen(l, res){
    const hoy = hoyIso();
    const tabla = ligaTabla(l, res, l.regla || 'todas').filter(f => f.entra && f.jugadas > 0);
    const jugadasJ = l.jornadas.filter(j => (res[j.n] || []).length).length;
    const terminada = jugadasJ > 0 && l.jornadas.every(j => (res[j.n] || []).length || j.date < hoy);
    const fechas = l.jornadas.map(j => j.date).sort();
    const ultima = fechas[fechas.length - 1] || '';
    return { l, res, tabla, jugadasJ, total: l.jornadas.length, terminada, ultima, anio: Number(String(ultima).slice(0, 4)) || new Date().getFullYear() };
  }
  async function cargarTodo(){
    if(cargando) return; cargando = true;
    try {
      ligas = await cargarLigas();
      datos = {};
      for(const l of ligas){
        let res = {}; try { res = await ligaResultados(l); } catch(e){ console.error(e); }
        datos[l.code] = resumen(l, res);
      }
      cargado = true;
    } catch(e){ console.error('No se pudo cargar las ligas', e); ligas = []; cargado = true; }
    cargando = false;
  }

  // ---- General del año ----
  function puntosGeneral(r){
    // r.tabla ya viene ordenada; empates = mismos puntos de liga → se reparten los puntos de los puestos que ocupan
    const n = r.tabla.length, out = [];
    let i = 0;
    while(i < n){
      let j = i; while(j + 1 < n && r.tabla[j + 1].puntos === r.tabla[i].puntos) j++;
      let suma = 0; for(let k = i; k <= j; k++) suma += 100 * (n - (k + 1) + 1) / n;
      const p = Math.round(suma / (j - i + 1));
      for(let k = i; k <= j; k++) out.push({ jugador: r.tabla[k].jugador, pos: i + 1, pts: p });
      i = j + 1;
    }
    return out;
  }
  function general(anio){
    const fin = Object.values(datos).filter(r => r.terminada && r.anio === anio).sort((a, b) => a.ultima.localeCompare(b.ultima));
    const por = {};
    fin.forEach(r => {
      const mejorNeto = {};
      r.l.jornadas.forEach(j => (r.res[j.n] || []).forEach(f => { const d = f.neto - parTotal(j); if(mejorNeto[f.jugador] == null || d < mejorNeto[f.jugador]) mejorNeto[f.jugador] = d; }));
      puntosGeneral(r).forEach(x => {
        (por[x.jugador] = por[x.jugador] || { jugador: x.jugador, ligas: [], neto: null, ultima: '' });
        por[x.jugador].ligas.push({ code: r.l.code, nombre: r.l.nombre, pts: x.pts, pos: x.pos, fecha: r.ultima });
        const d = mejorNeto[x.jugador]; if(d != null && (por[x.jugador].neto == null || d < por[x.jugador].neto)) por[x.jugador].neto = d;
        if(r.ultima > por[x.jugador].ultima) por[x.jugador].ultima = r.ultima;
      });
    });
    const filas = Object.values(por).map(p => {
      const cuentan = Math.max(1, Math.floor(p.ligas.length * 0.8));
      const orden = p.ligas.slice().sort((a, b) => b.pts - a.pts || b.fecha.localeCompare(a.fecha));
      const set = new Set(orden.slice(0, cuentan).map(x => x.code));
      p.cuentan = cuentan; p.valen = set; p.total = orden.slice(0, cuentan).reduce((a, x) => a + x.pts, 0);
      return p;
    });
    filas.sort((a, b) => b.total - a.total || (a.neto ?? 99) - (b.neto ?? 99) || b.ultima.localeCompare(a.ultima));
    filas.forEach((f, i) => f.pos = i + 1);
    const todasAnio = Object.values(datos).filter(r => r.anio === anio);
    return { filas, fin, todasAnio };
  }
  const aniosConLigas = () => Array.from(new Set(Object.values(datos).map(r => r.anio))).sort();

  // ---- Pintado ----
  function tarjetaPosicion(filas, valor, titulo, etiquetaPts){
    const yo = filas.find(f => soyYo(f.jugador));
    if(!yo) return '<div class="cl-yo cl-yo-no"><small>' + titulo + '</small><p>Todavía no has sumado puntos aquí.</p></div>';
    const i = filas.indexOf(yo), v = valor(yo);
    let linea;
    if(i === 0){
      const s = filas[1]; linea = s ? 'Vas líder, <b>' + (v - valor(s)) + ' puntos</b> por delante de ' + esc(s.jugador) + '.' : 'Vas líder.';
    } else {
      const a = filas[i - 1], d = valor(a) - v;
      linea = d === 0 ? 'Empatado con <b>' + esc(a.jugador) + '</b>.' : 'Te faltan <b>' + d + ' puntos</b> para igualar a ' + esc(a.jugador) + '.';
    }
    return '<div class="cl-yo"><small>' + titulo + '</small><div class="cl-yo-g"><b>' + (i + 1) + '.º</b><span>' + v + ' ' + etiquetaPts + '</span></div><p>' + linea + '</p></div>';
  }
  function podioYLista(filas, valor){
    const t = filas.slice(0, 3);
    const celda = (f, p, cls) => f ? '<div class="' + (cls || '') + (soyYo(f.jugador) ? ' cl-soy' : '') + '"><i>' + p + '</i><b>' + esc(f.jugador) + '</b><span>' + valor(f) + '</span></div>' : '<div class="cl-vacio"></div>';
    let h = '<div class="cl-podio">' + celda(t[1], 2) + celda(t[0], 1, 'cl-p1') + celda(t[2], 3) + '</div>';
    h += filas.slice(3).map((f, k) => '<div class="cl-fila' + (soyYo(f.jugador) ? ' cl-soy' : '') + '"><span class="cl-pos">' + (k + 4) + '</span><b>' + esc(f.jugador) + '</b><span class="cl-pt">' + valor(f) + '</span></div>').join('');
    return h;
  }
  function pestanas(){
    return '<div class="cl-tabs"><button type="button" class="cl-tab' + (vista.tab === 'esta' ? ' on' : '') + '" data-tab="esta">Esta liga</button>'
      + '<button type="button" class="cl-tab' + (vista.tab === 'gen' ? ' on' : '') + '" data-tab="gen">General ' + vista.anio + '</button></div>';
  }

  function pintarEsta(c){
    if(!ligas.length){ return '<div class="cl-vacio-msg">Todavía no hay ninguna liga en tu grupo. Cuando se cree una, su clasificación saldrá aquí.</div>'; }
    if(!vista.code || !datos[vista.code]){
      const orden = Object.values(datos).slice().sort((a, b) => (a.terminada - b.terminada) || b.ultima.localeCompare(a.ultima));
      vista.code = (orden[0] || { l: ligas[0] }).l.code;
    }
    const r = datos[vista.code];
    const stb = r.l.formato === 'stableford';
    const valor = f => f.puntos;
    const opciones = ligas.map(l => '<option value="' + esc(l.code) + '"' + (l.code === vista.code ? ' selected' : '') + '>' + esc(l.nombre) + '</option>').join('');
    let h = '<label class="cl-sel"><small>LIGA</small><select id="clSel">' + opciones + '</select></label>';
    if(vista.detalle){
      h += '<h2 class="cl-h2">Puntos por jornada</h2><p class="cl-sub">' + (stb ? 'Puntos Stableford' : 'Puntos por puesto (neto, con hándicap): 25 · 18 · 15 · 12 · 10 · 8 · 6 · 4 · 2 · 1') + '</p>';
      h += r.tabla.map((f, i) => '<div class="cl-fila cl-fila-d' + (soyYo(f.jugador) ? ' cl-soy' : '') + '"><div class="cl-fila-top"><span class="cl-pos">' + (i + 1) + '</span><b>' + esc(f.jugador) + '</b><span class="cl-pt">' + f.puntos + '</span></div><div class="cl-chips">'
        + r.l.jornadas.map(j => { const x = (r.res[j.n] || []).find(z => z.jugador === f.jugador); const desc = f.descartadas.some(d => d.n === j.n); return '<span class="cl-chip' + (x ? (desc ? ' no' : ' ok') : ' no') + '">J' + j.n + ' ' + (x ? x.puntos : '–') + '</span>'; }).join('') + '</div></div>').join('');
      h += '<button type="button" class="cl-btn" id="clVolverD">‹ VOLVER</button>';
      return h;
    }
    h += '<p class="cl-sub">Jornadas jugadas: ' + r.jugadasJ + ' de ' + r.total + (r.terminada ? ' · liga terminada' : '') + '</p>';
    if(!r.tabla.length) return h + '<div class="cl-vacio-msg">Los puntos empiezan a contar cuando se juegue la primera jornada.</div>';
    h += tarjetaPosicion(r.tabla, valor, 'TU POSICIÓN · JORNADA ' + r.jugadasJ + ' DE ' + r.total, 'puntos');
    h += podioYLista(r.tabla, valor);
    h += '<button type="button" class="cl-btn" id="clDetalle">VER PUNTOS POR JORNADA</button>';
    return h;
  }

  function pintarGeneral(c){
    const g = general(vista.anio);
    const anios = aniosConLigas();
    let h = '';
    if(anios.length > 1) h += '<div class="cl-anio"><button type="button" data-a="-1"' + (vista.anio <= anios[0] ? ' disabled' : '') + '>‹</button><b>' + vista.anio + '</b><button type="button" data-a="1"' + (vista.anio >= anios[anios.length - 1] ? ' disabled' : '') + '>›</button></div>';
    if(vista.detalle){
      h += '<h2 class="cl-h2">Puntos por liga</h2><p class="cl-sub">En verde cuenta · tachado no cuenta (regla del 80 %)</p>';
      h += g.filas.map(f => '<div class="cl-fila cl-fila-d' + (soyYo(f.jugador) ? ' cl-soy' : '') + '"><div class="cl-fila-top"><span class="cl-pos">' + f.pos + '</span><b>' + esc(f.jugador) + '</b><span class="cl-pt">' + f.total + '</span></div><div class="cl-chips">'
        + f.ligas.map(x => '<span class="cl-chip' + (f.valen.has(x.code) ? ' ok' : ' no') + '">' + esc(x.nombre) + ' ' + x.pts + '</span>').join('') + '</div></div>').join('');
      h += '<button type="button" class="cl-btn" id="clVolverD">‹ VOLVER</button>';
      return h;
    }
    if(!g.filas.length){
      h += '<div class="cl-vacio-msg">Todavía no hay ligas terminadas en ' + vista.anio + '. Cuando termine la primera, sus puntos salen aquí.</div>';
    } else {
      h += '<p class="cl-sub">Año ' + vista.anio + ' · suman las ligas terminadas. Cuenta el 80 % de las ligas que juega cada uno.</p>';
      h += tarjetaPosicion(g.filas, f => f.total, 'TU POSICIÓN', 'puntos');
      h += podioYLista(g.filas, f => f.total);
      h += '<button type="button" class="cl-btn" id="clDetalle">VER TODOS LOS PUNTOS POR LIGA</button>';
    }
    // Cómo va el año
    const tot = g.todasAnio.length, fin = g.fin.length;
    if(tot){
      const faltan = g.todasAnio.filter(r => !r.terminada).map(r => esc(r.l.nombre));
      h += '<div class="cl-card"><b>Ligas terminadas:</b> ' + fin + ' de ' + tot + '<div class="cl-barra"><i style="width:' + Math.round(100 * fin / tot) + '%"></i></div>'
        + (faltan.length ? 'Falta: <b>' + faltan.join(', ') + '</b>. Después, el Campeonato final.' : 'Todas las ligas están terminadas. Toca el Campeonato final.') + '</div>';
    }
    h += '<div class="cl-card"><b>Campeonato de campeones</b><br>Una ronda a golpes, siempre con hándicap al 95 %, en el campo de la liga más reciente. La fecha la fija el organizador antes del 31 de diciembre; si no, es el último domingo de diciembre.</div>';
    // Salón de campeones: una tarjeta por liga terminada, con el nombre de la liga
    if(g.fin.length){
      h += '<h2 class="cl-h2">Salón de campeones</h2>' + g.fin.slice().reverse().map(r => '<div class="cl-card cl-camp"><div class="cl-copa">🏆</div><div><b>' + esc(r.l.nombre) + '</b><br>' + esc((r.tabla[0] || {}).jugador || '') + '</div></div>').join('');
    }
    return h;
  }

  function cuerpo(){
    const el = document.getElementById('clNuevo'); if(!el) return;
    if(!cargado){ el.innerHTML = '<div class="cl-vacio-msg">Cargando…</div>'; return; }
    el.innerHTML = pestanas() + (vista.tab === 'esta' ? pintarEsta() : pintarGeneral());
    el.querySelectorAll('.cl-tab').forEach(b => b.onclick = () => { vista.tab = b.dataset.tab; vista.detalle = false; cuerpo(); });
    const s = document.getElementById('clSel'); if(s) s.onchange = () => { vista.code = s.value; vista.detalle = false; cuerpo(); };
    const d = document.getElementById('clDetalle'); if(d) d.onclick = () => { vista.detalle = true; cuerpo(); window.scrollTo(0, 0); };
    const v = document.getElementById('clVolverD'); if(v) v.onclick = () => { vista.detalle = false; cuerpo(); };
    el.querySelectorAll('.cl-anio button').forEach(b => b.onclick = () => { vista.anio += Number(b.dataset.a); cuerpo(); });
  }

  function asegurarCaja(){
    const cont = document.querySelector('.screen[data-screen="6"] .screen-content'); if(!cont) return null;
    let el = document.getElementById('clNuevo');
    if(!el){ el = document.createElement('div'); el.id = 'clNuevo'; const b = cont.querySelector('.home-volver') || cont.querySelector('.app-bar'); b.insertAdjacentElement('afterend', el); }
    return el;
  }
  window.renderLigaStandings = async function(){
    if(!asegurarCaja()) return;
    vista.detalle = false;
    cargado = false; cuerpo();
    await cargarTodo();
    // si no hay ligas terminadas este año pero sí en otro, abre el más reciente
    const an = aniosConLigas(); if(an.length && !an.includes(vista.anio)) vista.anio = an[an.length - 1];
    cuerpo();
  };
  window.acgolfClasifLiga = { general, datos: () => datos, cargarTodo, puntosGeneral };
})();
