/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // --- Crear partida en pocos toques: 1) campo  2) cómo jugáis (teclas)  3) quién juega  4) empezar ---
  // Por defecto: Stroke Play (regla de la liga), 18 hoyos, individual, 1 grupo. Lo demás va solo:
  // amarillas, fecha y hora de ahora, nombre automático y hándicap de la base de datos.
  // El formulario completo de siempre sigue disponible en "Más opciones".

  const PR_MAX = 4;
  let prPaso = 1;
  let prCampo = null;   // id del campo
  let prElegidos = [];  // nombres
  let prInvitados = []; // nombres escritos a mano
  // Opciones de la partida, elegidas con teclas dentro de la partida rápida
  let prPunt = 'strokeplay';   // 'strokeplay' | 'stableford' | 'matchplay'
  let prHoyos = 18;            // 9 | 18
  let prModal = 'Individual';  // texto de la modalidad
  let prNGrupos = 1;           // 1 a 4
  let prGrupo = 0;             // grupo que se está rellenando en "¿Quién juega?"
  let prGrupos = [[]];         // nombres por grupo
  const PR_PUNT = [['strokeplay','Stroke Play'],['stableford','Stableford'],['matchplay','Match Play']];
  const PR_MODAL = [['Individual','Individual'],['Parejas (Foursome)','Foursome'],['Mejor bola (Fourball)','Fourball']];
  const prPuntTxt = v => (PR_PUNT.find(p => p[0] === v) || PR_PUNT[0])[1];
  const prModalTxt = v => (PR_MODAL.find(p => p[0] === v) || PR_MODAL[0])[1];
  const prTodos = () => prGrupos.reduce((a, g) => a.concat(g), []);

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
    prPunt = 'strokeplay'; prHoyos = 18; prModal = 'Individual'; prNGrupos = 1; prGrupo = 0;
    const yo = prYo();
    prGrupos = [yo ? [yo] : []];
    prElegidos = prGrupos[0];
    if(typeof updateLeagueHandicaps === 'function') updateLeagueHandicaps();
    ov.hidden = false;
    prPintar();
  }
  function prCerrar(){ const ov = document.getElementById('prOverlay'); if(ov) ov.hidden = true; }

  function prPintar(){
    const body = document.getElementById('prBody'); if(!body) return;
    const pasos = '<div class="pr-pasos">' + [1, 2, 3, 4].map(n => '<span class="' + (n === prPaso ? 'on' : n < prPaso ? 'ok' : '') + '">' + n + '</span>').join('') + '</div>';
    let h = pasos;

    if(prPaso === 1){
      h += '<div class="pr-q">¿Dónde jugáis?</div>'
        + '<button type="button" class="pr-campo" data-campo="hato-verde">Hato Verde</button>'
        + '<button type="button" class="pr-campo" data-campo="zaudin">Zaudín</button>'
        + '<button type="button" class="pr-mas" id="prMas">Formulario completo (fecha, hora, barra…)</button>';
    }

    if(prPaso === 2){
      const fila = (titulo, clave, ops, actual) => '<div class="pr-op-t">' + titulo + '</div><div class="pr-teclas">'
        + ops.map(o => '<button type="button" class="pr-tecla' + (String(o[0]) === String(actual) ? ' on' : '') + '" data-k="' + clave + '" data-v="' + prEsc(o[0]) + '">' + prEsc(o[1]) + '</button>').join('')
        + '</div>';
      h += '<div class="pr-q">¿Cómo jugáis?</div>'
        + fila('Puntuación', 'punt', PR_PUNT, prPunt)
        + fila('Hoyos', 'hoyos', [[9,'9 hoyos'],[18,'18 hoyos']], prHoyos)
        + fila('Modalidad', 'modal', PR_MODAL, prModal)
        + fila('Grupos', 'grupos', [[1,'1'],[2,'2'],[3,'3'],[4,'4']], prNGrupos)
        + '<div class="pr-pie">'
        + '<button type="button" class="pr-atras" id="prAtras">‹ Atrás</button>'
        + '<button type="button" class="pr-sig" id="prSig">Siguiente ›</button>'
        + '</div>';
    }

    if(prPaso === 3){
      const yo = prYo();
      const nombres = FAVORITE_PLAYERS.slice().concat(prInvitados.filter(n => !FAVORITE_PLAYERS.includes(n)))
        .sort((a, b) => (a === yo ? -1 : b === yo ? 1 : a.localeCompare(b, 'es')));
      prElegidos = prGrupos[prGrupo];
      const otroGrupo = n => prGrupos.findIndex((g, i) => i !== prGrupo && g.includes(n));
      h += '<div class="pr-q">¿Quién juega?</div>'
        + (prNGrupos > 1 ? '<div class="pr-teclas pr-gtabs">' + prGrupos.map((g, i) =>
            '<button type="button" class="pr-tecla pr-gtab' + (i === prGrupo ? ' on' : '') + '" data-g="' + i + '">Grupo ' + (i + 1) + '<small>' + g.length + '/' + PR_MAX + '</small></button>').join('') + '</div>' : '')
        + '<div class="pr-ayuda">' + (prNGrupos > 1 ? 'Grupo ' + (prGrupo + 1) + ': toca' : 'Toca') + ' los nombres. Máximo ' + PR_MAX + '. Llevas <b>' + prElegidos.length + '</b>.</div>'
        + '<div class="pr-lista">' + nombres.map(n => {
            const on = prElegidos.includes(n);
            const og = otroGrupo(n);
            return '<button type="button" class="pr-jug' + (on ? ' on' : '') + (og >= 0 ? ' otro' : '') + '" data-n="' + prEsc(n) + '">'
              + '<span class="pr-check">' + (on ? '✓' : og >= 0 ? 'G' + (og + 1) : '') + '</span><span class="pr-jn">' + prEsc(n) + '</span></button>';
          }).join('') + '</div>'
        + '<button type="button" class="pr-mas" id="prInvitado">＋ Añadir un invitado</button>'
        + '<div class="pr-pie">'
        + '<button type="button" class="pr-atras" id="prAtras">‹ Atrás</button>'
        + '<button type="button" class="pr-sig" id="prSig"' + (prTodos().length ? '' : ' disabled') + '>Siguiente ›</button>'
        + '</div>';
    }

    if(prPaso === 4){
      const campo = COURSES.find(c => c.id === prCampo);
      const llenos = prGrupos.filter(g => g.length);
      h += '<div class="pr-q">¿Todo bien?</div>'
        + '<div class="pr-resumen">'
        + '<div class="pr-r-campo">' + prEsc(campo ? campo.name : '') + '</div>'
        + '<div class="pr-r-sub">' + prPuntTxt(prPunt) + ' · ' + prHoyos + ' hoyos · ' + prModalTxt(prModal) + ' · hoy</div>'
        + llenos.map((g, i) => (llenos.length > 1 ? '<div class="pr-r-grupo">Grupo ' + (i + 1) + '</div>' : '')
            + g.map(n => '<div class="pr-r-jug"><span>' + prEsc(n) + '</span><b>Hcp ' + String(prHcp(n)).replace('.', ',') + '</b></div>').join('')).join('')
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
      if(prElegidos.includes(n)) prGrupos[prGrupo] = prElegidos = prElegidos.filter(x => x !== n);
      else if(prElegidos.length >= PR_MAX){ alert('Máximo ' + PR_MAX + ' jugadores por grupo.' + (prNGrupos < 4 ? '\nSi sois más, vuelve atrás y elige otro grupo.' : '')); return; }
      else {
        prGrupos = prGrupos.map(g => g.filter(x => x !== n)); // si estaba en otro grupo, se cambia a este
        prGrupos[prGrupo].push(n); prElegidos = prGrupos[prGrupo];
      }
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
      if(prElegidos.length >= PR_MAX){ alert('Ya hay ' + PR_MAX + ' jugadores en este grupo. Quita uno primero.'); return; }
      if(!prInvitados.includes(n) && !FAVORITE_PLAYERS.includes(n)) prInvitados.push(n);
      if(!prTodos().includes(n)) prElegidos.push(n);
      prPintar();
    });
    const at = document.getElementById('prAtras'); if(at) at.addEventListener('click', ()=>{ prPaso -= 1; prPintar(); });
    body.querySelectorAll('.pr-tecla[data-k]').forEach(b => b.addEventListener('click', ()=>{
      const k = b.dataset.k, v = b.dataset.v;
      if(k === 'punt') prPunt = v;
      if(k === 'hoyos') prHoyos = Number(v);
      if(k === 'modal') prModal = v;
      if(k === 'grupos'){
        prNGrupos = Number(v);
        const todos = prGrupos.slice(prNGrupos).reduce((a, g) => a.concat(g), []);
        prGrupos = prGrupos.slice(0, prNGrupos);
        while(prGrupos.length < prNGrupos) prGrupos.push([]);
        todos.forEach(n => { const g = prGrupos.find(x => x.length < PR_MAX); if(g) g.push(n); }); // los de grupos quitados no se pierden
        if(prGrupo >= prNGrupos) prGrupo = 0;
      }
      prPintar();
    }));
    body.querySelectorAll('.pr-gtab').forEach(b => b.addEventListener('click', ()=>{ prGrupo = Number(b.dataset.g); prPintar(); }));
    const sg = document.getElementById('prSig'); if(sg) sg.addEventListener('click', ()=>{
      if(prPaso === 3 && !prTodos().length) return;
      prPaso += 1; prPintar();
    });
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
    const llenos = prGrupos.filter(g => g.length);
    if(!campo || !llenos.length) return;
    btn.dataset.busy = '1'; btn.textContent = 'Creando…';

    selectCourse(campo);
    roundName = prNombrePartida();
    scoringType = prPunt;
    const pad = n => String(n).padStart(2, '0'); const d = new Date();
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.value = v; };
    set('roundNameInput', roundName);
    set('roundDateInput', d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    set('roundTimeInput', pad(d.getHours()) + ':' + pad(d.getMinutes()));
    // Deja el formulario completo coherente con lo elegido (por si alguien vuelve a él)
    document.querySelectorAll('#scoringTypeRow .pill-opt').forEach(p => p.classList.toggle('selected', p.dataset.scoring === prPunt));
    document.querySelectorAll('.modality-opt').forEach(p => p.classList.toggle('selected', p.textContent.trim() === prModal));
    const hoyosRow = document.getElementById('scoringTypeRow') && document.getElementById('scoringTypeRow').closest('section');
    const hoyosPills = hoyosRow && hoyosRow.previousElementSibling ? hoyosRow.previousElementSibling.querySelectorAll('.pill-opt') : [];
    hoyosPills.forEach(p => p.classList.toggle('selected', p.textContent.trim() === prHoyos + ' hoyos'));
    matchGroups.forEach((g, i) => {
      const nombres = llenos[i] || [];
      g.players = nombres.slice();
      g.handicaps = nombres.map(prHcp);
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
