/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- «Seguir en vivo»: la partida como en la tele, para los del grupo que NO juegan esa partida ---
// · Jugadores de la partida (y el administrador): todo igual que antes, «Continuar partida» y apuntan.
// · Los demás del grupo con cuenta: «👁 Seguir en vivo» abre esta pantalla, solo para mirar (no se toca nada).
// · Invitado sin registro: el botón sale con candado (invitado.js).
// Se actualiza sola cada 10 s. Cuando entra un golpe nuevo, Curro o Lola lo comentan (sin voz).
(function(){
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const corto = n => String(n || '').trim().split(/\s+/)[0] || String(n || '');
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || (() => { try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } })();
  const soyAdmin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  function jugadoresDe(round){
    const out = [];
    (round && round.match_groups || []).forEach(g => (g && g.players || []).forEach(n => { if(n) out.push(n); }));
    return out;
  }
  const juegoYo = round => { const y = norm(yo()); return !!y && jugadoresDe(round).some(n => norm(n) === y); };

  async function leerRonda(code){
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client) return null;
    const { data, error } = await client.from('rounds').select('code, round_name, course_id, course_name, course_par, match_groups, created_at').eq('code', code).maybeSingle();
    return error ? null : data;
  }
  function paresDe(round){
    try { const c = (typeof COURSES !== 'undefined' ? COURSES : []).find(x => x.id === round.course_id); if(c && Array.isArray(c.par)) return c.par; } catch(e){}
    if(Array.isArray(round.course_par)) return round.course_par;
    return Array(18).fill(4);
  }

  // ---------- Abrir según quién eres ----------
  async function abrir(code, btn, textoBtn){
    if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.textContent = 'Abriendo…'; }
    try {
      const round = await leerRonda(code);
      if(round && !juegoYo(round) && !soyAdmin()){ pantalla(code, round); return; }
      const res = await joinSharedRound(code);
      if(res && res.ok) goTo(3); else if(res && res.msg) alert(res.msg);
    } finally { if(btn){ delete btn.dataset.busy; btn.textContent = textoBtn; } }
  }

  // En la portada: si no juegas esa partida, el botón pasa a ser «👁 Seguir en vivo»
  function ajustarPortada(r){
    const btn = document.getElementById('homeContinuarBtn');
    if(!btn || !r) return;
    const y = norm(yo());
    const juego = !!y && (r.players || []).some(n => norm(n) === y);
    if(juego || soyAdmin()) return;
    const nuevo = btn.cloneNode(false);
    nuevo.id = 'homeVivoBtn'; nuevo.className = btn.className + ' vv-btn';
    nuevo.textContent = '👁 Seguir en vivo ›';
    btn.replaceWith(nuevo);
    const t = document.querySelector('#homeEnMarcha .home-marcha-t'); if(t) t.innerHTML = '<span class="vv-dot"></span> Partida en directo';
    nuevo.addEventListener('click', () => abrir(r.code, nuevo, '👁 Seguir en vivo ›'));
  }
  function engancharPortada(){
    if(typeof window.renderHomeEnMarcha !== 'function' || window.renderHomeEnMarcha.__vv) return;
    const orig = window.renderHomeEnMarcha;
    const nuevo = function(recent){
      const res = orig.apply(this, arguments);
      try {
        const limite = Date.now() - 6 * 3600 * 1000;
        const r = (recent || []).find(x => x.finished === false && x.date && new Date(x.date).getTime() >= limite);
        ajustarPortada(r);
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
  let timer = null, previo = null, codigoAbierto = null, bannerT = null;
  function cerrar(){
    clearInterval(timer); timer = null; codigoAbierto = null; previo = null;
    const ov = document.getElementById('vvOverlay'); if(ov) ov.hidden = true;
    document.body.classList.remove('vv-abierto');
  }
  function pantalla(code, round){
    let ov = document.getElementById('vvOverlay');
    if(!ov){
      ov = document.createElement('div'); ov.id = 'vvOverlay'; ov.className = 'vv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Partida en directo');
      document.body.appendChild(ov);
    }
    ov.hidden = false; document.body.classList.add('vv-abierto');
    codigoAbierto = code; previo = null;
    ov.innerHTML = '<div class="vv-top"><span class="vv-live"><i></i>EN DIRECTO</span>'
      + '<div class="vv-tit"><b>' + esc(round.round_name || 'Partida') + '</b>' + esc(round.course_name || '') + '</div>'
      + '<button type="button" class="vv-x" aria-label="Cerrar">✕</button></div>'
      + '<div class="vv-tableros"></div><div class="vv-ult" aria-live="polite"></div>'
      + '<div class="vv-car">' + tarjetas() + '</div><p class="vv-pie">Solo para mirar · se actualiza solo</p>';
    ov.querySelector('.vv-x').onclick = cerrar;
    pintar(round);
    clearInterval(timer);
    timer = setInterval(async () => {
      if(codigoAbierto !== code || document.hidden) return;
      const r = await leerRonda(code); if(r) pintar(r);
    }, 10000);
  }

  function pintar(round){
    const ov = document.getElementById('vvOverlay'); if(!ov) return;
    const pares = paresDe(round);
    const grupos = (round.match_groups || []).filter(g => g && (g.players || []).filter(Boolean).length);
    const nuevos = [];
    const html = grupos.map((g, gi) => {
      const sc = g.scores || {};
      const nombres = g.players;
      let actual = 0;
      nombres.forEach((_, p) => Object.keys(sc[p] || {}).forEach(h => { if(+sc[p][h] > 0 && +h > actual) actual = +h; }));
      const ultimo = Math.max(actual, 1);
      const desde = Math.max(1, ultimo - 4), cols = [];
      for(let h = desde; h <= Math.max(ultimo, desde + 4) && h <= 18; h++) cols.push(h);
      const filas = nombres.map((n, p) => {
        let tot = 0, jugados = 0;
        Object.keys(sc[p] || {}).forEach(h => { const v = +sc[p][h]; if(v > 0){ tot += v - (pares[h - 1] || 4); jugados++; } });
        const celdas = cols.map(h => {
          const v = +((sc[p] || {})[h]); const par = pares[h - 1] || 4;
          const clave = gi + ':' + p + ':' + h;
          if(v > 0 && previo && !previo[clave]) nuevos.push({ n: corto(n), g: v, par, h });
          const cls = !(v > 0) ? 'vacio' : v < par ? 'bajo' : v > par ? 'alto' : '';
          return '<td class="' + cls + (h === actual ? ' ahora' : '') + '">' + (v > 0 ? v : '—') + '</td>';
        }).join('');
        const t = jugados ? (tot === 0 ? 'E' : (tot > 0 ? '+' : '−') + Math.abs(tot)) : '·';
        return '<tr><td class="nom">' + esc(corto(n)) + '</td>' + celdas + '<td class="tot">' + t + '</td></tr>';
      }).join('');
      const hora = g.time ? 'Salida ' + esc(g.time) : (grupos.length > 1 ? 'Partida ' + (gi + 1) : '');
      return '<div class="vv-tab"><div class="vv-hoyo">' + (actual ? 'HOYO ' + actual + ' · PAR ' + (pares[actual - 1] || '') : 'AÚN SIN GOLPES') + '<span>' + hora + '</span></div>'
        + '<table><tr><th></th>' + cols.map(h => '<th>' + h + '</th>').join('') + '<th>±</th></tr>' + filas + '</table></div>';
    }).join('');
    ov.querySelector('.vv-tableros').innerHTML = html || '<div class="vv-tab vv-vacia">Todavía no hay jugadores en esta partida.</div>';
    // Recordar lo que había, para saber qué golpe es nuevo
    const ahora = {};
    grupos.forEach((g, gi) => (g.players || []).forEach((_, p) => Object.keys((g.scores || {})[p] || {}).forEach(h => { if(+g.scores[p][h] > 0) ahora[gi + ':' + p + ':' + h] = 1; })));
    previo = ahora;
    if(nuevos.length) comentar(nuevos[nuevos.length - 1]);
  }

  // Curro o Lola comentan el último golpe (texto, sin voz)
  function comentar(x){
    const box = document.querySelector('#vvOverlay .vv-ult'); if(!box) return;
    const C = window.acgolfCurro;
    let f = null;
    // Se turnan por hoyo (impares Curro, pares Lola), igual en todos los móviles; si el jugador eligió uno solo, ese
    let fijo = null;
    try { const m = C && C.modoCaddie ? C.modoCaddie() : 'turnos'; fijo = m === 'turnos' ? (x.h % 2 ? 'curro' : 'lola') : m; } catch(e){}
    try { if(C && C.frase) f = C.frase({ n: x.n, bruto: x.g - x.par, neto: x.g - x.par, h: x.h }, fijo); } catch(e){}
    const quien = (f && f.quien) || 'curro';
    const cara = C && C.cara ? C.cara((f && f.animo) || 'feliz', quien) : '';
    const texto = f ? f.t : esc(x.n) + ' hace ' + x.g + ' en el hoyo ' + x.h + '.';
    box.innerHTML = '<div class="vv-com ' + (quien === 'lola' ? 'lola' : '') + '">' + cara + '<div class="vv-bur"><b>' + (quien === 'lola' ? 'Lola' : 'Curro') + ' · hoyo ' + x.h + '</b><p>' + texto + '</p></div></div>';
    box.classList.remove('ver'); void box.offsetWidth; box.classList.add('ver');
    clearTimeout(bannerT); bannerT = setTimeout(() => box.classList.remove('ver'), 9000);
  }

  // Carrusel (se pasa con el dedo): clasificación, ¿sabías que…?, la oferta del patrocinador y un consejo
  function tarjetas(){
    const out = [];
    const clas = document.getElementById('homeLigaBody');
    if(clas && clas.textContent.trim()) out.push('<div class="vv-card"><h4>📊 La liga esta semana</h4><div class="vv-clas">' + clas.innerHTML + '</div></div>');
    const H = window.historiaGolfDatos;
    if(Array.isArray(H) && H.length){ const h = H[Math.floor(Math.random() * H.length)]; out.push('<div class="vv-card"><h4>⛳ ¿Sabías que…? · ' + esc(h.ano) + '</h4><p><b>' + esc(h.t) + '.</b> ' + esc(h.p) + '</p></div>'); }
    out.push('<div class="vv-card vv-promo"><h4>📢 Patrocinador oficial</h4><p><b>3 bolas TaylorMade gratis</b> con cualquier pedido en Bolarecuperada, con el código <b>acgolf</b>.</p><a href="https://bolarecuperada.com/" target="_blank" rel="noopener">Ver más ›</a></div>');
    try {
      const m = (typeof CONSEJOS_GOLF !== 'undefined' && CONSEJOS_GOLF.mentalidad) || [];
      if(m.length){ const c = m[Math.floor(Math.random() * m.length)]; out.push('<div class="vv-card"><h4>💡 Consejo</h4><p><b>' + esc(c.t) + '.</b> ' + esc(c.d) + '</p></div>'); }
    } catch(e){}
    return out.join('');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', engancharPortada); else engancharPortada();
  window.addEventListener('load', engancharPortada);
  window.acgolfEnVivo = { abrir, cerrar, pantalla, pintar };
})();
