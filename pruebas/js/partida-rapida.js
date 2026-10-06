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
  let prHcpInv = {};    // hándicap de cada invitado (lo escribe quien crea la partida)
  let prFormInv = false; // cajita de "Añadir un invitado" abierta
  // Opciones de la partida, elegidas con teclas dentro de la partida rápida
  let prPunt = 'strokeplay';   // 'strokeplay' | 'stableford' | 'matchplay'
  let prHoyos = 18;            // 9 | 18
  let prModal = 'Individual';  // texto de la modalidad
  let prNGrupos = 1;           // 1 a MAX_GROUPS
  let prGrupo = 0;             // grupo que se está rellenando en "¿Quién juega?"
  let prGrupos = [[]];         // nombres por grupo
  const PR_PUNT = [['strokeplay','Stroke Play'],['stableford','Stableford'],['matchplay','Match Play']];
  const PR_MODAL = [['Individual','Individual'],['Parejas (Foursome)','Foursome'],['Mejor bola (Fourball)','Fourball']];
  const prPuntTxt = v => (PR_PUNT.find(p => p[0] === v) || PR_PUNT[0])[1];
  const prModalTxt = v => (PR_MODAL.find(p => p[0] === v) || PR_MODAL[0])[1];
  const prTodos = () => prGrupos.reduce((a, g) => a.concat(g), []);
  const prParejas = () => modoDesdeTexto(prModal) !== 'individual';
  // Cuadro de parejas del grupo (como en la tarjeta): Pareja A = 1º y 2º elegidos, Pareja B = 3º y 4º
  function prCuadroParejas(lista){
    const hueco = '<span class="pr-pj-hueco">Toca un nombre</span>';
    return '<div class="pr-pj">' + [0, 1].map(k =>
      '<div class="pr-pj-fila"><div class="pr-pj-t">Pareja ' + LETRA_PAREJA[k] + '</div><div class="pr-pj-dos">'
      + [0, 1].map(j => { const n = lista[k * 2 + j]; return '<div class="pr-pj-slot' + (n ? ' on' : '') + '">' + (n ? prEsc(n) : hueco) + '</div>'; }).join('')
      + '</div></div>').join('')
      + (lista.length === 4 ? '<button type="button" class="pr-mas" id="prCambiarParejas">⇄ Cambiar parejas</button>' : '')
      + '</div>';
  }
  // ¿Se puede seguir? En parejas: 2 o 4 por grupo (4 si es Match Play)
  function prErrorParejas(){
    if(!prParejas()) return '';
    const llenos = prGrupos.filter(g => g.length);
    if(llenos.some(g => g.length % 2)) return 'Por parejas: cada grupo con 2 o 4 jugadores.';
    if(prPunt === 'matchplay' && llenos.some(g => g.length < 4)) return 'Match Play por parejas: 4 jugadores por grupo.';
    return '';
  }

  const prEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function prYo(){ try { return localStorage.getItem('golfAppConvMe') || ''; } catch(e){ return ''; } }
  const prEsInv = n => !FAVORITE_PLAYERS.includes(n);
  function prHcp(n){
    if(prEsInv(n)){ const hi = Number(prHcpInv[n]); return isNaN(hi) ? 0 : hi; }
    const h = Number(FAVORITE_HANDICAPS[n]); return isNaN(h) ? 0 : h;
  }
  const prHcpTxt = n => String(prHcp(n)).replace('.', ',');
  // Lee un hándicap escrito a mano (acepta coma o punto). Devuelve null si no vale.
  function prLeerHcp(v){
    const t = String(v == null ? '' : v).trim().replace(',', '.');
    if(t === '') return null;
    const h = Number(t);
    if(isNaN(h) || h < -10 || h > 54) return null;
    return Math.round(h * 10) / 10;
  }
  function prNombrePartida(){
    const d = new Date();
    const s = d.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' }).replace(/[.,]/g, '');
    return 'Liga ' + s;
  }

  function prAbrir(){
    const ov = document.getElementById('prOverlay'); if(!ov) return;
    prPaso = 1; prCampo = null; prInvitados = []; prHcpInv = {}; prFormInv = false;
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
        + '<button type="button" class="pr-campo" data-campo="zaudin">Zaudín</button>';
    }

    if(prPaso === 2){
      const fila = (titulo, clave, ops, actual) => '<div class="pr-op-t">' + titulo + '</div><div class="pr-teclas">'
        + ops.map(o => '<button type="button" class="pr-tecla' + (String(o[0]) === String(actual) ? ' on' : '') + '" data-k="' + clave + '" data-v="' + prEsc(o[0]) + '">' + prEsc(o[1]) + '</button>').join('')
        + '</div>';
      h += '<div class="pr-q">¿Cómo jugáis?</div>'
        + fila('Puntuación', 'punt', PR_PUNT, prPunt)
        + fila('Hoyos', 'hoyos', [[9,'9 hoyos'],[18,'18 hoyos']], prHoyos)
        + fila('Modalidad', 'modal', PR_MODAL, prModal)
        + (MAX_GROUPS > GRUPOS_EN_PESTANAS
            ? '<div class="pr-op-t">Grupos</div><div class="pr-npaso"><button type="button" class="pr-tecla pr-nmas" data-d="-1" aria-label="Un grupo menos"' + (prNGrupos > 1 ? '' : ' disabled') + '>−</button>'
              + '<div class="pr-nnum"><b>' + prNGrupos + '</b><small>hasta ' + (prNGrupos * PR_MAX) + ' jugadores</small></div>'
              + '<button type="button" class="pr-tecla pr-nmas" data-d="1" aria-label="Un grupo más"' + (prNGrupos < MAX_GROUPS ? '' : ' disabled') + '>+</button></div>'
            : fila('Grupos', 'grupos', [[1,'1'],[2,'2'],[3,'3'],[4,'4']], prNGrupos))
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
        + (prNGrupos > GRUPOS_EN_PESTANAS
            ? '<div class="pr-gnav"><button type="button" class="pr-tecla pr-gtab" data-g="' + (prGrupo - 1) + '"' + (prGrupo > 0 ? '' : ' disabled') + ' aria-label="Grupo anterior">‹</button>'
              + '<div class="pr-gnav-c"><b>Grupo ' + (prGrupo + 1) + ' <small>de ' + prNGrupos + '</small></b><span>' + prGrupos[prGrupo].length + '/' + PR_MAX + ' · en total ' + prTodos().length + ' jugadores</span></div>'
              + '<button type="button" class="pr-tecla pr-gtab" data-g="' + (prGrupo + 1) + '"' + (prGrupo < prNGrupos - 1 ? '' : ' disabled') + ' aria-label="Grupo siguiente">›</button></div>'
          : prNGrupos > 1 ? '<div class="pr-teclas pr-gtabs">' + prGrupos.map((g, i) =>
            '<button type="button" class="pr-tecla pr-gtab' + (i === prGrupo ? ' on' : '') + '" data-g="' + i + '">Grupo ' + (i + 1) + '<small>' + g.length + '/' + PR_MAX + '</small></button>').join('') + '</div>' : '')
        + '<div class="pr-ayuda">' + (prNGrupos > 1 ? 'Grupo ' + (prGrupo + 1) + ': toca' : 'Toca') + ' los nombres. Máximo ' + PR_MAX + '. Llevas <b>' + prElegidos.length + '</b>.</div>'
        + (prParejas() ? prCuadroParejas(prElegidos) : '')
        + '<div class="pr-lista">' + nombres.map(n => {
            const on = prElegidos.includes(n);
            const og = otroGrupo(n);
            return '<button type="button" class="pr-jug' + (on ? ' on' : '') + (og >= 0 ? ' otro' : '') + '" data-n="' + prEsc(n) + '">'
              + '<span class="pr-check">' + (on ? '✓' : og >= 0 ? 'G' + (og + 1) : '') + '</span><span class="pr-jn">' + prEsc(n) + '</span>'
              + (prEsInv(n) ? '<span class="pr-inv-hcp">Invitado · hcp ' + prHcpTxt(n) + '</span>' : '') + '</button>';
          }).join('') + '</div>'
        + (prFormInv
            ? '<div class="pr-inv-form">'
              + '<div class="pr-op-t">Nuevo invitado</div>'
              + '<label class="pr-inv-l">Nombre y apellido<input type="text" id="prInvNombre" autocomplete="off" placeholder="Ej.: Juan Pérez"></label>'
              + '<label class="pr-inv-l">Hándicap<input type="text" id="prInvHcp" inputmode="decimal" autocomplete="off" placeholder="Ej.: 18,4"></label>'
              + '<div class="pr-ayuda pr-aviso" id="prInvError" hidden></div>'
              + '<div class="pr-inv-bot">'
              + '<button type="button" class="pr-atras" id="prInvCancelar">Cancelar</button>'
              + '<button type="button" class="pr-sig" id="prInvOk">Añadir</button>'
              + '</div></div>'
            : '<button type="button" class="pr-mas" id="prInvitado">＋ Añadir un invitado</button>')
        + '<div class="pr-pie">'
        + '<button type="button" class="pr-atras" id="prAtras">‹ Atrás</button>'
        + '<button type="button" class="pr-sig" id="prSig"' + (prTodos().length && !prErrorParejas() ? '' : ' disabled') + '>Siguiente ›</button>'
        + '</div>'
        + (prTodos().length && prErrorParejas() ? '<div class="pr-ayuda pr-aviso">' + prErrorParejas() + '</div>' : '');
    }

    if(prPaso === 4){
      const campo = COURSES.find(c => c.id === prCampo);
      const llenos = prGrupos.filter(g => g.length);
      h += '<div class="pr-q">¿Todo bien?</div>'
        + '<div class="pr-resumen">'
        + '<div class="pr-r-campo">' + prEsc(campo ? campo.name : '') + '</div>'
        + '<div class="pr-r-sub">' + prPuntTxt(prPunt) + ' · ' + prHoyos + ' hoyos · ' + prModalTxt(prModal) + ' · hoy</div>'
        + (llenos.length > GRUPOS_EN_PESTANAS && !prParejas() && !prTodos().some(prEsInv)
            ? llenos.map((g, i) => '<div class="pr-r-linea"><b>Grupo ' + (i + 1) + '</b> ' + g.map(n => { const w = String(n).trim().split(/\s+/); return prEsc(w.length > 2 ? w.slice(0, -1).join(' ') : w.join(' ')); }).join(', ') + '</div>').join('')
            : llenos.map((g, i) => (llenos.length > 1 ? '<div class="pr-r-grupo">Grupo ' + (i + 1) + '</div>' : '')
            + g.map((n, k) => (prParejas() && k % 2 === 0 ? '<div class="pr-r-pareja">Pareja ' + LETRA_PAREJA[k / 2] + '</div>' : '')
              + (prEsInv(n)
                  ? '<div class="pr-r-jug"><span>' + prEsc(n) + '<small class="pr-r-inv">invitado</small></span>'
                    + '<label class="pr-r-hcp">Hcp <input type="text" inputmode="decimal" class="pr-r-hcp-in" data-n="' + prEsc(n) + '" value="' + prHcpTxt(n) + '"></label></div>'
                  : '<div class="pr-r-jug"><span>' + prEsc(n) + '</span><b>Hcp ' + prHcpTxt(n) + '</b></div>')).join('')).join(''))
        + (prTodos().some(prEsInv) ? '<div class="pr-r-nota">El hándicap del invitado se puede cambiar aquí. Los de la liga salen de la base de datos.</div>' : '')
        + (modoDesdeTexto(prModal) === 'fourball' ? '<div class="pr-r-nota">Cuenta la mejor bola de cada pareja · hándicap al ' + (prPunt === 'matchplay' ? '90' : '85') + ' %</div>' : '')
        + (modoDesdeTexto(prModal) === 'foursome' ? '<div class="pr-r-nota">Una bola por pareja · hándicap de pareja: la mitad de la suma</div>' : '')
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
      else if(prElegidos.length >= PR_MAX){ alert('Máximo ' + PR_MAX + ' jugadores por grupo.' + (prNGrupos < MAX_GROUPS ? '\nSi sois más, vuelve atrás y pon otro grupo.' : '')); return; }
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
      if(prElegidos.length >= PR_MAX){ alert('Ya hay ' + PR_MAX + ' jugadores en este grupo. Quita uno primero.'); return; }
      prFormInv = true; prPintar();
      const f = document.getElementById('prInvNombre'); if(f){ f.focus(); f.scrollIntoView({ block:'center' }); }
    });
    const invNo = document.getElementById('prInvCancelar');
    if(invNo) invNo.addEventListener('click', ()=>{ prFormInv = false; prPintar(); });
    const invOk = document.getElementById('prInvOk');
    if(invOk) invOk.addEventListener('click', ()=>{
      const err = document.getElementById('prInvError');
      const mal = t => { if(err){ err.textContent = t; err.hidden = false; } };
      const n = (document.getElementById('prInvNombre').value || '').trim().replace(/\s+/g, ' ');
      const h = prLeerHcp(document.getElementById('prInvHcp').value);
      if(!n) return mal('Escribe el nombre del invitado.');
      if(FAVORITE_PLAYERS.includes(n)) return mal('Ese nombre ya está en la liga: elígelo en la lista.');
      if(h === null) return mal('Escribe su hándicap (un número entre 0 y 54, por ejemplo 18,4).');
      if(prElegidos.length >= PR_MAX && !prElegidos.includes(n)){ mal('Ya hay ' + PR_MAX + ' jugadores en este grupo. Quita uno primero.'); return; }
      prHcpInv[n] = h;
      if(!prInvitados.includes(n)) prInvitados.push(n);
      if(!prTodos().includes(n)) prElegidos.push(n);
      prFormInv = false;
      prPintar();
    });
    const invH = document.getElementById('prInvHcp');
    if(invH) invH.addEventListener('keydown', e => { if(e.key === 'Enter' && invOk) invOk.click(); });
    body.querySelectorAll('.pr-r-hcp-in').forEach(inp => {
      const guardar = ()=>{
        const h = prLeerHcp(inp.value);
        if(h === null){ inp.classList.add('mal'); return; }
        inp.classList.remove('mal'); prHcpInv[inp.dataset.n] = h;
      };
      inp.addEventListener('input', guardar);
      inp.addEventListener('blur', ()=>{ guardar(); if(!inp.classList.contains('mal')) inp.value = prHcpTxt(inp.dataset.n); });
    });
    const cp = document.getElementById('prCambiarParejas');
    if(cp) cp.addEventListener('click', ()=>{
      // Rota las 3 combinaciones posibles: (1-2)(3-4) → (1-3)(2-4) → (1-4)(2-3) → vuelta a empezar
      const g = prGrupos[prGrupo]; if(g.length !== 4) return;
      const nuevo = [g[0], g[2], g[3], g[1]];
      prGrupos[prGrupo] = prElegidos = nuevo;
      prPintar();
    });
    const at = document.getElementById('prAtras'); if(at) at.addEventListener('click', ()=>{ prPaso -= 1; prPintar(); });
    body.querySelectorAll('.pr-tecla[data-k]').forEach(b => b.addEventListener('click', ()=>{
      const k = b.dataset.k, v = b.dataset.v;
      if(k === 'punt') prPunt = v;
      if(k === 'hoyos') prHoyos = Number(v);
      if(k === 'modal') prModal = v;
      if(k === 'grupos') prCambiarNGrupos(Number(v));
      prPintar();
    }));
    body.querySelectorAll('.pr-nmas').forEach(b => b.addEventListener('click', ()=>{
      prCambiarNGrupos(Math.min(MAX_GROUPS, Math.max(1, prNGrupos + Number(b.dataset.d)))); prPintar();
    }));
    function prCambiarNGrupos(nuevo){
      prNGrupos = nuevo;
      const todos = prGrupos.slice(prNGrupos).reduce((a, g) => a.concat(g), []);
      prGrupos = prGrupos.slice(0, prNGrupos);
      while(prGrupos.length < prNGrupos) prGrupos.push([]);
      todos.forEach(n => { const g = prGrupos.find(x => x.length < PR_MAX); if(g) g.push(n); }); // los de grupos quitados no se pierden
      if(prGrupo >= prNGrupos) prGrupo = 0;
    }
    body.querySelectorAll('.pr-gtab').forEach(b => b.addEventListener('click', ()=>{ prGrupo = Number(b.dataset.g); prPintar(); }));
    const sg = document.getElementById('prSig'); if(sg) sg.addEventListener('click', ()=>{
      if(prPaso === 3 && (!prTodos().length || prErrorParejas())) return;
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
    const malHcp = document.querySelector('#prBody .pr-r-hcp-in.mal');
    if(malHcp){ alert('Revisa el hándicap del invitado: tiene que ser un número entre 0 y 54.'); malHcp.focus(); return; }
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
      delete g.modo; delete g.parejas;
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
