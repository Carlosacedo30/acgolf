/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Inicio limpio: botones grandes que llevan a cada información ---
  // "Clasificación liga" abre la pantalla de la liga. Los demás enseñan solo esa parte del inicio,
  // con un botón para volver; el resto del inicio queda escondido mientras tanto.
  const HOME_FOCO = {
    premios:   { id:'premiosHome',   vacio:'Todavía no hay ganadores: los premios salen cuando se juegan tarjetas de la liga en la semana.' },
    medallas:  { id:'medallasHome',  vacio:'Todavía no hay medallas que enseñar.' },
    recientes: { id:'homeRecientes', vacio:'' },
  };

  function homeFoco(clave){
    const pant = document.querySelector('.screen[data-screen="0"]');
    if(!pant) return;
    Object.values(HOME_FOCO).forEach(f => { const el = document.getElementById(f.id); if(el) el.classList.remove('home-foco-on'); });
    const vacio = document.getElementById('homeVacio');
    if(vacio) vacio.classList.remove('home-foco-on');
    if(!clave || !HOME_FOCO[clave]){ delete pant.dataset.foco; return; }
    pant.dataset.foco = clave;
    const f = HOME_FOCO[clave];
    const el = document.getElementById(f.id);
    if(clave === 'recientes' && typeof renderRecentRounds === 'function') renderRecentRounds();
    if(el){
      el.classList.add('home-foco-on');
      // premios y medallas se esconden solos cuando no hay datos: entonces se avisa
      if(el.style.display === 'none' && f.vacio && vacio){ vacio.textContent = f.vacio; vacio.classList.add('home-foco-on'); }
    }
    const sc = pant.querySelector('.screen-content') || pant;
    try { sc.scrollTo({ top: 0 }); } catch(e){ sc.scrollTop = 0; }
    window.scrollTo(0, 0);
  }

  (function setupHomeMenu(){
    document.querySelectorAll('.home-menu-btn[data-foco]').forEach(b => b.addEventListener('click', ()=> homeFoco(b.dataset.foco)));
    const liga = document.getElementById('hmLiga');
    if(liga) liga.addEventListener('click', ()=>{ homeFoco(null); goTo(6); });
    const consejos = document.getElementById('hmConsejos');
    if(consejos) consejos.addEventListener('click', ()=>{ homeFoco(null); goTo(5); });
    const diag = document.getElementById('hmDiagnostico');
    if(diag) diag.addEventListener('click', ()=> abrirUltimaPartida(diag));
    const volver = document.getElementById('homeVolver');
    if(volver) volver.addEventListener('click', ()=> homeFoco(null));
  })();

  // "Mi última partida": abre el diagnóstico (cifras, hoyo a hoyo, hoyos a revisar y plan) de la última
  // partida terminada en la que jugaste tú (el nombre que este móvil tiene elegido); si no se sabe, la última terminada.
  async function abrirUltimaPartida(btn){
    if(btn.dataset.busy) return;
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client){ alert('Sin conexión: no se puede abrir la última partida.'); return; }
    const span = btn.querySelector('span'); const txt = span ? span.textContent : '';
    btn.dataset.busy = '1'; if(span) span.textContent = 'Buscando…';
    try {
      let yo = ''; try { yo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
      const clave = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const { data, error } = await client.from('rounds').select('code, match_groups, updated_at')
        .not('course_id', 'is', null).order('updated_at', { ascending: false }).limit(40);
      if(error || !data) throw error;
      const terminadas = data.filter(r => isRoundFinished(r.match_groups));
      const conmigo = yo ? terminadas.find(r => (r.match_groups || []).some(g => (g.players || []).some(n => clave(n) === clave(yo) || String(n).split(' / ').some(m => clave(m) === clave(yo))))) : null;
      const ronda = conmigo || terminadas[0];
      if(!ronda){ alert('Todavía no hay ninguna partida terminada.'); return; }
      const res = await joinSharedRound(ronda.code);
      if(!res || !res.ok){ alert((res && res.msg) || 'No se pudo abrir la partida.'); return; }
      // Ponerse en el grupo y en la pestaña de este jugador
      if(yo){
        const gi = matchGroups.findIndex(g => (g.players || []).some(n => clave(n) === clave(yo) || String(n).split(' / ').some(m => clave(m) === clave(yo))));
        if(gi > 0 && typeof switchGroup === 'function') switchGroup(gi);
        const pi = players.findIndex(n => clave(n) === clave(yo) || String(n).split(' / ').some(m => clave(m) === clave(yo)));
        if(pi >= 0) diagActivePlayer = pi;
      }
      roundMarkedFinished = true; // terminada: se puede compartir el resultado
      goTo(4);
    } catch(e){
      alert('No se pudo abrir la última partida. Revisa tu conexión.');
    } finally {
      delete btn.dataset.busy; if(span) span.textContent = txt;
    }
  }
