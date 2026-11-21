/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Botón «Seguimiento» en el Inicio: EXCLUSIVO del super administrador (Carlos), 21-nov-2026 ---
// Abre el mapa del campo con todos los grupos de la partida en juego (mismo cálculo que «Ritmo del campo»).
(function(){
  'use strict';
  if(typeof initSupabase !== 'function') return;
  const R = () => window.acgolfRitmo;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base = id => String(id || '').replace(/-9v?$/, '');
  const offDe = id => /-9v$/.test(String(id || '')) ? 9 : 0;
  let btn = null, ov = null, rondas = [], sel = 0, timer = null;

  function poner(){
    if(btn) return;
    const cab = document.querySelector('.in-hero') || document.querySelector('.home-cab');
    if(!cab || !cab.parentNode) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'sgBtn'; btn.className = 'sg-btn';
    btn.innerHTML = '<i class="sg-ic" aria-hidden="true">◎</i><span><b>SEGUIMIENTO</b><span>Dónde está cada grupo en el campo</span></span>';
    cab.parentNode.insertBefore(btn, cab.nextSibling);
    btn.onclick = () => { if(R() && typeof R().abrir === 'function') R().abrir(); else abrir(); };   // abre «Ritmo del campo», el de siempre
  }
  async function cargar(){
    const desde = new Date(Date.now() - 16 * 3600 * 1000).toISOString();
    const { data } = await initSupabase().from('rounds')
      .select('code, round_name, course_id, course_name, course_par, match_groups, updated_at')
      .gte('updated_at', desde).order('updated_at', { ascending: false }).limit(12);
    rondas = (data || []).filter(r => (r.match_groups || []).some(g => g && (g.players || []).filter(Boolean).length && (g.horas || g.hora || g.scores)))
      .filter(r => (r.match_groups || []).length > 0 && (r.course_id));
    if(sel >= rondas.length) sel = 0;
  }
  function pintar(){
    if(!ov || ov.hidden) return;
    const c = ov.querySelector('#sgCuerpo');
    if(!rondas.length){ c.innerHTML = '<h2 class="rj-ov-h">Seguimiento</h2><p class="rj-nocir">No hay ninguna partida en juego ahora mismo.</p>'; return; }
    const ronda = rondas[sel], ahora = Date.now();
    const lista = (ronda.match_groups || []).map((g, i) => ({ g, i })).filter(x => x.g && (x.g.players || []).filter(Boolean).length)
      .map(x => { const e = R()._estadoGrupo(ronda, x.g, ahora); e.num = x.i + 1; return e; });
    const vivos = lista.filter(e => !e.fin && e.juegaEn);
    const T = R()._trazado && R()._trazado[base(ronda.course_id)];
    const filas = lista.map(e => {
      const t = e.fin ? 'ha terminado' : e.sinDatos ? 'aún sin anotar' : 'hoyo ' + e.juegaEn + (e.retraso >= 8 ? ' · se retrasa ' + e.retraso + ' min' : ' · a tiempo');
      return '<div class="rj-f"><span class="rj-n">' + e.num + '</span><span class="rj-t"><b>Grupo ' + e.num + ' · ' + esc(t) + '</b><small>' + esc((e.g.players || []).filter(Boolean).join(', ')) + '</small></span></div>';
    }).join('');
    const circ = T && R()._circuito ? R()._circuito(vivos, ronda.course_id, { base: base(ronda.course_id), off: offDe(ronda.course_id) }) : '';
    const chips = rondas.length > 1 ? '<div class="sg-chips">' + rondas.map((r, i) => '<button type="button" class="sg-chip' + (i === sel ? ' on' : '') + '" data-i="' + i + '">' + esc(r.round_name || r.code) + '</button>').join('') + '</div>' : '';
    const html = '<h2 class="rj-ov-h">Seguimiento</h2><p class="rj-ov-p">' + esc(ronda.course_name || '') + ' · se actualiza solo</p>' + chips
      + (circ || '<p class="rj-nocir">Este campo aún no tiene el circuito dibujado. Abajo ves la lista de grupos.</p>') + '<div class="rj-lst">' + filas + '</div>';
    if(c.dataset.k !== html){ c.dataset.k = html; c.innerHTML = html; }
  }
  async function abrir(){
    if(!ov){
      ov = document.createElement('div'); ov.className = 'rj-ov'; ov.id = 'sgOv'; ov.hidden = true;
      ov.innerHTML = '<div class="rj-ov-top"><button type="button" class="rj-ov-volver" id="sgVolver">‹ Volver</button></div><div class="rj-ov-cuerpo" id="sgCuerpo"></div>';
      document.body.appendChild(ov);
      ov.querySelector('#sgVolver').onclick = () => { ov.hidden = true; clearInterval(timer); };
      ov.addEventListener('click', ev => { const b = ev.target.closest('.sg-chip'); if(b){ sel = +b.dataset.i; pintar(); } });
    }
    ov.hidden = false; ov.querySelector('#sgCuerpo').innerHTML = '<p class="rj-ov-p">Cargando…</p>';
    try { await cargar(); } catch(e){}
    pintar();
    clearInterval(timer);
    timer = setInterval(async () => { if(ov.hidden || document.hidden) return; try { await cargar(); } catch(e){} pintar(); }, 20000);
  }
  // Solo si la cuenta es de super administrador (Carlos). El perfil llega un poco después de abrir la app.
  let n = 0;
  const vig = setInterval(() => {
    const p = window.miPerfil;
    if(p){ clearInterval(vig); if(p.es_super) poner(); return; }
    if(++n > 90) clearInterval(vig);
  }, 1000);
})();
