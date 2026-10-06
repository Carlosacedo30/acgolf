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
  async function abrirUltimaPartida(btn, otro){
    if(btn.dataset.busy) return;
    const client = (typeof initSupabase === 'function') ? initSupabase() : null;
    if(!client){ alert('Sin conexión: no se puede abrir la última partida.'); return; }
    const span = btn.querySelector('span'); const txt = span ? span.textContent : '';
    btn.dataset.busy = '1'; if(span) span.textContent = 'Buscando…';
    try {
      let yo = otro || ''; if(!yo){ try { yo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){} }
      if(!yo){
        // El móvil aún no sabe quién eres: se pregunta una vez y se recuerda
        delete btn.dataset.busy; if(span) span.textContent = txt;
        yo = await elegirQuienEres();
        if(!yo) return;
        btn.dataset.busy = '1'; if(span) span.textContent = 'Buscando…';
      }
      const clave = n => String(n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
      const { data, error } = await client.from('rounds').select('code, match_groups, updated_at')
        .not('course_id', 'is', null).order('updated_at', { ascending: false }).limit(40);
      if(error || !data) throw error;
      const terminadas = data.filter(r => isRoundFinished(r.match_groups));
      const conmigo = yo ? terminadas.find(r => (r.match_groups || []).some(g => (g.players || []).some(n => clave(n) === clave(yo) || String(n).split(' / ').some(m => clave(m) === clave(yo))))) : null;
      const ronda = conmigo;
      if(!ronda){ alert(otro ? String(yo).split(' ')[0] + ' todavía no tiene ninguna partida terminada con la app.' : 'Todavía no tienes ninguna partida terminada con la app, ' + String(yo).split(' ')[0] + '.'); return; }
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

  // Ventana "¿Quién eres?": lista de jugadores de la liga con botones grandes. Devuelve el nombre elegido (o '' si se cierra).
  function elegirQuienEres(sinGuardar){
    return new Promise(resolve => {
      const nombres = (typeof FAVORITE_PLAYERS !== 'undefined' ? FAVORITE_PLAYERS.slice() : []).sort((a, b) => a.localeCompare(b, 'es'));
      const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
      const ov = document.createElement('div');
      ov.className = 'modal-overlay pr-overlay';
      ov.innerHTML = '<div class="modal-card pr-card" role="dialog" aria-label="¿Quién eres?">'
        + '<button type="button" class="conv-close" aria-label="Cerrar">✕</button>'
        + '<div class="pr-titulo">' + (sinGuardar ? '¿De quién?' : '¿Quién eres?') + '</div>'
        + '<div class="pr-ayuda" style="margin-top:8px;">' + (sinGuardar ? 'Toca el nombre del jugador para ver su última partida.' : 'Toca tu nombre. Este móvil lo recordará y no te lo volverá a preguntar.') + '</div>'
        + '<div class="pr-lista">' + nombres.map(n => '<button type="button" class="pr-jug" data-n="' + esc(n) + '"><span class="pr-jn">' + esc(n) + '</span></button>').join('') + '</div>'
        + '</div>';
      document.body.appendChild(ov);
      const cerrar = v => { ov.remove(); resolve(v || ''); };
      ov.querySelector('.conv-close').addEventListener('click', () => cerrar(''));
      ov.addEventListener('click', e => { if(e.target === ov) cerrar(''); });
      ov.querySelectorAll('.pr-jug').forEach(b => b.addEventListener('click', () => {
        const n = b.dataset.n;
        if(!sinGuardar){ try { localStorage.setItem('golfAppConvMe', n); } catch(e){} }
        cerrar(n);
      }));
    });
  }

  // En el diagnóstico: ver la última partida de otro jugador (sin cambiar quién es el dueño del móvil)
  (function(){
    const b = document.getElementById('diagOtroBtn');
    if(b) b.addEventListener('click', async ()=>{
      const n = await elegirQuienEres(true);
      if(n) abrirUltimaPartida(b, n);
    });
  })();

  // Interruptor «App de la liga / Pruebas con cuentas» (pie del inicio, solo el administrador)
  (function(){
    const pie = document.getElementById('versionPie'); if(!pie) return;
    const enPruebas = /\/pruebas\//.test(location.pathname);
    const base = location.pathname.replace(/pruebas\/.*$/, '').replace(/[^/]*$/, '');
    pie.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', (b.dataset.v === 'pruebas') === enPruebas);
      b.addEventListener('click', ()=>{
        if((b.dataset.v === 'pruebas') === enPruebas) return;
        location.href = location.origin + base + (b.dataset.v === 'pruebas' ? 'pruebas/' : '');
      });
    });
    // En pruebas, el administrador se sabe al entrar con la cuenta: se mira otra vez al poco
    const mirar = () => { if(typeof getAdminKey === 'function' && getAdminKey()) pie.hidden = false; };
    mirar(); setTimeout(mirar, 2500); setTimeout(mirar, 6000);
  })();
