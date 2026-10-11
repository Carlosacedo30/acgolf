/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Ryder Cup entre dos equipos del grupo ---
// Dos equipos (nombre y color que elige el administrador). Todo se juega a match play (hoyo a hoyo) con hándicap,
// en tres modalidades:
//  · Foursome: pareja contra pareja, una sola bola por pareja y golpes alternos. Hándicap: la mitad de la suma de la pareja.
//  · Fourball: pareja contra pareja, cada uno su bola; cuenta la mejor de la pareja. Hándicap: 90 % de cada jugador.
//  · Individual: uno contra uno. Hándicap: 100 %.
// En cada partido, quien tiene el hándicap más bajo juega sin golpes y los demás reciben la diferencia
// en los hoyos más difíciles. La app empareja por hándicap y el administrador puede cambiarlo.
// Puntos: ganar un partido = 1 punto para su equipo; empatarlo = ½ punto para cada equipo.
// Se guarda como una fila de "rounds" sin campo (course_id vacío), igual que las convocatorias:
// no sale en «Últimas partidas» ni cuenta para la liga.
(function(){
  const TAG = 'Ryder Cup';
  const BARRA = 'amarillas';
  const MODOS = {
    foursome:   { nombre: 'Foursome',    explica: 'Una bola por pareja, golpes alternos', porPareja: true },
    fourball:   { nombre: 'Fourball',    explica: 'Cada uno su bola, cuenta la mejor de la pareja', porPareja: true },
    individual: { nombre: 'Individuales', explica: 'Uno contra uno', porPareja: false },
  };
  const ORDEN_MODOS = ['foursome', 'fourball', 'individual'];
  const COLORES = [['#C8102E','Rojo'],['#1F4E9C','Azul'],['#0A9B4E','Verde'],['#E0A800','Amarillo'],['#6B3FA0','Morado'],['#E06A1B','Naranja'],['#2B2F36','Negro'],['#0E8C9A','Turquesa']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $ = id => document.getElementById(id);
  const admin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || '';
  const corto = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w.slice(0, 2).join(' ') : w.join(' '); };
  const primero = n => String(n || '').trim().split(/\s+/)[0] || '';
  const lado = l => l.length > 1 ? l.map(primero).join(' y ') : corto(l[0]);
  const hcpDe = n => { const h = Number((typeof FAVORITE_HANDICAPS !== 'undefined' ? FAVORITE_HANDICAPS : {})[n]); return isNaN(h) ? null : h; };
  const coma = v => v == null ? '—' : String(v).replace('.', ',');
  const campoDe = id => { const l = typeof COURSES !== 'undefined' ? COURSES : []; return l.find(c => c.id === id) || l.find(c => c.id === 'hato-verde'); };
  const nombresGrupo = () => (typeof FAVORITE_PLAYERS !== 'undefined' ? FAVORITE_PLAYERS.slice() : []).sort((a, b) => a.localeCompare(b, 'es'));
  const ordenHcp = l => l.slice().sort((x, y) => (hcpDe(x) == null ? 99 : hcpDe(x)) - (hcpDe(y) == null ? 99 : hcpDe(y)) || x.localeCompare(y, 'es'));
  function fechaLarga(iso){
    if(!iso) return '';
    const s = new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function hoyIso(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  let ryder = null;       // la Ryder que se está viendo
  let canal = null;
  let vista = 'marcador'; // 'marcador' | 'duelo' | 'crear' | 'info'
  let dueloIdx = -1, hoyoSel = 0, cuentas = null; // anotando un hoyo: golpes de cada bola
  let borrador = null;    // creando una Ryder nueva

  // ---------- Base de datos ----------
  // Cada partido: { tipo, a:[nombres], b:[nombres], ha:[hcp], hb:[hcp], ga:[[golpes por hoyo] por bola], gb:[...] }
  function deFila(row){
    const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
    const meta = (mg.find(g => g && g.meta) || {}).meta || {};
    const eq = k => ((mg.find(g => g && g.equipo === k) || {}).players || []).slice();
    const duelos = mg.filter(g => g && g.duelo).map(g => ({ tipo: g.tipo || 'individual', a: (g.a || []).slice(), b: (g.b || []).slice(),
      ha: (g.ha || []).slice(), hb: (g.hb || []).slice(),
      ga: (g.ga || []).map(x => (x || []).slice()), gb: (g.gb || []).map(x => (x || []).slice()) }));
    return { id: row.id, code: row.code, updatedAt: row.updated_at, meta, A: eq('A'), B: eq('B'), duelos };
  }
  function aGrupos(r){
    const v = () => ({ scores: {}, handicaps: [] });
    return [Object.assign({ meta: r.meta, players: [] }, v()),
      Object.assign({ equipo: 'A', players: r.A }, v()), Object.assign({ equipo: 'B', players: r.B }, v())]
      .concat(r.duelos.map(d => Object.assign({ duelo: true, tipo: d.tipo, a: d.a, b: d.b, ha: d.ha, hb: d.hb, ga: d.ga, gb: d.gb, players: d.a.concat(d.b) }, v())));
  }
  async function traerUltima(){
    const client = initSupabase(); if(!client) return null;
    const { data, error } = await client.from('rounds').select('id, code, match_groups, updated_at')
      .eq('round_name', TAG).order('created_at', { ascending: false }).limit(1);
    if(error || !data || !data.length) return null;
    return deFila(data[0]);
  }
  async function traer(code){
    const client = initSupabase(); if(!client) return null;
    const { data } = await client.from('rounds').select('id, code, match_groups, updated_at').eq('code', code).maybeSingle();
    return data ? deFila(data) : null;
  }
  // Cambia la Ryder sin pisar lo que haya guardado otro móvil a la vez
  async function cambiar(fn){
    const client = initSupabase(); if(!client || !ryder) return false;
    for(let i = 0; i < 4; i++){
      const fresca = await traer(ryder.code);
      if(!fresca) break;
      fn(fresca);
      const ahora = new Date().toISOString();
      const { data, error } = await client.from('rounds').update({ match_groups: aGrupos(fresca), updated_at: ahora })
        .eq('id', fresca.id).eq('updated_at', fresca.updatedAt).select('id');
      if(error){ console.error(error); break; }
      if(data && data.length){ fresca.updatedAt = ahora; ryder = fresca; return true; }
    }
    alert('No se pudo guardar. Revisa la conexión y vuelve a probar.');
    return false;
  }
  function vigilar(){
    const client = initSupabase(); if(!client || !ryder) return;
    if(canal){ try { client.removeChannel(canal); } catch(e){} }
    canal = client.channel('ryder-' + ryder.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + ryder.id }, p => {
        if(!p.new) return;
        ryder = deFila(p.new);
        if(!ventana().hidden && vista !== 'crear') pintar();
      }).subscribe();
  }

  // ---------- Cálculo de cada partido (match play con hándicap) ----------
  // «Bolas» de cada lado: individual y foursome, una; fourball, una por jugador.
  function bolas(d, k){
    const nom = d[k], hc = d['h' + k];
    if(d.tipo === 'fourball') return nom.map((n, i) => ({ nombre: primero(n), hcp: hc[i] }));
    if(d.tipo === 'foursome') return [{ nombre: lado(nom), hcp: hc }];
    return [{ nombre: corto(nom[0]), hcp: hc[0] }];
  }
  function golpesRecibidos(r, d){
    const campo = campoDe(r.meta.courseId);
    const n = campo.par.length;
    const hc = v => typeof hcpCampo === 'function' ? hcpCampo(v == null ? 0 : v, campo, BARRA) : Math.round(v || 0);
    // hándicap de juego de cada bola según la modalidad
    const juego = b => d.tipo === 'foursome' ? Math.round((b.hcp || []).reduce((s, v) => s + hc(v), 0) / 2)
      : d.tipo === 'fourball' ? Math.round(hc(b.hcp) * 0.9) : hc(b.hcp);
    const BA = bolas(d, 'a'), BB = bolas(d, 'b');
    BA.concat(BB).forEach(b => { b.juego = juego(b); });
    const minimo = Math.min.apply(null, BA.concat(BB).map(b => b.juego));
    BA.concat(BB).forEach(b => { b.recibe = b.juego - minimo; });
    // orden de dificultad de los hoyos de este campo (1 = el más difícil)
    const si = (campo.hcp || []).slice(0, n);
    const orden = si.map((v, i) => i).sort((x, y) => (si[x] || 99) - (si[y] || 99));
    const rango = []; orden.forEach((h, k) => { rango[h] = k + 1; });
    const enHoyo = (b, h) => b.recibe <= 0 ? 0 : Math.floor(b.recibe / n) + ((rango[h] || 99) <= b.recibe % n ? 1 : 0);
    return { campo, n, BA, BB, enHoyo };
  }
  function netoLado(g, B, golpes, h){
    let mejor = null, completo = true;
    B.forEach((b, i) => {
      const v = (golpes[i] || [])[h];
      if(v == null){ completo = false; return; }
      const net = v - g.enHoyo(b, h);
      if(mejor == null || net < mejor) mejor = net;
    });
    return completo ? mejor : null; // el hoyo cuenta cuando están anotadas todas las bolas del lado
  }
  function estado(r, d){
    const g = golpesRecibidos(r, d);
    let ventaja = 0, jugados = 0, ultimo = 0, fin = null;
    const hoyos = [];
    for(let h = 0; h < g.n; h++){
      const na = netoLado(g, g.BA, d.ga, h), nb = netoLado(g, g.BB, d.gb, h);
      if(na == null || nb == null){ hoyos[h] = null; continue; }
      const gana = na < nb ? 'A' : nb < na ? 'B' : '=';
      hoyos[h] = gana;
      if(fin) continue;
      jugados++; ultimo = h + 1;
      ventaja += gana === 'A' ? 1 : gana === 'B' ? -1 : 0;
      const quedan = g.n - (h + 1);
      if(Math.abs(ventaja) > quedan) fin = { ventaja, quedan };
    }
    if(!fin && jugados === g.n) fin = { ventaja, quedan: 0 };
    const lider = ventaja > 0 ? 'A' : ventaja < 0 ? 'B' : null;
    if(fin){
      const v = Math.abs(fin.ventaja);
      return { g, hoyos, jugados, terminado: true, lider, grande: !lider ? 'Empate' : fin.quedan ? v + ' y ' + fin.quedan : v + ' arriba', pequeno: 'Final' };
    }
    if(!jugados) return { g, hoyos, jugados, terminado: false, lider: null, grande: '—', pequeno: 'Sin empezar' };
    return { g, hoyos, jugados, terminado: false, lider, grande: !lider ? 'Igualados' : Math.abs(ventaja) + ' arriba', pequeno: 'Tras el ' + ultimo };
  }
  function puntos(r){
    const p = { A: 0, B: 0, pa: 0, pb: 0 };
    r.duelos.forEach(d => {
      const e = estado(r, d);
      const sumar = (k1, k2) => { if(e.lider === 'A') p[k1] += 1; else if(e.lider === 'B') p[k2] += 1; else { p[k1] += .5; p[k2] += .5; } };
      if(e.terminado) sumar('A', 'B');
      sumar('pa', 'pb'); // previsto: si todo acabara como va ahora
    });
    return p;
  }
  const pts = v => { const e = Math.floor(v), m = v - e >= .5; return (e || !m ? String(e) : '') + (m ? '½' : ''); };
  const recibeTxt = g => {
    const l = g.BA.concat(g.BB).filter(b => b.recibe > 0);
    return l.length ? l.map(b => b.nombre + ' ' + b.recibe).join(' · ') : 'Sin golpes';
  };

  // ---------- Ventana ----------
  function ventana(){
    let ov = $('ryOverlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'ryOverlay'; ov.className = 'ry-ov'; ov.hidden = true;
      ov.innerHTML = '<button type="button" class="home-volver pantalla-volver" id="ryCerrar">‹ Volver al inicio</button><div class="ry-caja"><div id="ryBody"></div></div>';
      document.body.appendChild(ov);
      $('ryCerrar').onclick = cerrar;
    }
    return ov;
  }
  async function abrir(){
    const ov = ventana(); ov.hidden = false; document.body.classList.add('ry-abierta');
    vista = 'marcador';
    $('ryBody').innerHTML = '<div class="ry-cargando">Cargando…</div>';
    try { ryder = await traerUltima(); } catch(e){ ryder = null; }
    if(ryder) vigilar();
    pintar();
  }
  function cerrar(){ ventana().hidden = true; document.body.classList.remove('ry-abierta'); }
  function pintar(){
    if(vista === 'crear') return pintarCrear();
    if(vista === 'info') return pintarInfo();
    if(vista === 'duelo' && ryder && ryder.duelos[dueloIdx]) return pintarDuelo();
    vista = 'marcador'; pintarMarcador();
  }

  // ---------- Marcador ----------
  function pintarMarcador(){
    const body = $('ryBody');
    if(!ryder){
      body.innerHTML = '<div class="ry-tit">Ryder Cup</div>'
        + '<p class="ry-p">Dos equipos, partidos a match play con hándicap en tres modalidades: foursome, fourball e individuales. Ganar un partido da 1 punto al equipo; empatarlo, medio punto a cada uno.</p>'
        + '<button type="button" class="ry-info-btn" id="ryInfo"><span aria-hidden="true">i</span>Cómo se juega: modalidades, puntos y quién sale primero</button>'
        + (admin() ? '<button type="button" class="ry-btn" id="ryNueva">Crear una Ryder</button>' : '<p class="ry-p">Todavía no hay ninguna Ryder. La organiza el administrador del grupo.</p>');
      if($('ryNueva')) $('ryNueva').onclick = empezarCrear;
      $('ryInfo').onclick = verInfo;
      return;
    }
    const m = ryder.meta, p = puntos(ryder), total = ryder.duelos.length;
    const paraGanar = total / 2 + .5;
    const ganado = p.A >= paraGanar ? 'A' : p.B >= paraGanar ? 'B' : (total && p.A + p.B === total && p.A === p.B ? '=' : null);
    const mio = ryder.duelos.findIndex(d => d.a.includes(yo()) || d.b.includes(yo()));
    let h = '<div class="ry-cab" style="--ca:' + esc(m.colorA) + ';--cb:' + esc(m.colorB) + '">'
      + '<div class="ry-cab-t">' + esc(m.titulo || 'Ryder Cup') + '<small>' + esc(fechaLarga(m.date)) + ' · ' + esc(campoDe(m.courseId).name) + '</small></div>'
      + '<div class="ry-pts"><div class="ry-eq a">' + esc(m.nombreA) + '</div><div class="ry-num a">' + pts(p.A) + '</div><div class="ry-num b">' + pts(p.B) + '</div><div class="ry-eq b">' + esc(m.nombreB) + '</div></div>'
      + '<div class="ry-prev"><span>' + pts(p.pa) + '</span> Previsto <span>' + pts(p.pb) + '</span></div>'
      + '<div class="ry-meta">' + (ganado === 'A' ? '🏆 ¡Ganan los ' + esc(m.nombreA) + '!' : ganado === 'B' ? '🏆 ¡Ganan los ' + esc(m.nombreB) + '!' : ganado === '=' ? 'Empate final' : 'Para ganar: ' + pts(paraGanar) + ' puntos de ' + total) + '</div></div>';
    h += '<button type="button" class="ry-info-btn" id="ryInfo"><span aria-hidden="true">i</span>Cómo se juega: modalidades, puntos y quién sale primero</button>';
    ORDEN_MODOS.forEach(t => {
      const idx = ryder.duelos.map((d, i) => i).filter(i => ryder.duelos[i].tipo === t);
      if(!idx.length) return;
      h += '<div class="ry-sesion">' + MODOS[t].nombre + '<small>' + MODOS[t].explica + '</small></div><div class="ry-lista">' + idx.map(i => {
        const d = ryder.duelos[i], e = estado(ryder, d);
        const col = e.lider === 'A' ? m.colorA : e.lider === 'B' ? m.colorB : '#3A3F46';
        const nomes = (l, hs) => l.map((n, k) => esc(corto(n)) + '<small>HCP ' + coma(hs[k]) + '</small>').join('');
        return '<button type="button" class="ry-fila' + (i === mio ? ' mio' : '') + '" data-i="' + i + '">'
          + '<span class="ry-j a" style="color:' + esc(m.colorA) + '">' + nomes(d.a, d.ha) + '</span>'
          + '<span class="ry-est" style="background:' + esc(col) + '"><b>' + esc(e.grande) + '</b><small>' + esc(e.pequeno) + '</small></span>'
          + '<span class="ry-j b" style="color:' + esc(m.colorB) + '">' + nomes(d.b, d.hb) + '</span>'
          + '<span class="ry-rec">Golpes: ' + esc(recibeTxt(e.g)) + ' · toca para anotar</span></button>';
      }).join('') + '</div>';
    });
    h += '<div class="ry-acc">'
      + (mio >= 0 ? '<button type="button" class="ry-btn" id="ryMio">Anotar mi partido</button>' : '')
      + (admin() ? '<button type="button" class="ry-btn ghost" id="ryNueva">Crear otra Ryder</button>'
        + '<button type="button" class="ry-btn borrar" id="ryBorrar">Borrar esta Ryder</button>' : '')
      + '<p class="ry-nota">Ganar un partido = 1 punto · Empatarlo = ½ punto para cada equipo. «Previsto» es cómo quedaría si todo acabara como va ahora. Hándicap: individuales al 100 %, fourball al 90 % y foursome la mitad de la suma de la pareja.</p></div>';
    body.innerHTML = h;
    body.querySelectorAll('.ry-fila').forEach(b => b.onclick = () => abrirDuelo(+b.dataset.i));
    if($('ryMio')) $('ryMio').onclick = () => abrirDuelo(mio);
    if($('ryNueva')) $('ryNueva').onclick = empezarCrear;
    if($('ryBorrar')) $('ryBorrar').onclick = borrar;
    if($('ryInfo')) $('ryInfo').onclick = verInfo;
  }

  // ---------- Cómo se juega (información completa) ----------
  function verInfo(){ vista = 'info'; pintar(); const ov = $('ryOverlay'); if(ov) ov.scrollTop = 0; }
  function pintarInfo(){
    const sec = (t, html) => '<details class="ry-det"><summary>' + t + '</summary><div class="ry-det-c">' + html + '</div></details>';
    $('ryBody').innerHTML = '<button type="button" class="ry-volver" id="ryVolver">‹ ' + (ryder ? 'Marcador' : 'Atrás') + '</button>'
      + '<div class="ry-tit">Cómo se juega la Ryder</div>'
      + '<p class="ry-p">Toca cada apartado para abrirlo.</p>'
      + sec('Qué es y cómo se gana',
          '<p>Dos equipos se enfrentan en varios partidos. Cada partido es un duelo: un jugador o una pareja de cada equipo.</p>'
        + '<ul><li><b>Ganar un partido</b> da <b>1 punto</b> a su equipo.</li><li><b>Empatar</b> da <b>½ punto</b> a cada equipo.</li><li>Gana la Ryder el equipo que suma <b>más de la mitad</b> de los puntos en juego. La app te dice arriba cuántos hacen falta.</li></ul>'
        + '<p>«<b>Previsto</b>» es cómo acabaría si todos los partidos terminaran como van ahora mismo.</p>')
      + sec('Match play: se juega hoyo a hoyo',
          '<p>No se suman los golpes de toda la vuelta: <b>cada hoyo es una pequeña batalla</b>.</p>'
        + '<ul><li>Gana el hoyo quien lo termina en <b>menos golpes netos</b> (descontando los golpes de hándicap que recibe en ese hoyo).</li><li>Si hacen los mismos, el hoyo queda <b>empatado</b> y nadie suma.</li>'
        + '<li>«<b>2 arriba</b>» quiere decir que un lado lleva dos hoyos ganados más que el otro. «<b>Igualados</b>», que van empatados.</li>'
        + '<li>El partido <b>acaba antes</b> cuando uno lleva más hoyos de ventaja que hoyos quedan: por ejemplo, «<b>3 y 2</b>» es que ganó con 3 de ventaja y quedaban 2 hoyos.</li>'
        + '<li>Si tras el 18 siguen igualados, el partido es <b>empate</b> (½ punto para cada equipo).</li></ul>'
        + '<p><b>Dar por buenos golpes o hoyos.</b> En match play puedes concederle al rival un golpe (por ejemplo, un putt cortito), un hoyo o incluso el partido. Lo concedido no se puede retirar.</p>')
      + sec('Foursome: una bola por pareja, golpes alternos',
          '<ul><li>Cada pareja juega <b>una sola bola</b> y los dos compañeros <b>se van turnando</b> los golpes hasta meterla.</li>'
        + '<li><b>Quién sale en cada hoyo:</b> antes de empezar, la pareja decide quién da la salida en los <b>hoyos impares</b> (1, 3, 5…) y el otro la da en los <b>pares</b> (2, 4, 6…). Así durante todo el partido, aunque el hoyo anterior lo terminara cualquiera.</li>'
        + '<li>Después de la salida, se sigue alternando: si salió Pepe, el segundo golpe lo da Juan, el tercero Pepe…</li>'
        + '<li>Los golpes de castigo <b>no cambian el turno</b>.</li>'
        + '<li>En la app se apunta <b>un número por pareja</b>: los golpes que ha necesitado la bola.</li>'
        + '<li>Hándicap: la <b>mitad de la suma</b> de los hándicaps de la pareja.</li></ul>')
      + sec('Fourball: cada uno su bola, cuenta la mejor',
          '<ul><li>Los cuatro juegan <b>su propia bola</b> todo el hoyo.</li><li>En cada hoyo cuenta el <b>mejor resultado neto</b> de cada pareja, y ese es el que se compara con el mejor de la otra pareja.</li>'
        + '<li>Dentro de la pareja podéis jugar en el orden que más os convenga.</li>'
        + '<li>Si un jugador ya no puede mejorar lo de su compañero, puede <b>levantar la bola</b> para no perder tiempo.</li>'
        + '<li>En la app se apuntan <b>los golpes de los cuatro</b>; la app elige sola la mejor de cada pareja.</li>'
        + '<li>Hándicap: el <b>90 %</b> del de cada jugador.</li></ul>')
      + sec('Individuales: uno contra uno',
          '<ul><li>Un jugador de cada equipo, cada uno con su bola, hoyo a hoyo.</li><li>En la app se apuntan los golpes de los dos.</li><li>Hándicap: el <b>100 %</b> de la diferencia.</li></ul>')
      + sec('Quién sale primero en el tee',
          '<ul><li><b>Hoyo 1:</b> se sortea (por ejemplo, con una moneda) qué lado sale primero.</li>'
        + '<li><b>Desde el hoyo 2:</b> sale primero <b>el lado que ganó el hoyo anterior</b> (se dice que «tiene el honor»).</li>'
        + '<li>Si el hoyo anterior quedó <b>empatado</b>, sale primero el mismo lado que salió primero en ese hoyo.</li>'
        + '<li>En <b>foursome</b>, del lado que tiene el honor sale el compañero al que le toca ese hoyo (impares o pares).</li>'
        + '<li><b>Después de la salida</b> juega primero la bola que está <b>más lejos</b> del hoyo.</li>'
        + '<li>Si alguien juega cuando no le tocaba, no hay castigo, pero el rival puede pedirle que <b>repita ese golpe</b> en su turno.</li></ul>')
      + sec('Los golpes de hándicap',
          '<ul><li>En cada partido, quien tiene el hándicap de juego <b>más bajo juega sin golpes</b>. Los demás reciben la diferencia.</li>'
        + '<li>Esos golpes se reciben en los <b>hoyos más difíciles</b> del campo (los de dificultad 1, 2, 3…). Si recibes 5 golpes, los recibes en los hoyos de dificultad 1 a 5.</li>'
        + '<li>No hay que calcular nada: al anotar cada hoyo, la app avisa de <b>quién recibe golpe</b> en ese hoyo y cuenta el resultado neto sola.</li></ul>')
      + sec('Cómo se anota en la app',
          '<ul><li>Toca tu partido en el marcador (o «Anotar mi partido»).</li><li>Elige el hoyo arriba y pon los golpes con los botones <b>−</b> y <b>+</b>. Empiezan en el par del hoyo.</li>'
        + '<li>Pulsa «<b>Guardar hoyo</b>» y pasa solo al siguiente.</li><li>Lo puede anotar cualquiera de los jugadores del partido; el marcador se actualiza en todos los móviles.</li>'
        + '<li>Si te equivocas, vuelve a ese hoyo y cámbialo, o pulsa «Borrar este hoyo».</li></ul>')
      + '<button type="button" class="ry-btn" id="ryInfoVolver">' + (ryder ? 'Volver al marcador' : 'Volver') + '</button>';
    const volver = () => { vista = 'marcador'; pintar(); };
    $('ryVolver').onclick = volver; $('ryInfoVolver').onclick = volver;
  }

  async function borrar(){
    if(!ryder || !confirm('¿Borrar esta Ryder?\nDesaparece para todos y no se puede deshacer.')) return;
    const res = typeof deleteSharedRound === 'function' ? await deleteSharedRound(ryder.code) : { ok: false };
    if(!res || !res.ok){ alert((res && res.msg) || 'No se pudo borrar.'); return; }
    const client = initSupabase();
    if(canal && client){ try { client.removeChannel(canal); } catch(e){} canal = null; }
    ryder = await traerUltima(); if(ryder) vigilar();
    pintar();
  }

  // ---------- Anotar un partido hoyo a hoyo ----------
  function abrirDuelo(i){
    if(!ryder || !ryder.duelos[i]) return;
    dueloIdx = i; vista = 'duelo';
    const d = ryder.duelos[i], n = campoDe(ryder.meta.courseId).par.length;
    const hecho = h => [d.ga, d.gb].every((G, k) => bolas(d, k ? 'b' : 'a').every((b, j) => (G[j] || [])[h] != null));
    hoyoSel = 0; while(hoyoSel < n - 1 && hecho(hoyoSel)) hoyoSel++;
    cuentas = null;
    pintar();
  }
  function pintarDuelo(){
    const m = ryder.meta, d = ryder.duelos[dueloIdx], e = estado(ryder, d), g = e.g;
    const par = g.campo.par[hoyoSel];
    if(!cuentas) cuentas = { a: g.BA.map((b, j) => (d.ga[j] || [])[hoyoSel] ?? par), b: g.BB.map((b, j) => (d.gb[j] || [])[hoyoSel] ?? par) };
    const col = e.lider === 'A' ? m.colorA : e.lider === 'B' ? m.colorB : '#3A3F46';
    const recibenAqui = g.BA.concat(g.BB).map(b => [b.nombre, g.enHoyo(b, hoyoSel)]).filter(x => x[1] > 0);
    const recTxt = recibenAqui.length ? recibenAqui.map(x => x[0] + ' recibe ' + (x[1] === 1 ? '1 golpe' : x[1] + ' golpes')).join(' · ') : 'Nadie recibe golpe en este hoyo';
    const contador = (k, j, b, color) => '<div class="ry-cont"><div class="ry-cont-n" style="color:' + esc(color) + '">' + esc(b.nombre) + '</div>'
      + '<div class="ry-cont-f"><button type="button" class="ry-mm" data-k="' + k + '" data-j="' + j + '" data-d="-1" aria-label="Un golpe menos">−</button><b>' + cuentas[k][j] + '</b>'
      + '<button type="button" class="ry-mm" data-k="' + k + '" data-j="' + j + '" data-d="1" aria-label="Un golpe más">+</button></div></div>';
    const hayHoyo = (d.ga[0] || [])[hoyoSel] != null || (d.gb[0] || [])[hoyoSel] != null;
    let h = '<button type="button" class="ry-volver" id="ryVolver">‹ Marcador</button>'
      + '<div class="ry-sesion">' + MODOS[d.tipo].nombre + '<small>' + MODOS[d.tipo].explica + '</small></div>'
      + '<div class="ry-duelo-t"><span style="color:' + esc(m.colorA) + '">' + esc(lado(d.a)) + '</span> contra <span style="color:' + esc(m.colorB) + '">' + esc(lado(d.b)) + '</span></div>'
      + '<div class="ry-est grande" style="background:' + esc(col) + '"><b>' + esc(e.lider ? (e.lider === 'A' ? lado(d.a) : lado(d.b)) + ' · ' : '') + esc(e.grande) + '</b><small>' + esc(e.pequeno) + '</small></div>'
      + '<div class="ry-hoyos">' + g.campo.par.map((p, k) => {
          const w = e.hoyos[k];
          const c = w === 'A' ? m.colorA : w === 'B' ? m.colorB : w === '=' ? '#6B7280' : 'transparent';
          return '<button type="button" class="ry-h' + (k === hoyoSel ? ' sel' : '') + (w ? ' hecho' : '') + '" data-h="' + k + '" style="--c:' + esc(c) + '">' + (k + 1) + '</button>';
        }).join('') + '</div>'
      + '<div class="ry-hoyo-info"><b>Hoyo ' + (hoyoSel + 1) + '</b> · Par ' + par + ' · Dificultad ' + ((g.campo.hcp || [])[hoyoSel] || '—') + '<br><span>' + esc(recTxt) + '</span></div>'
      + (d.tipo === 'foursome' ? '<p class="ry-p ry-centro">Una bola por pareja: apunta los golpes de la pareja.</p>' : d.tipo === 'fourball' ? '<p class="ry-p ry-centro">Cada uno su bola: cuenta la mejor de cada pareja.</p>' : '')
      + '<div class="ry-conts' + (g.BA.length > 1 ? ' cuatro' : '') + '">'
      + g.BA.map((b, j) => contador('a', j, b, m.colorA)).join('') + g.BB.map((b, j) => contador('b', j, b, m.colorB)).join('') + '</div>'
      + (e.terminado && !hayHoyo ? '<p class="ry-p">El partido ya está decidido. Podéis seguir apuntando, pero no cambia el resultado.</p>' : '')
      + '<button type="button" class="ry-btn" id="ryGuardar">Guardar hoyo ' + (hoyoSel + 1) + '</button>'
      + (hayHoyo ? '<button type="button" class="ry-btn ghost" id="ryQuitar">Borrar este hoyo</button>' : '');
    $('ryBody').innerHTML = h;
    $('ryVolver').onclick = () => { vista = 'marcador'; pintar(); };
    $('ryBody').querySelectorAll('.ry-h').forEach(b => b.onclick = () => { hoyoSel = +b.dataset.h; cuentas = null; pintar(); });
    $('ryBody').querySelectorAll('.ry-mm').forEach(b => b.onclick = () => {
      const l = cuentas[b.dataset.k], j = +b.dataset.j;
      l[j] = Math.max(1, Math.min(15, l[j] + (+b.dataset.d)));
      pintar();
    });
    $('ryGuardar').onclick = async ev => {
      const b = ev.target; b.disabled = true; b.textContent = 'Guardando…';
      const hh = hoyoSel, c = cuentas, i = dueloIdx;
      const ok = await cambiar(r => {
        const x = r.duelos[i]; if(!x) return;
        c.a.forEach((v, j) => { (x.ga[j] = x.ga[j] || [])[hh] = v; });
        c.b.forEach((v, j) => { (x.gb[j] = x.gb[j] || [])[hh] = v; });
      });
      if(ok && hh < g.n - 1) hoyoSel = hh + 1;
      cuentas = null; pintar();
    };
    if($('ryQuitar')) $('ryQuitar').onclick = async () => {
      if(!confirm('¿Borrar los golpes del hoyo ' + (hoyoSel + 1) + '?')) return;
      const hh = hoyoSel, i = dueloIdx;
      await cambiar(r => { const x = r.duelos[i]; if(!x) return; x.ga.concat(x.gb).forEach(l => { if(l) l[hh] = null; }); });
      cuentas = null; pintar();
    };
  }

  // ---------- Crear una Ryder (solo el administrador) ----------
  function empezarCrear(){
    borrador = { paso: 1, titulo: 'Ryder Cup ' + ((window.miPerfil && window.miPerfil.grupo) || ''), nombreA: 'Rojos', colorA: COLORES[0][0], nombreB: 'Azules', colorB: COLORES[1][0],
      date: hoyIso(), courseId: 'hato-verde', modos: { foursome: true, fourball: true, individual: true }, equipo: {}, duelos: [], sobran: [] };
    vista = 'crear'; pintar();
  }
  // Empareja por hándicap: individuales, el 1º contra el 1º…; parejas, los dos mejores juntos contra los dos mejores del otro…
  function emparejar(){
    const b = borrador;
    const A = ordenHcp(Object.keys(b.equipo).filter(n => b.equipo[n] === 'A')), B = ordenHcp(Object.keys(b.equipo).filter(n => b.equipo[n] === 'B'));
    b.duelos = []; b.sobran = [];
    ORDEN_MODOS.forEach(t => {
      if(!b.modos[t]) return;
      const tam = MODOS[t].porPareja ? 2 : 1;
      const nPart = Math.floor(Math.min(A.length, B.length) / tam);
      for(let i = 0; i < nPart; i++) b.duelos.push({ tipo: t, a: A.slice(i * tam, i * tam + tam), b: B.slice(i * tam, i * tam + tam) });
      const fuera = A.slice(nPart * tam).concat(B.slice(nPart * tam));
      if(fuera.length) b.sobran.push(MODOS[t].nombre + ': ' + fuera.map(corto).join(', '));
    });
  }
  function pintarCrear(){
    const b = borrador, body = $('ryBody');
    const paleta = k => '<div class="ry-colores">' + COLORES.map(([c, n]) => '<button type="button" class="ry-col' + (b['color' + k] === c ? ' sel' : '') + '" data-k="' + k + '" data-c="' + c + '" style="background:' + c + '" aria-label="' + n + '"></button>').join('') + '</div>';
    let h = '<button type="button" class="ry-volver" id="ryVolver">‹ ' + (b.paso === 1 ? 'Cancelar' : 'Atrás') + '</button>'
      + '<div class="ry-tit">Crear una Ryder · paso ' + b.paso + ' de 3</div>';
    if(b.paso === 1){
      h += '<label class="ry-lbl">Nombre del torneo<input id="ryTitulo" value="' + esc(b.titulo) + '"></label>'
        + '<div class="ry-dos"><label class="ry-lbl">Día<input type="date" id="ryFecha" value="' + esc(b.date) + '"></label>'
        + '<label class="ry-lbl">Campo<select id="ryCampo"><option value="hato-verde"' + (b.courseId === 'hato-verde' ? ' selected' : '') + '>Club Hato Verde</option><option value="zaudin"' + (b.courseId === 'zaudin' ? ' selected' : '') + '>Club Zaudín Golf</option></select></label></div>'
        + '<label class="ry-lbl">Equipo 1<input id="ryNomA" value="' + esc(b.nombreA) + '"></label>' + paleta('A')
        + '<label class="ry-lbl">Equipo 2<input id="ryNomB" value="' + esc(b.nombreB) + '"></label>' + paleta('B')
        + '<div class="ry-sub">Modalidades que se juegan</div>'
        + ORDEN_MODOS.map(t => '<label class="ry-check"><input type="checkbox" data-modo="' + t + '"' + (b.modos[t] ? ' checked' : '') + '><span><b>' + MODOS[t].nombre + '</b><br>' + MODOS[t].explica + '</span></label>').join('')
        + '<div class="ry-msg" id="ryMsg"></div><button type="button" class="ry-btn" id="rySig">Siguiente: elegir jugadores</button>';
    } else if(b.paso === 2){
      const n = k => Object.values(b.equipo).filter(v => v === k).length;
      const media = k => { const hs = Object.keys(b.equipo).filter(x => b.equipo[x] === k).map(hcpDe).filter(v => v != null); return hs.length ? coma(Math.round(hs.reduce((s, v) => s + v, 0) / hs.length * 10) / 10) : '—'; };
      h += '<p class="ry-p">Toca cada nombre para pasarlo de equipo: <b style="color:' + esc(b.colorA) + '">' + esc(b.nombreA) + '</b> → <b style="color:' + esc(b.colorB) + '">' + esc(b.nombreB) + '</b> → no juega.</p>'
        + '<div class="ry-resumen"><span style="border-color:' + esc(b.colorA) + '">' + esc(b.nombreA) + ': <b>' + n('A') + '</b> · HCP medio ' + media('A') + '</span>'
        + '<span style="border-color:' + esc(b.colorB) + '">' + esc(b.nombreB) + ': <b>' + n('B') + '</b> · HCP medio ' + media('B') + '</span></div>'
        + '<div class="ry-jugs">' + nombresGrupo().map(x => {
            const e = b.equipo[x];
            const c = e === 'A' ? b.colorA : e === 'B' ? b.colorB : '';
            return '<button type="button" class="ry-jug' + (e ? ' en' : '') + '" data-n="' + esc(x) + '"' + (c ? ' style="background:' + esc(c) + ';border-color:' + esc(c) + '"' : '') + '>'
              + '<span>' + esc(x) + '</span><small>' + (e ? esc(e === 'A' ? b.nombreA : b.nombreB) + ' · ' : '') + 'HCP ' + coma(hcpDe(x)) + '</small></button>';
          }).join('') + '</div>'
        + '<div class="ry-msg" id="ryMsg"></div><button type="button" class="ry-btn" id="rySig">Siguiente: emparejar</button>';
    } else {
      h += '<p class="ry-p">La app ha emparejado por hándicap. Para cambiar a alguien, elígelo en la lista: se intercambia con el que estaba en ese sitio, dentro de la misma modalidad.</p>';
      ORDEN_MODOS.forEach(t => {
        const idx = b.duelos.map((d, i) => i).filter(i => b.duelos[i].tipo === t);
        if(!idx.length) return;
        const deLado = k => { const s = new Set(); idx.forEach(i => b.duelos[i][k].forEach(n => s.add(n))); return ordenHcp([...s]); };
        const LA = deLado('a'), LB = deLado('b');
        const sel = (i, k, j, lista, color) => '<select class="ry-sel" data-i="' + i + '" data-k="' + k + '" data-j="' + j + '" style="color:' + esc(color) + '">'
          + lista.map(n => '<option value="' + esc(n) + '"' + (n === b.duelos[i][k][j] ? ' selected' : '') + '>' + esc(corto(n)) + '</option>').join('') + '</select>';
        h += '<div class="ry-sesion">' + MODOS[t].nombre + '<small>' + MODOS[t].explica + '</small></div><div class="ry-lista">'
          + idx.map(i => '<div class="ry-par"><div class="ry-par-l">' + b.duelos[i].a.map((n, j) => sel(i, 'a', j, LA, b.colorA)).join('') + '</div>'
            + '<span class="ry-vs">contra</span><div class="ry-par-l">' + b.duelos[i].b.map((n, j) => sel(i, 'b', j, LB, b.colorB)).join('') + '</div></div>').join('') + '</div>';
      });
      if(!b.duelos.length) h += '<p class="ry-aviso">No sale ningún partido: revisa los equipos y las modalidades.</p>';
      if(b.sobran.length) h += '<p class="ry-aviso">Se quedan sin jugar (los equipos no tienen los mismos jugadores): ' + esc(b.sobran.join(' · ')) + '. Vuelve atrás para cuadrarlos si quieres.</p>';
      h += '<div class="ry-msg" id="ryMsg"></div>' + (b.duelos.length ? '<button type="button" class="ry-btn" id="ryCrear">Crear la Ryder (' + b.duelos.length + (b.duelos.length === 1 ? ' partido' : ' partidos') + ')</button>' : '');
    }
    body.innerHTML = h;
    const msg = t => { const el = $('ryMsg'); if(el) el.textContent = t; };
    const leer = () => {
      if($('ryTitulo')) b.titulo = $('ryTitulo').value.trim();
      if($('ryFecha')) b.date = $('ryFecha').value;
      if($('ryCampo')) b.courseId = $('ryCampo').value;
      if($('ryNomA')) b.nombreA = $('ryNomA').value.trim();
      if($('ryNomB')) b.nombreB = $('ryNomB').value.trim();
      body.querySelectorAll('[data-modo]').forEach(c => { b.modos[c.dataset.modo] = c.checked; });
    };
    $('ryVolver').onclick = () => { leer(); if(b.paso === 1){ vista = 'marcador'; borrador = null; pintar(); } else { b.paso--; pintar(); } };
    body.querySelectorAll('.ry-col').forEach(x => x.onclick = () => { leer(); b['color' + x.dataset.k] = x.dataset.c; pintar(); });
    body.querySelectorAll('.ry-jug').forEach(x => x.onclick = () => {
      const n = x.dataset.n, e = b.equipo[n];
      if(!e) b.equipo[n] = 'A'; else if(e === 'A') b.equipo[n] = 'B'; else delete b.equipo[n];
      const ov = $('ryOverlay'), sc = ov.scrollTop; pintar(); ov.scrollTop = sc;
    });
    body.querySelectorAll('.ry-sel').forEach(s => s.onchange = () => {
      // intercambia ese jugador con el que estaba en ese sitio, dentro de la misma modalidad
      const i = +s.dataset.i, k = s.dataset.k, j = +s.dataset.j, nuevo = s.value, viejo = b.duelos[i][k][j], t = b.duelos[i].tipo;
      b.duelos.forEach(d => { if(d.tipo !== t) return; d[k] = d[k].map(n => n === nuevo ? viejo : n); });
      b.duelos[i][k][j] = nuevo;
      const ov = $('ryOverlay'), sc = ov.scrollTop; pintar(); ov.scrollTop = sc;
    });
    if($('rySig')) $('rySig').onclick = () => {
      leer();
      if(b.paso === 1){
        if(!b.nombreA || !b.nombreB) return msg('Pon el nombre de los dos equipos.');
        if(b.colorA === b.colorB) return msg('Elige un color distinto para cada equipo.');
        if(!b.date) return msg('Elige el día.');
        if(!ORDEN_MODOS.some(t => b.modos[t])) return msg('Elige al menos una modalidad.');
        b.paso = 2; return pintar();
      }
      const nA = Object.values(b.equipo).filter(v => v === 'A').length, nB = Object.values(b.equipo).filter(v => v === 'B').length;
      if(!nA || !nB) return msg('Cada equipo tiene que tener al menos un jugador.');
      if(Math.min(nA, nB) < 2 && (b.modos.foursome || b.modos.fourball) && !b.modos.individual) return msg('Para jugar por parejas, cada equipo necesita al menos 2 jugadores.');
      emparejar(); b.paso = 3; pintar();
    };
    if($('ryCrear')) $('ryCrear').onclick = async ev => {
      const btn = ev.target; btn.disabled = true; btn.textContent = 'Creando…';
      const client = initSupabase();
      const nuevo = { meta: { ryder: true, titulo: b.titulo || 'Ryder Cup', nombreA: b.nombreA, colorA: b.colorA, nombreB: b.nombreB, colorB: b.colorB, date: b.date, courseId: b.courseId },
        A: Object.keys(b.equipo).filter(n => b.equipo[n] === 'A'), B: Object.keys(b.equipo).filter(n => b.equipo[n] === 'B'),
        duelos: b.duelos.map(d => ({ tipo: d.tipo, a: d.a, b: d.b, ha: d.a.map(hcpDe), hb: d.b.map(hcpDe), ga: [], gb: [] })) };
      try {
        const { data, error } = await client.from('rounds').insert({
          code: genRoundCode(), course_id: null, course_name: campoDe(b.courseId).name,
          round_name: TAG, scoring_type: 'matchplay', match_groups: aGrupos(nuevo),
        }).select('id, code, match_groups, updated_at').single();
        if(error) throw error;
        ryder = deFila(data); borrador = null; vista = 'marcador'; vigilar(); pintar();
      } catch(e){ console.error(e); btn.disabled = false; btn.textContent = 'Crear la Ryder'; msg('No se pudo crear. Revisa la conexión.'); }
    };
  }

  // ---------- Botón en la portada ----------
  function ponerBoton(){
    if($('hmRyder')) return;
    const ref = $('hmDerbi') || document.querySelector('.home-menu-btn:last-of-type');
    if(!ref) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn hm-ryder'; b.id = 'hmRyder';
    b.innerHTML = '<svg class="ico ry-ico" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0 0 19z" fill="#C8102E"/><path d="M12 2.5a9.5 9.5 0 0 1 0 19z" fill="#1F4E9C"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Ryder Cup</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    b.onclick = abrir;
    ref.parentNode.insertBefore(b, ref.nextSibling);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ponerBoton); else ponerBoton();
  window.acgolfRyder = { abrir, _estado: estado, _puntos: puntos };
})();
