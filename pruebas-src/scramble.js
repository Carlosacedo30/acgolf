/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Modalidad «Scramble» por parejas (versión de pruebas y acgolf.es) ---
// · Salen los dos, la pareja elige la mejor bola y los dos juegan desde ahí: un solo resultado por pareja.
// · Siempre por puntos (Stableford).
// · La app iguala las parejas por hándicap: junta al de menos hándicap con el de más, el segundo con el penúltimo…
// · Golpes de la pareja (recomendación oficial para scramble de 2): 35 % del hándicap de juego más bajo
//   + 15 % del más alto, desde amarillas.
// Por dentro funciona como el Foursome (una «persona» por pareja), así que se anota con la pantalla de siempre.
(function(){
  if(typeof PR_MODAL === 'undefined' || typeof prepararModalidad !== 'function') return;
  const TXT = 'Scramble';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  // 1) La modalidad existe
  if(!PR_MODAL.some(m => m[0] === TXT)) PR_MODAL.push([TXT, TXT]);
  MODOS.scramble = TXT;
  const modoBase = modoDesdeTexto;
  window.modoDesdeTexto = function(t){
    return String(t || '').toLowerCase().includes('scramble') ? 'scramble' : modoBase(t);
  };
  const esScramble = () => modoDesdeTexto(prModal) === 'scramble';

  // En el formulario completo también (por si alguien entra por «Más opciones»)
  (function(){
    const fila = document.querySelector('.modality-row');
    if(!fila || [...fila.children].some(o => o.textContent.trim() === TXT)) return;
    const op = document.createElement('div');
    op.className = 'modality-opt';
    op.innerHTML = '<div class="radio-dot"><div class="inner"></div></div>' + TXT;
    fila.appendChild(op);
    op.addEventListener('click', ()=>{
      fila.querySelectorAll('.modality-opt').forEach(o => o.classList.toggle('selected', o === op));
      document.querySelectorAll('#scoringTypeRow .pill-opt').forEach(p => p.classList.toggle('selected', p.dataset.scoring === 'stableford'));
      const box = document.getElementById('modalidadAviso');
      if(box){ box.style.display = ''; box.textContent = 'Scramble por parejas, por puntos: salen los dos, eligen la mejor bola y juegan los dos desde ahí. Golpes de la pareja: 35 % del hándicap más bajo + 15 % del más alto.'; }
    });
  })();

  // 2) Golpes de la pareja
  function hcpJuegoDe(h, curso){
    return typeof hcpCampo === 'function' ? hcpCampo(h, curso, BARRA_DEFECTO) : Math.round(Number(h) || 0);
  }
  function golpesPareja(hcps, curso){
    const v = hcps.map(h => hcpJuegoDe(h, curso)).sort((a, b) => a - b);
    if(v.length < 2) return Math.round((v[0] || 0) * 0.35);
    return Math.max(0, Math.round(v[0] * 0.35 + v[v.length - 1] * 0.15));
  }
  // La app trabaja con el hándicap «normal» y le aplica el campo después (hcpCampo).
  // Para que salgan justo los golpes de la pareja, se guarda el hándicap que da ese resultado en este campo.
  function hcpQueDa(golpes, curso){
    const d = (typeof dificultadCampo === 'function') ? dificultadCampo(curso, BARRA_DEFECTO) : null;
    if(!d || !curso || !Array.isArray(curso.par)) return golpes;
    const par = curso.par.reduce((a, b) => a + (Number(b) || 0), 0);
    return Math.round((golpes - (d.rating - par)) * 113 / d.slope * 100) / 100;
  }

  // 3) Al empezar la partida: una tarjeta por pareja, como en el Foursome
  const prepararBase = prepararModalidad;
  window.prepararModalidad = function(modo){
    if(modo !== 'scramble') return prepararBase.apply(this, arguments);
    const curso = typeof selectedCourse !== 'undefined' ? selectedCourse : null;
    matchGroups.forEach(g => {
      if(!g.players || !g.players.length){ delete g.modo; delete g.parejas; return; }
      if(g.modo === 'scramble' && g.parejas) return; // ya preparado
      g.modo = 'scramble';
      const parejas = [];
      for(let i = 0; i < g.players.length; i += 2){
        const nombres = g.players.slice(i, i + 2);
        const hcps = nombres.map((n, k) => Number(g.handicaps[i + k]) || 0);
        parejas.push({ nombres, hcps, golpes: golpesPareja(hcps, curso) });
      }
      g.parejas = parejas;
      g.players = parejas.map(p => p.nombres.join(' / '));
      g.handicaps = parejas.map(p => hcpQueDa(p.golpes, curso));
      g.scores = {};
    });
  };

  // 4) Crear partida rápida
  let variante = 0;      // «Cambiar parejas»: otra combinación igualada
  let firma = '';        // jugadores con los que se hicieron las parejas
  function igualarParejas(){
    const todos = prTodos().slice().sort((a, b) => prHcp(a) - prHcp(b) || String(a).localeCompare(String(b), 'es'));
    const m = Math.floor(todos.length / 2);
    const bajos = todos.slice(0, m), altos = todos.slice(m).reverse(); // altos[0] = el de más hándicap
    const parejas = bajos.map((n, i) => [n, altos[(i + variante) % m]]);
    const grupos = [];
    for(let i = 0; i < parejas.length; i += 2) grupos.push(parejas.slice(i, i + 2).reduce((a, p) => a.concat(p), []));
    prGrupos = grupos.length ? grupos : [[]];
    prNGrupos = prGrupos.length;
    prGrupo = 0;
    prElegidos = prGrupos[0];
  }
  const firmaDe = () => prTodos().slice().sort().join('|');

  const errorBase = prErrorParejas;
  window.prErrorParejas = function(){
    if(!esScramble()) return errorBase.apply(this, arguments);
    const n = prTodos().length;
    if(n < 2) return 'Scramble: hacen falta al menos 2 jugadores.';
    if(n % 2) return 'Scramble por parejas: tiene que ser un número par de jugadores (llevas ' + n + ').';
    return '';
  };
  const cuadroBase = prCuadroParejas;
  window.prCuadroParejas = function(lista){
    if(!esScramble()) return cuadroBase.apply(this, arguments);
    return '<div class="pr-ayuda">Elige a todos los que juegan. En el siguiente paso la app forma las parejas igualadas por hándicap.</div>';
  };

  const pintarBase = prPintar;
  window.prPintar = function(){
    if(esScramble()){
      prPunt = 'stableford';
      if(prPaso === 4 && !prErrorParejas() && (firma !== firmaDe() || prGrupos.some(g => g.length % 2))){
        variante = 0; igualarParejas(); firma = firmaDe();
      }
    } else firma = '';
    pintarBase.apply(this, arguments);
    if(!esScramble()) return;
    const body = document.getElementById('prBody'); if(!body) return;

    if(prPaso === 2){
      // Siempre por puntos: las otras puntuaciones se apagan
      body.querySelectorAll('.pr-tecla[data-k="punt"]').forEach(b => { if(b.dataset.v !== 'stableford') b.disabled = true; });
      const modal = body.querySelector('.pr-tecla[data-k="modal"][data-v="' + TXT + '"]');
      const teclas = modal && modal.closest('.pr-teclas');
      if(teclas && !body.querySelector('.sc-nota')){
        const n = document.createElement('div');
        n.className = 'pr-r-nota sc-nota';
        n.textContent = 'Scramble por parejas, siempre por puntos. Salen los dos, eligen la mejor bola y juegan los dos desde ahí.';
        teclas.after(n);
      }
    }

    if(prPaso === 4){
      const campo = COURSES.find(c => c.id === prCampo);
      const res = body.querySelector('.pr-resumen'); if(!res) return;
      // Las líneas de jugadores de siempre se cambian por las parejas con sus golpes
      res.querySelectorAll('.pr-r-grupo, .pr-r-pareja, .pr-r-jug, .pr-r-barra, .pr-r-linea').forEach(e => e.remove());
      const parejas = [];
      prGrupos.forEach(g => { for(let i = 0; i < g.length; i += 2) parejas.push(g.slice(i, i + 2)); });
      const html = '<div class="sc-titulo">Parejas igualadas por hándicap</div>'
        + parejas.map(p => '<div class="sc-pareja"><div class="sc-nombres">'
          + p.map(n => '<span>' + esc(n) + ' <small>(' + esc(String(hcpJuegoDe(prHcp(n), campo))) + ')</small></span>').join('')
          + '</div><div class="sc-golpes"><b>' + golpesPareja(p.map(prHcp), campo) + '</b><small>golpes</small></div></div>').join('')
        + (parejas.length > 1 ? '<button type="button" class="pr-mas sc-cambiar" id="scCambiar">⇄ Cambiar parejas</button>' : '')
        + '<div class="pr-r-nota">Entre paréntesis, el hándicap de juego de cada uno desde amarillas. Golpes de la pareja: 35 % del más bajo + 15 % del más alto. A igualdad de puntos gana la pareja con menos golpes.</div>';
      const sub = res.querySelector('.pr-r-sub');
      if(sub) sub.insertAdjacentHTML('afterend', html); else res.insertAdjacentHTML('beforeend', html);
      const cb = document.getElementById('scCambiar');
      if(cb) cb.addEventListener('click', ()=>{
        const m = Math.floor(prTodos().length / 2);
        variante = (variante + 1) % Math.max(1, m);
        igualarParejas(); firma = firmaDe();
        prPintar();
      });
    }
  };
})();
