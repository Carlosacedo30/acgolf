/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Jugadores de la liga: lista compartida en Supabase, gestionada solo desde el móvil administrador ---
  let leaguePlayers = []; // [{ name, hcp }]

  async function loadLeaguePlayers(){
    const client = initSupabase();
    if(!client) return;
    try {
      const { data, error } = await client.from('league_players').select('name, hcp').eq('active', true).order('created_at', { ascending: true });
      if(error || !data || !data.length) return; // sin conexión: se queda la lista de siempre
      leaguePlayers = data;
      FAVORITE_PLAYERS.length = 0;
      data.forEach(p => {
        FAVORITE_PLAYERS.push(p.name);
        if(p.hcp !== null && p.hcp !== undefined) FAVORITE_HANDICAPS[p.name] = Number(p.hcp);
      });
      // el hándicap calculado con sus rondas manda sobre el inicial
      if(typeof loadLeagueHandicaps === 'function') await loadLeagueHandicaps();
      renderLeaguePlayersList();
    } catch(e){ console.error('No se pudo cargar la lista de jugadores', e); }
  }

  function refreshAdminUI(){
    const btn = document.getElementById('leaguePlayersBtn');
    if(btn) btn.hidden = !getAdminKey();
    const gm = document.getElementById('greensMapaBtn');
    if(gm) gm.hidden = !getAdminKey();
    if(typeof renderConvHome === 'function') renderConvHome();
  }

  function fmtHcp(v){ return (v === null || v === undefined || v === '') ? '—' : String(v).replace('.', ','); }

  function renderLeaguePlayersList(){
    const box = document.getElementById('leaguePlayersList');
    if(!box) return;
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    if(!leaguePlayers.length){ box.innerHTML = '<div class="empty-hint">No hay jugadores todavía</div>'; return; }
    box.innerHTML = leaguePlayers.map((p, i) => {
      const actual = FAVORITE_HANDICAPS[p.name];
      return '<div class="lp-row">'
        + '<div class="lp-name">' + esc(p.name) + '<small>Hcp actual ' + esc(fmtHcp(actual !== undefined ? actual : p.hcp)) + '</small></div>'
        + '<div class="lp-hcp-fixed" aria-label="Hándicap de ' + esc(p.name) + '">' + esc(fmtHcp(p.hcp)) + '</div>'
        + '<button type="button" class="lp-del" data-i="' + i + '" aria-label="Quitar a ' + esc(p.name) + '">Quitar</button>'
        + '</div>';
    }).join('');
    box.querySelectorAll('.lp-del').forEach(b => b.addEventListener('click', async ()=>{
      const p = leaguePlayers[+b.dataset.i];
      if(!confirm('¿Quitar a ' + p.name + ' de la liga?\nSus rondas y su hándicap se conservan; solo deja de salir en la lista.')) return;
      try {
        const { data, error } = await initSupabase().rpc('remove_player', { p_key: getAdminKey(), p_name: p.name });
        if(error) throw error;
        if(!data){ alert('No tienes permiso para quitar jugadores.'); return; }
        await loadLeaguePlayersFresh();
      } catch(e){ alert('No se pudo quitar. Revisa la conexión.'); }
    }));
  }

  async function loadLeaguePlayersFresh(){
    const client = initSupabase();
    const { data } = await client.from('league_players').select('name, hcp').eq('active', true).order('created_at', { ascending: true });
    leaguePlayers = data || [];
    FAVORITE_PLAYERS.length = 0;
    leaguePlayers.forEach(p => { FAVORITE_PLAYERS.push(p.name); if(p.hcp != null) FAVORITE_HANDICAPS[p.name] = Number(p.hcp); });
    if(typeof lockLeagueHcpInputs === 'function') lockLeagueHcpInputs();
    if(typeof loadLeagueHandicaps === 'function') await loadLeagueHandicaps();
    renderLeaguePlayersList();
  }

  async function savePlayer(name, hcpRaw, btn){
    const nm = String(name || '').trim().replace(/\s+/g, ' ');
    if(!nm){ alert('Escribe el nombre del jugador.'); return false; }
    const h = String(hcpRaw == null ? '' : hcpRaw).replace(',', '.').trim();
    const hcp = h === '' ? null : Number(h);
    if(hcp !== null && (isNaN(hcp) || hcp < 0 || hcp > 54)){ alert('El hándicap debe estar entre 0 y 54.'); return false; }
    const old = btn ? btn.textContent : '';
    if(btn) btn.textContent = 'Guardando…';
    try {
      const { data, error } = await initSupabase().rpc('upsert_player', { p_key: getAdminKey(), p_name: nm, p_hcp: hcp });
      if(error) throw error;
      if(!data){ alert('No tienes permiso para gestionar jugadores.'); return false; }
      await loadLeaguePlayersFresh();
      if(typeof syncOpenRoundsHandicaps === 'function') syncOpenRoundsHandicaps(); // partidas pendientes al día
      return true;
    } catch(e){ alert('No se pudo guardar. Revisa la conexión.'); return false; }
    finally { if(btn) btn.textContent = old; }
  }

  async function resetStats(btn){
    if(!confirm('¿Reiniciar hándicaps y liga?\n\n• Las partidas jugadas hasta ahora dejan de contar para el hándicap y la clasificación.\n• Cada jugador vuelve a su hándicap inicial de esta lista.\n• No se borra ninguna partida.')) return;
    const old = btn.textContent; btn.textContent = 'Reiniciando…';
    try {
      const { data, error } = await initSupabase().rpc('reset_stats', { p_key: getAdminKey() });
      if(error) throw error;
      if(!data){ alert('No tienes permiso para reiniciar.'); return; }
      statsSinceLoaded = null; await loadStatsSince();
      await loadLeaguePlayersFresh(); // vuelve a los hándicaps iniciales (y descarta los calculados antiguos)
      if(typeof syncOpenRoundsHandicaps === 'function') syncOpenRoundsHandicaps(); // partidas pendientes al día
      if(typeof ligaRoundsCache !== 'undefined') ligaRoundsCache = null;
      alert('Listo: hándicaps y liga reiniciados. Desde ahora solo cuentan las partidas nuevas.');
    } catch(e){ alert('No se pudo reiniciar. Revisa la conexión.'); }
    finally { btn.textContent = old; }
  }

  (function setupLeaguePlayers(){
    const btn = document.getElementById('leaguePlayersBtn');
    const overlay = document.getElementById('leaguePlayersOverlay');
    if(btn && overlay) btn.addEventListener('click', ()=>{ overlay.hidden = false; renderLeaguePlayersList(); loadLeaguePlayersFresh(); });
    const close = document.getElementById('leaguePlayersClose');
    if(close && overlay) close.addEventListener('click', ()=>{ overlay.hidden = true; });
    const addBtn = document.getElementById('lpAddBtn');
    if(addBtn) addBtn.addEventListener('click', async ()=>{
      const n = document.getElementById('lpNewName'), h = document.getElementById('lpNewHcp');
      const ok = await savePlayer(n ? n.value : '', h ? h.value : '', addBtn);
      if(ok){ if(n) n.value = ''; if(h) h.value = ''; }
    });
    refreshAdminUI();
    loadLeaguePlayers();
  })();

  // --- Casillas "Hcp" al configurar la partida ---
  // Jugador de la liga: su hándicap sale de la base de datos y la casilla queda bloqueada.
  // Invitado (nombre que no está en la liga): se puede escribir su hándicap.
  function isLeaguePlayerName(name){
    return !!name && leaguePlayers.some(p => p.name === name);
  }
  function lockLeagueHcpInputs(){
    for(let i = 1; i <= 4; i++){
      const nameEl = document.getElementById('player' + i + 'Input');
      const hcpEl = document.getElementById('player' + i + 'Hcp');
      if(!nameEl || !hcpEl) continue;
      const name = nameEl.value.trim();
      const locked = isLeaguePlayerName(name);
      hcpEl.readOnly = locked;
      hcpEl.classList.toggle('hcp-locked', locked);
      hcpEl.title = locked ? 'Hándicap oficial de la liga: no se puede cambiar' : '';
      if(locked && FAVORITE_HANDICAPS[name] !== undefined) hcpEl.value = FAVORITE_HANDICAPS[name];
    }
  }
  (function bindHcpLocks(){
    for(let i = 1; i <= 4; i++){
      const nameEl = document.getElementById('player' + i + 'Input');
      if(!nameEl) continue;
      ['input', 'change', 'blur'].forEach(ev => nameEl.addEventListener(ev, ()=> setTimeout(lockLeagueHcpInputs, 0)));
    }
    document.addEventListener('click', ()=> setTimeout(lockLeagueHcpInputs, 0)); // tras elegir de la lista
  })();
