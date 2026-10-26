/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Foto o avatar de golf de cada jugador (versión con cuentas) ---
// Cada jugador pone su foto (se guarda pequeña) o elige un avatar de golf.
// Si no tiene, sale un círculo con su inicial. El administrador puede ponérselo a cualquiera de su grupo.
// La foto sale al lado del nombre en clasificaciones, medallas, partidas y resúmenes.
(function(){
  const client = (typeof initSupabase === 'function') ? initSupabase() : null;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const LADO = 160;               // tamaño de la foto guardada (en píxeles)
  const AVATARES = ['🏌️‍♂️','🏌️‍♀️','🏌️','⛳','🏆','🥇','🎯','🦅','🐦','🦆','🐊','🦁','🐯','🐻','🦊','🐺','🦉','🐢','🧢','😎','🤠','😄','🍺','☀️','🌵','🚩','🔥','⭐'];
  const COLORES = ['#2E7D5B','#1F5F99','#8C4A9E','#B8562B','#4E6E1F','#A23B53','#2A7F86','#7A5C1E'];

  // ---------- Datos ----------
  let lista = {};      // nombre completo -> { tipo, valor }
  let indice = {};     // nombre o nombre corto -> nombre completo (null si hay dos iguales)
  const clave = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
  function variantes(n){
    const w = String(n || '').trim().split(/\s+/).filter(Boolean);
    const v = new Set([w.join(' ')]);
    if(w.length > 2) v.add(w.slice(0, -1).join(' '));  // como la clasificación de la liga
    if(w.length > 1) v.add(w.slice(0, 2).join(' '));
    if(w.length) v.add(w[0]);
    return [...v].map(clave);
  }
  function nombresConocidos(){
    const s = new Set(Object.keys(lista));
    // (son variables de otros archivos de la app, no de window)
    try { (typeof leaguePlayers !== 'undefined' ? leaguePlayers : []).forEach(p => p && p.name && s.add(p.name)); } catch(e){}
    try { Object.keys(typeof FAVORITE_HANDICAPS !== 'undefined' ? FAVORITE_HANDICAPS : {}).forEach(n => s.add(n)); } catch(e){}
    if(window.miPerfil && window.miPerfil.player_name) s.add(window.miPerfil.player_name);
    return [...s];
  }
  function rehacerIndice(){
    indice = {};
    nombresConocidos().forEach(n => variantes(n).forEach(k => {
      if(!(k in indice)) indice[k] = n; else if(indice[k] !== n) indice[k] = null;
    }));
  }
  function completo(texto){ const k = clave(texto); return Object.prototype.hasOwnProperty.call(indice, k) ? indice[k] : undefined; }

  async function cargar(){
    if(!client) return;
    try {
      const { data, error } = await client.from('avatares').select('player_name, tipo, valor');
      if(error) return;
      lista = {};
      (data || []).forEach(a => { lista[a.player_name] = { tipo: a.tipo, valor: a.valor }; });
      rehacerIndice();
      redecorar();
      pintarBotonCuenta();
    } catch(e){}
  }

  // ---------- Dibujo del avatar ----------
  function colorDe(n){ let h = 0; for(const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h = (h ^ (h >>> 13)) >>> 0; return COLORES[h % COLORES.length]; }
  function inicial(n){ const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); }
  function html(nombre, tam, conf){
    const a = conf !== undefined ? conf : lista[nombre];
    const cls = 'av' + (tam ? ' av-' + tam : '');
    if(a && a.tipo === 'foto') return '<span class="' + cls + '" aria-hidden="true"><img src="' + esc(a.valor) + '" alt=""></span>';
    if(a && a.tipo === 'emoji') return '<span class="' + cls + ' av-emoji" aria-hidden="true" style="background:' + colorDe(nombre) + '">' + esc(a.valor) + '</span>';
    return '<span class="' + cls + ' av-ini" aria-hidden="true" style="background:' + colorDe(nombre) + '">' + esc(inicial(nombre)) + '</span>';
  }

  // ---------- Poner la foto al lado de los nombres de la app ----------
  // [selector, tamaño]: el nombre es el primer texto que hay dentro
  const SITIOS = [
    ['.leaderboard-name', 'md'], ['.champ-name', 'sm'], ['.liga-sem-nom', 'sm'], ['.liga-sem-win strong', 'sm'],
    ['.med-jug-nom', 'sm'], ['.lp-name', 'sm'], ['.conv-row-name', 'sm'], ['.pr-jn', 'sm'],
    ['.rj-jug b', 'sm'], ['.dbi-jug', 'sm'], ['.med-titulo', 'lg'], ['.rj-nom', 'lg'], ['.sum-player .club', 'md']
  ];
  function primerTexto(el){
    for(const n of el.childNodes){ if(n.nodeType === 3 && n.nodeValue.trim()) return n; }
    return null;
  }
  function decorar(raiz){
    SITIOS.forEach(([sel, tam]) => {
      raiz.querySelectorAll(sel).forEach(el => {
        const t = primerTexto(el); if(!t) return;
        const nombre = completo(t.nodeValue);
        const previo = el.querySelector(':scope > .av');
        const firma = nombre ? nombre + '|' + JSON.stringify(lista[nombre] || '') : '';
        if(previo && previo.dataset.f === firma) return;
        if(previo) previo.remove();
        if(!nombre) return;
        const span = document.createElement('span');
        span.innerHTML = html(nombre, tam);
        const av = span.firstChild; av.dataset.f = firma;
        el.insertBefore(av, t);
        el.classList.add('av-con');
      });
    });
    // El círculo con iniciales del resumen de la partida
    raiz.querySelectorAll('.resumen-player').forEach(p => {
      const nm = p.querySelector('.nm'), circ = p.querySelector('.resumen-avatar');
      if(!nm || !circ) return;
      const nombre = completo(nm.textContent) || nm.textContent.trim();
      const a = lista[nombre];
      const firma = JSON.stringify(a || '');
      if(circ.dataset.f === firma) return;
      circ.dataset.f = firma;
      if(a && a.tipo === 'foto'){ circ.innerHTML = '<img src="' + esc(a.valor) + '" alt="">'; circ.classList.add('av-foto'); }
      else if(a && a.tipo === 'emoji'){ circ.textContent = a.valor; circ.classList.remove('av-foto'); circ.style.fontSize = '20px'; }
    });
  }
  let pendiente = false;
  function redecorar(){
    if(pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; rehacerIndice(); try { decorar(document); } catch(e){} });
  }
  new MutationObserver(muts => {
    for(const m of muts){ if(m.addedNodes.length && !(m.target.closest && m.target.closest('.av'))){ redecorar(); return; } }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // ---------- Botón «Mi cuenta» con mi foto ----------
  function pintarBotonCuenta(){
    const b = document.querySelector('.cg-mi'); const p = window.miPerfil;
    if(!b || !p) return;
    // «Ir a mi cuenta»: si el jugador tiene foto o avatar, sale en lugar del muñequito
    const ico = b.querySelector('.cg-bt-ico');
    if(ico && lista[p.player_name]){ ico.innerHTML = html(p.player_name, 'sm'); b.classList.add('av-con'); }
  }

  // ---------- Foto: recortar en cuadrado y hacerla pequeña ----------
  function leerFoto(file){
    return new Promise((ok, mal) => {
      if(!file || !/^image\//.test(file.type)){ mal(new Error('Eso no es una foto.')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const lado = Math.min(img.naturalWidth, img.naturalHeight);
        const c = document.createElement('canvas'); c.width = c.height = LADO;
        const ctx = c.getContext('2d');
        // recorte centrado, un poco hacia arriba (las caras suelen estar arriba)
        const sx = (img.naturalWidth - lado) / 2, sy = Math.max(0, (img.naturalHeight - lado) / 2 - (img.naturalHeight - lado) * 0.15);
        ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO);
        URL.revokeObjectURL(url);
        let q = 0.82, d = c.toDataURL('image/jpeg', q);
        while(d.length > 60000 && q > 0.4){ q -= 0.1; d = c.toDataURL('image/jpeg', q); }
        ok(d);
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se ha podido abrir esa foto. Prueba con otra.')); };
      img.src = url;
    });
  }

  // ---------- Pantalla para elegir foto o avatar ----------
  function editar(perfil, paraQuien){
    perfil = perfil || window.miPerfil; if(!perfil) return;
    const yo = perfil.player_name;
    let quien = paraQuien || yo;
    let elegido = lista[quien] ? Object.assign({}, lista[quien]) : null;
    const ov = document.createElement('div');
    ov.className = 'av-ov';
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    function pintar(aviso, ok){
      const otros = perfil.es_admin ? nombresConocidos().filter(n => n !== yo).sort((a, b) => a.localeCompare(b, 'es')) : [];
      ov.innerHTML = '<div class="av-caja" role="dialog" aria-label="Foto o avatar">'
        + '<button type="button" class="av-x" aria-label="Cerrar">✕</button>'
        + '<div class="av-tit">' + (quien === yo ? 'Tu foto o avatar' : 'Foto de ' + esc(quien)) + '</div>'
        + (otros.length ? '<label class="av-quien">¿De quién?<select id="avQuien"><option value="' + esc(yo) + '">Yo (' + esc(yo) + ')</option>'
            + otros.map(n => '<option value="' + esc(n) + '"' + (n === quien ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select></label>' : '')
        + '<div class="av-vista">' + html(quien, 'xl', elegido) + '</div>'
        + '<label class="av-btn av-foto-btn">📷 Hacer una foto o elegir de la galería<input type="file" accept="image/*" id="avArchivo" hidden></label>'
        + '<div class="av-sub">O elige un avatar de golf:</div>'
        + '<div class="av-rejilla">' + AVATARES.map(e => '<button type="button" class="av-op' + (elegido && elegido.tipo === 'emoji' && elegido.valor === e ? ' sel' : '') + '" data-e="' + e + '">' + e + '</button>').join('')
        + '<button type="button" class="av-op av-op-ini' + (!elegido ? ' sel' : '') + '" data-e="" style="background:' + colorDe(quien) + '">' + esc(inicial(quien)) + '</button></div>'
        + '<div class="av-msg' + (ok ? ' ok' : '') + '">' + esc(aviso || '') + '</div>'
        + '<button type="button" class="av-btn av-guardar" id="avGuardar">Guardar</button>'
        + '<button type="button" class="av-btn av-ghost" id="avCancelar">Cancelar</button>'
        + '</div>';
      ov.querySelector('.av-x').onclick = cerrar;
      ov.querySelector('#avCancelar').onclick = cerrar;
      const sel = ov.querySelector('#avQuien');
      if(sel) sel.onchange = () => { quien = sel.value; elegido = lista[quien] ? Object.assign({}, lista[quien]) : null; pintar(); };
      ov.querySelectorAll('.av-op').forEach(b => b.onclick = () => { elegido = b.dataset.e ? { tipo: 'emoji', valor: b.dataset.e } : null; pintar(); });
      ov.querySelector('#avArchivo').onchange = async e => {
        const f = e.target.files && e.target.files[0]; if(!f) return;
        pintar('Preparando la foto…', true);
        try { elegido = { tipo: 'foto', valor: await leerFoto(f) }; pintar('¿Te gusta? Pulsa «Guardar».', true); }
        catch(err){ pintar(err.message); }
      };
      ov.querySelector('#avGuardar').onclick = async ev => {
        const b = ev.target; b.disabled = true; b.textContent = 'Guardando…';
        try {
          const { data, error } = await client.rpc('poner_avatar', { p_tipo: elegido ? elegido.tipo : null, p_valor: elegido ? elegido.valor : null, p_player: quien === yo ? null : quien });
          if(error || !data) throw error || new Error('No tienes permiso para cambiar esa foto.');
          if(elegido) lista[quien] = elegido; else delete lista[quien];
          rehacerIndice(); redecorar(); pintarBotonCuenta();
          cerrar();
        } catch(err){
          const m = String((err && err.message) || '');
          pintar(/fetch|network/i.test(m) ? 'Sin conexión. Vuelve a probar.' : (m || 'No se ha podido guardar. Vuelve a probar.'));
        }
      };
    }
    pintar();
  }

  window.acgolfAvatares = { html, editar, recargar: cargar };

  // Arranque: cuando la cuenta ya está cargada
  (function esperar(intentos){
    if(window.miPerfil){ cargar(); return; }
    if(intentos > 0) setTimeout(() => esperar(intentos - 1), 400);
  })(60);
})();
