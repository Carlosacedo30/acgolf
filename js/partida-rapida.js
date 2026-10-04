/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Crear partida en 3 toques, para torpes: 1) campo  2) quién juega  3) empezar ---
  // Todo lo demás va solo: Stroke Play (regla de la liga), 18 hoyos, individual, amarillas,
  // fecha y hora de ahora, nombre automático y hándicap de la base de datos.
  // El formulario completo de siempre sigue disponible en "Más opciones".

  const PR_MAX = 4;
  let prPaso = 1;
  let prCampo = null;   // id del campo
  let prElegidos = [];  // nombres
  let prInvitados = []; // nombres escritos a mano

  const prEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function prYo(){ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } }
  function prHcp(n){ const h = Number(FAVORITE_HANDICAPS[n]); return isNaN(h) ? 0 : h; }
  function prNombrePartida(){
    const d = new Date();
    const s = d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' }).replace(/[.,]/g, '');
    return 'Liga ' + s;
  }

  function prAbrir(){
    const ov = document.getElementById('prOverlay'); if(!ov) return;
    prPaso = 1; prCampo = null; prInvitados = [];
    const yo = prYo();
    prElegidos = yo ? [yo] : [];
    if(typeof updateLeagueHandicaps === 'function') updateLeagueHandicaps();
    ov.hidden = false;
    prPintar();
  }
  function prCerrar(){ const ov = document.getElementById('prOverlay'); if(ov) ov.hidden = true; }

  function prPintar(){
    const body = document.getElementById('prBody'); if(!body) return;
    const pasos = '<div class="pr-pasos">' + [1, 2, 3].map(n => '<span class="' + (n === prPaso ? 'on' : n < prPaso ? 'ok' : '') + '">' + n + '</span>').join('') + '</div>';
    let h = pasos;

    if(prPaso === 1){
      h += '<div class="pr-q">¿Dónde jugáis?</div>'
        + '<button type="button" class="pr-campo" data-campo="hato-verde">Hato Verde</button>'
        + '<button type="button" class="pr-campo" data-campo="zaudin">Zaudín</button>'
        + '<button type="button" class="pr-mas" id="prMas">Más opciones (Stableford, 9 hoyos, varios grupos…)</button>';
    }

    if(prPaso === 2){
      const yo = prYo();
      const nombres = FAVORITE_PLAYERS.slice().concat(prInvitados.filter(n => !FAVORITE_PLAYERS.includes(n)))
        .sort((a, b) => (a === yo ? -1 : b === yo ? 1 : a.localeCompare(b, 'es')));
      h += '<div class="pr-q">¿Quién juega?</div>'
        + '<div class="pr-ayuda">Toca los nombres. Máximo ' + PR_MAX + '. Llevas <b>' + prElegidos.length + '</b>.</div>'
        + '<div class="pr-lista">' + nombres.map(n => {
            const on = prElegidos.includes(n);
            return '<button type="button" class="pr-jug' + (on ? ' on' : '') + '" data-n="' + prEsc(n) + '">'
              + '<span class="pr-check">' + (on ? '✓' : '') + '</span><span class="pr-jn">' + prEsc(n) + '</span></button>';
          }).join('') + '</div>'
        + '<button type="button" class="pr-mas" id="prInvitado">＋ Añadir un invitado</button>'
        + '<div class="pr-pie">'
        + '<button type="button" class="pr-atras" id="prAtras">‹ Atrás</button>'
        + '<button type="button" class="pr-sig" id="prSig"' + (prElegidos.length ? '' : ' disabled') + '>Siguiente ›</button>'
        + '</div>';
    }

    if(prPaso === 3){
      const campo = COURSES.find(c => c.id === prCampo);
      h += '<div class="pr-q">¿Todo bien?</div>'
        + '<div class="pr-resumen">'
        + '<div class="pr-r-campo">' + prEsc(campo ? campo.name : '') + '</div>'
        + '<div class="pr-r-sub">Stroke Play · 18 hoyos · hoy</div>'
        + prElegidos.map(n => '<div class="pr-r-jug"><span>' + prEsc(n) + '</span><b>Hcp ' + String(prHcp(n)).replace('.', ',') + '</b></div>').join('')
        + '</div>'
        + '<button type="button" class="pr-empezar" id="prEmpezar">⛳ Empezar partida</button>'
        + '<button type="button" class="pr-atras solo" id="prAtras">‹ Cambiar algo</button>';
    }

    body.innerHTML = h;
    prEnlazar(body);
    const card = body.closest('.pr-card'); if(card) card.scrollTop = 0;
  }

  function prEnlazar(body){
    body.querySelectorAll('.pr-campo').forEach(b => b.addEventListener('click', ()=>{ prCampo = b.dataset.campo; prPaso = 2; prPintar(); }));
    body.querySelectorAll('.pr-jug').forEach(b => b.addEventListener('click', ()=>{
      const n = b.dataset.n;
      if(prElegidos.includes(n)) prElegidos = prElegidos.filter(x => x !== n);
      else if(prElegidos.length >= PR_MAX){ alert('Máximo ' + PR_MAX + ' jugadores por partida.\nSi sois más, que cada grupo cree la suya.'); return; }
      else prElegidos.push(n);
      const lista = body.querySelector('.pr-lista'); const y = lista ? lista.scrollTop : 0;
      const card = body.closest('.pr-card'); const cy = card ? card.scrollTop : 0;
      prPintar();
      const l2 = document.querySelector('#prBody .pr-lista'); if(l2) l2.scrollTop = y;
      if(card) card.scrollTop = cy;
    }));
    const inv = document.getElementById('prInvitado');
    if(inv) inv.addEventListener('click', ()=>{
      const n = (prompt('Nombre y apellido del invitado:') || '').trim().replace(/\s+/g, ' ');
      if(!n) return;
      if(prElegidos.length >= PR_MAX){ alert('Ya hay ' + PR_MAX + ' jugadores. Quita uno primero.'); return; }
      if(!prInvitados.includes(n) && !FAVORITE_PLAYERS.includes(n)) prInvitados.push(n);
      if(!prElegidos.includes(n)) prElegidos.push(n);
      prPintar();
    });
    const at = document.getElementById('prAtras'); if(at) at.addEventListener('click', ()=>{ prPaso -= 1; prPintar(); });
    const sg = document.getElementById('prSig'); if(sg) sg.addEventListener('click', ()=>{ if(prElegidos.length){ prPaso = 3; prPintar(); } });
    const mas = document.getElementById('prMas');
    if(mas) mas.addEventListener('click', ()=>{
      prCerrar();
      const card = document.querySelector('.course-choice[data-course-id="hato-verde"]');
      if(card) card.click(); // abre el formulario completo de siempre
    });
    const em = document.getElementById('prEmpezar'); if(em) em.addEventListener('click', ()=> prEmpezar(em));
  }

  async function prEmpezar(btn){
    if(btn.dataset.busy) return;
    const campo = COURSES.find(c => c.id === prCampo);
    if(!campo || !prElegidos.length) return;
    btn.dataset.busy = '1'; btn.textContent = 'Creando…';

    selectCourse(campo);
    roundName = prNombrePartida();
    scoringType = 'strokeplay';
    const pad = n => String(n).padStart(2, '0'); const d = new Date();
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
    set('roundNameInput', roundName);
    set('roundDateInput', d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    set('roundTimeInput', pad(d.getHours()) + ':' + pad(d.getMinutes()));
    // Deja el formulario completo coherente con lo elegido (por si alguien vuelve a él)
    document.querySelectorAll('#scoringTypeRow .pill-opt').forEach(p => p.classList.toggle('selected', p.dataset.scoring === 'strokeplay'));
    matchGroups.forEach((g, i) => {
      g.players = i === 0 ? prElegidos.slice() : [];
      g.handicaps = i === 0 ? prElegidos.map(prHcp) : [];
      g.scores = {};
    });
    configGroup = 0;
    if(typeof writeConfigFields === 'function') writeConfigFields(0);

    prCerrar();
    delete btn.dataset.busy;
    const pendiente = await findUnfinishedRoundForCourse(campo.id);
    if(pendiente) showDuplicateRoundWarning(pendiente); // "¿sigues con esa o creas una nueva?"
    else startNewRoundNow();
  }

  (function setupPartidaRapida(){
    const b = document.getElementById('prAbrirBtn'); if(b) b.addEventListener('click', prAbrir);
    const c = document.getElementById('prClose'); if(c) c.addEventListener('click', prCerrar);
  })();
