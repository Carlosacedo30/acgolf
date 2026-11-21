/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Ritmo en la pantalla de marcar (idea de Carlos, 21-nov-2026) ---
// Cada grupo ve, mientras marca, cómo va de ritmo: un aviso (verde / ámbar / rojo) y un mapa del campo con su grupo
// destacado y los demás en gris, con la lista de grupos y los NOMBRES COMPLETOS de sus jugadores (norma de Carlos).
// Usa el mismo cálculo que «Ritmo del campo» (ritmo-campo.js): sin GPS, por el último hoyo anotado y contando desde el
// hoyo por el que salió cada grupo. Solo se ve el ritmo de la partida en la que se está; no se avisa fuera de la app.
(function(){
  'use strict';
  if(typeof initSupabase !== 'function') return;
  const hv = document.getElementById('holeViewSection'), hvP = document.getElementById('hvPlayers');
  if(!hv || !hvP) return;
  const R = () => window.acgolfRitmo;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const HORAS = 20000;
  let ronda = null, codigoCargado = null, ultimaCarga = 0, cargando = false;

  // Una tira SIEMPRE visible arriba (también con marcadores, donde la hoja ocupa la pantalla): el aviso de ritmo.
  // Al tocarla se abre el mapa del campo y los otros grupos en una pantalla aparte.
  const aviso = document.createElement('button'); aviso.type = 'button'; aviso.id = 'rjAviso'; aviso.className = 'rj-aviso rj-s'; aviso.hidden = true;
  hv.insertBefore(aviso, hvP);
  let ov = null, ultimo = null;

  const base = id => String(id || '').replace(/-9v?$/, '');
  const offDe = id => /-9v$/.test(String(id || '')) ? 9 : 0;

  async function cargar(){
    const code = typeof currentRoundCode !== 'undefined' ? currentRoundCode : null;
    if(!code){ ronda = null; codigoCargado = null; return; }
    if(cargando) return; cargando = true;
    try {
      const { data, error } = await initSupabase().from('rounds')
        .select('code, round_name, course_id, course_name, course_par, match_groups, updated_at').eq('code', code).limit(1);
      if(!error && data && data[0]){ ronda = data[0]; codigoCargado = code; ultimaCarga = Date.now(); }
    } catch(e){}
    cargando = false; pintar();
  }

  function textoGrupo(e){
    if(e.fin) return 'ha terminado';
    if(e.sinDatos) return 'aún sin anotar';
    return 'hoyo ' + e.juegaEn + (e.retraso >= 8 ? ' · se retrasa ' + e.retraso + ' min' : ' · a tiempo');
  }

  function pantallaMapa(){
    if(!ov){
      ov = document.createElement('div'); ov.className = 'rj-ov'; ov.id = 'rjOv'; ov.hidden = true;
      ov.innerHTML = '<div class="rj-ov-top"><button type="button" class="rj-ov-volver" id="rjVolver">‹ Volver a marcar</button></div><div class="rj-ov-cuerpo" id="rjOvCuerpo"></div>';
      document.body.appendChild(ov);
      ov.querySelector('#rjVolver').onclick = () => { ov.hidden = true; };
    }
    return ov;
  }
  function pintarMapa(){
    if(!ov || ov.hidden || !ultimo) return;
    const { lista, yo } = ultimo;
    const T = R()._trazado && R()._trazado[base(ronda.course_id)];
    const vivos = lista.filter(e => !e.fin);
    const filas = [yo].concat(lista.filter(e => e !== yo)).map(e => {
      const quien = (e.g.players || []).filter(Boolean).join(', ');
      return '<div class="rj-f' + (e === yo ? ' rj-yo' : '') + '"><span class="rj-n">' + e.num + '</span><span class="rj-t"><b>' + (e === yo ? 'Vosotros · ' : 'Grupo ' + e.num + ' · ') + esc(textoGrupo(e)) + '</b><small>' + esc(quien) + '</small></span></div>';
    }).join('');
    const circ = T && R()._circuito ? R()._circuito(vivos.filter(e => e.juegaEn), ronda.course_id, { base: base(ronda.course_id), off: offDe(ronda.course_id), mio: yo.g }) : '';
    const html = '<h2 class="rj-ov-h">Dónde está cada grupo</h2><p class="rj-ov-p">' + esc(ronda.course_name || '') + ' · se actualiza solo</p>'
      + (circ || '<p class="rj-nocir">Este campo aún no tiene el circuito dibujado. Abajo ves la lista de grupos.</p>') + '<div class="rj-lst">' + filas + '</div>';
    const c = ov.querySelector('#rjOvCuerpo'); if(c.dataset.k !== html){ c.dataset.k = html; c.innerHTML = html; }
  }

  function pintar(){
    if(!R() || !R()._estadoGrupo || !ronda || (typeof currentRoundCode !== 'undefined' && currentRoundCode !== codigoCargado)){ aviso.hidden = true; return; }
    const ahora = Date.now();
    const gi = typeof activeGroup !== 'undefined' ? +activeGroup : 0;
    const grupos = (ronda.match_groups || []).map((g, i) => ({ g, i })).filter(x => x.g && (x.g.players || []).filter(Boolean).length);
    const lista = grupos.map(x => { const e = R()._estadoGrupo(ronda, x.g, ahora); e.num = x.i + 1; return e; });
    const yo = lista.find(e => e.num === gi + 1);
    if(!yo){ aviso.hidden = true; return; }
    ultimo = { lista, yo };
    const c = yo.sinDatos || yo.fin ? 's' : yo.color;   // s = sin datos · v · a · r
    const t = c === 's' ? ['⚑', yo.fin ? 'Habéis terminado' : 'Ritmo del campo', yo.fin ? 'Mira dónde está cada grupo.' : 'Se activa al apuntar el primer hoyo.']
      : c === 'v' ? ['✓', 'Buen ritmo', 'Vais al día. ¡Seguid así!']
      : c === 'a' ? ['!', 'Vais ' + yo.retraso + ' minutos tarde', 'Intentad ir un poco más ágiles. Sin prisa, pero sin parar.']
      : ['!', 'Vais ' + yo.retraso + ' minutos tarde', 'Hay que acelerar el paso: se está frenando el campo.'];
    const h = '<i class="rj-ic">' + t[0] + '</i><span class="rj-tx"><b>' + esc(t[1]) + '</b><span>' + esc(t[2]) + '</span></span><span class="rj-mp">Mapa ›</span>';
    if(aviso.dataset.k !== c + h){ aviso.dataset.k = c + h; aviso.className = 'rj-aviso rj-' + c; aviso.innerHTML = h; }
    aviso.setAttribute('aria-label', t[1] + '. Toca para ver el mapa del campo y los otros grupos');
    aviso.hidden = false;
    pintarMapa();
  }
  aviso.onclick = () => { pantallaMapa().hidden = false; pintarMapa(); const c = ov.querySelector('#rjOvCuerpo'); if(c) c.scrollTop = 0; };

  // Se actualiza al marcar cada hoyo y cada 20 segundos mientras se mira la pantalla
  const orig = window.renderHoleView;
  if(typeof orig === 'function'){
    window.renderHoleView = function(){
      const r = orig.apply(this, arguments);
      try { if(Date.now() - ultimaCarga > 4000) cargar(); else pintar(); } catch(e){}
      return r;
    };
  }
  setInterval(() => { if(!document.hidden && hv.offsetParent !== null) cargar(); else if(hv.offsetParent === null){ aviso.hidden = true; if(ov) ov.hidden = true; } }, HORAS);
})();
