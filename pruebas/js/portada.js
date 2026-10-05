/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Portada (Inicio): "Ahora mismo" y "La liga esta semana" ---
  // "Ahora mismo" junta lo que toca hacer hoy: una partida en marcha, la próxima salida convocada y empezar una nueva.

  const HOME_EN_MARCHA_HORAS = 6; // una partida sin terminar tocada en las últimas 6 h cuenta como "en marcha"
  let homeEnMarchaCode = null;

  function homeEsc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function homeNombreCorto(n){ return (typeof ligaNombreCorto === 'function') ? ligaNombreCorto(n) : String(n || ''); }
  function homeEsAdmin(){ return (typeof getAdminKey === 'function') && !!getAdminKey(); }
  function homeYo(){ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } }

  // Partida en marcha (la más reciente sin terminar), con un botón grande para seguir anotando
  function renderHomeEnMarcha(recent){
    const box = document.getElementById('homeEnMarcha');
    if(!box) return;
    const limite = Date.now() - HOME_EN_MARCHA_HORAS * 3600 * 1000;
    const r = (recent || []).find(x => x.finished === false && x.date && new Date(x.date).getTime() >= limite);
    homeEnMarchaCode = r ? r.code : null;
    if(!r){ box.innerHTML = ''; homeAhoraTitulo(); return; }
    const quien = (r.players || []).map(n => String(n).split(' ')[0]);
    box.innerHTML =
      '<div class="home-marcha">'
      + '<div class="home-marcha-t">Partida en marcha</div>'
      + '<div class="home-marcha-sub">' + homeEsc(r.roundName ? r.roundName + ' · ' : '') + homeEsc(r.courseName || 'Campo') + '</div>'
      + (quien.length ? '<div class="home-marcha-chips">' + quien.map(n => '<span>' + homeEsc(n) + '</span>').join('') + '</div>' : '')
      + '<button type="button" class="home-big-btn" id="homeContinuarBtn">Continuar partida ›</button>'
      + (homeEsAdmin() ? '<button type="button" class="home-marcha-borrar" id="homeBorrarBtn">' + icono('papelera') + ' Borrar esta partida</button>' : '')
      + '</div>';
    const borrar = document.getElementById('homeBorrarBtn');
    if(borrar) borrar.addEventListener('click', async ()=>{
      if(borrar.dataset.busy) return;
      const titulo = r.roundName || r.courseName || 'Partida';
      if(!confirm('¿Borrar la partida "' + titulo + '"?\nSe borrará para todos los jugadores y no se puede deshacer.')) return;
      borrar.dataset.busy = '1'; borrar.textContent = 'Borrando…';
      const res = await deleteSharedRound(r.code);
      if(res && res.ok){ if(typeof renderRecentRounds === 'function') renderRecentRounds(); }
      else { alert((res && res.msg) || 'No se pudo borrar la partida'); delete borrar.dataset.busy; borrar.innerHTML = icono('papelera') + ' Borrar esta partida'; }
    });
    const btn = document.getElementById('homeContinuarBtn');
    if(btn) btn.addEventListener('click', async ()=>{
      if(btn.dataset.busy) return;
      btn.dataset.busy = '1'; btn.textContent = 'Abriendo…';
      const res = await joinSharedRound(r.code);
      delete btn.dataset.busy; btn.textContent = 'Continuar partida ›';
      if(res && res.ok) goTo(3);
    });
    homeAhoraTitulo();
  }

  // Si ya hay partida en marcha o salida convocada, "empezar una nueva" pasa a segundo plano
  function homeAhoraTitulo(){
    const t = document.getElementById('homeAhoraT');
    if(!t) return;
    const hayConv = (typeof convActivas !== 'undefined') && convActivas && convActivas.length > 0;
    const hayMarcha = !!homeEnMarchaCode;
    t.textContent = (hayConv || hayMarcha) ? 'O empieza una partida nueva' : '¿Dónde jugamos hoy?';
    t.classList.toggle('secundario', hayConv || hayMarcha);
  }

  // --- La liga esta semana: los 3 primeros (neto), tu puesto y el líder del mes ---
  function homeIsoHoy(){
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function renderHomeLigaSemanaData(data){
    const body = document.getElementById('homeLigaBody');
    if(!body) return;
    const hoy = homeIsoHoy();
    const semanas = (data && data.semanas) || [];
    const sem = semanas.find(s => s.desde <= hoy && hoy <= s.hasta);
    const clas = (sem && sem.clasificacion) || [];
    const mes = (data && data.clasificacion) || [];
    let html = '';
    if(!clas.length){
      html += '<div class="home-liga-vacia">Esta semana todavía no hay tarjetas. ¡Estrena tú la clasificación!</div>';
    } else {
      html += clas.slice(0, 3).map(c =>
        '<div class="home-rk' + (c.pos === 1 ? ' p1' : '') + '">'
        + '<div class="home-rk-pos">' + c.pos + '</div>'
        + '<div class="home-rk-n">' + homeEsc(homeNombreCorto(c.jugador)) + '<small>' + c.bruto + ' golpes · neto ' + c.neto + '</small></div>'
        + '<div class="home-rk-v">' + c.neto + '</div>'
        + '</div>'
      ).join('');
      const yo = homeYo();
      const mio = yo ? clas.find(c => c.jugador === yo) : null;
      if(mio) html += '<div class="home-tu"><span>Tú vas</span><b>' + mio.pos + 'º · neto ' + mio.neto + '</b></div>';
    }
    if(mes.length){
      html += '<div class="home-mes">Líder del mes: <b>' + homeEsc(homeNombreCorto(mes[0].jugador)) + ' · ' + mes[0].puntos + ' pts</b></div>';
    }
    body.innerHTML = html;
  }

  async function renderHomeLigaSemana(){
    const body = document.getElementById('homeLigaBody');
    if(!body || typeof fetchLigaMes !== 'function') return;
    const now = new Date();
    // sin caché: queremos lo último (otra partida puede haber terminado hace un rato)
    if(typeof ligaRoundsCache !== 'undefined' && ligaRoundsCache) delete ligaRoundsCache[now.getFullYear() + '-' + now.getMonth()];
    const data = await fetchLigaMes(now.getFullYear(), now.getMonth());
    if(data === null){
      body.innerHTML = '<div class="home-liga-vacia">No se ha podido cargar la clasificación. Prueba en un rato.</div>';
      return;
    }
    renderHomeLigaSemanaData(data);
  }

  (function setupPortada(){
    const nb = document.getElementById('homeNormasBtn');
    if(nb) nb.addEventListener('click', ()=>{ if(typeof abrirNormas === 'function') abrirNormas(); });
    renderHomeLigaSemana();
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && typeof current !== 'undefined' && current === 0) renderHomeLigaSemana(); });
  })();
