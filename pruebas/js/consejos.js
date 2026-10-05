/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // Pantalla "Consejos de golf": la chuleta del usuario (CONSEJOS_GOLF), ordenada en 5 apartados plegables
  // por el momento en que se usan: antes de salir, en el campo, cada golpe, arreglar el swing y la cabeza.
  function cjLista(arr){ return '<ul class="cj-lista">' + arr.map(t => '<li>' + t + '</li>').join('') + '</ul>'; }
  function cjFichas(arr){ return '<div class="cj-fichas">' + arr.map(g => '<div class="cj-ficha"><div class="cj-ficha-t">' + g.t + '</div><div class="cj-ficha-d">' + g.d + '</div></div>').join('') + '</div>'; }
  function cjPasos(arr){ return '<ol class="cj-pasos">' + arr.map((t, i) => '<li><b>' + (i + 1) + '</b><span>' + t + '</span></li>').join('') + '</ol>'; }
  function cjFrase(t){ const i = t.indexOf(':'); return i > 0 && i < 40 ? { t: t.slice(0, i), d: t.slice(i + 1).trim() } : { t: '', d: t }; }

  function renderConsejos(){
    const el = document.getElementById('consejosContent');
    if(!el) return;
    const b = CONSEJOS_GOLF;
    const g = b.ejecucion.golpes;
    const porNombre = n => g.find(x => x.t === n);
    const grupo = nombres => nombres.map(porNombre).filter(Boolean);
    const usados = new Set();
    const salida = grupo(['Driver', 'Entre palos', 'Lie de subida', 'Lie de bajada']);
    const cerca = grupo(['Desde 100 yardas o menos', 'Para salir del rough', 'Recovery shot', 'Alrededor del green', 'Bunker']);
    const green = grupo(['Leer caídas', 'Putt largo', 'Putt de compromiso']);
    [salida, cerca, green].forEach(l => l.forEach(x => usados.add(x.t)));
    const otros = g.filter(x => !usados.has(x.t)); // por si se añaden golpes nuevos a la chuleta
    const mente = [b.mentalidad.cerrarBuenaRonda, b.mentalidad.cuandoNadaSalga, b.mentalidad.cuandoSiSalga].map(cjFrase);

    const apartados = [
      { ico:'calentar', t:'Antes de jugar', sub:'Calentamiento y driving range', html:
          '<h3 class="cj-h">Orden para calentar</h3>' + cjPasos(b.antesDeJugar.calentamiento)
        + '<h3 class="cj-h">En el driving range</h3>' + cjLista(b.antesDeJugar.drivingRange) },
      { ico:'bandera', t:'En el campo', sub:'Estrategia hoyo a hoyo', html:
          cjLista(b.antesDeJugar.estrategia)
        + '<div class="cj-cita">' + b.antesDeJugar.cierre + '</div>' },
      { ico:'palo', t:'Cada golpe', sub:'Rutina, salida, cerca del green y putt', html:
          '<h3 class="cj-h">Rutina antes de cada golpe</h3>' + cjPasos(b.ejecucion.preShotRoutine)
        + '<h3 class="cj-h">Salida y calle</h3>' + cjFichas(salida)
        + '<h3 class="cj-h">Cerca del green</h3>' + cjFichas(cerca)
        + '<h3 class="cj-h">En el green</h3>' + cjFichas(green)
        + (otros.length ? '<h3 class="cj-h">Otros golpes</h3>' + cjFichas(otros) : '') },
      { ico:'llaveInglesa', t:'Arreglar el swing', sub:'Slice, hook y shank', html: cjFichas(b.correcciones.lista) },
      { ico:'brillo', t:'La cabeza', sub:'Cómo llevar la ronda', html: cjFichas(mente) },
    ];

    // Consejo del día (el mismo para todos ese día), arriba del todo
    const todos = [].concat(b.antesDeJugar.drivingRange, b.antesDeJugar.estrategia, g.map(x => x.t + ': ' + x.d), b.correcciones.lista.map(x => x.t + ': ' + x.d));
    const dia = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);

    el.innerHTML = '<section class="cj-dia"><div class="cj-dia-k">' + icono('diana') + ' Consejo del día</div><div class="cj-dia-t">' + todos[dia % todos.length] + '</div></section>'
      + '<section class="cj-indice">' + apartados.map((a, i) =>
          '<details class="cj-ap" name="consejos">'
          + '<summary><span class="cj-num">' + (i + 1) + '</span>' + icono(a.ico) + '<span class="cj-st"><b>' + a.t + '</b><small>' + a.sub + '</small></span><span class="cj-mas" aria-hidden="true"></span></summary>'
          + '<div class="cj-body">' + a.html + '</div></details>').join('')
      + '</section>';
    // Solo uno abierto a la vez (y se lleva a la vista al abrirlo)
    el.querySelectorAll('details.cj-ap').forEach(d => d.addEventListener('toggle', ()=>{
      if(!d.open) return;
      el.querySelectorAll('details.cj-ap').forEach(o => { if(o !== d) o.open = false; });
      setTimeout(()=>{ try { d.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(e){} }, 60);
    }));
  }

  const s7VolverBtn = document.getElementById('s7VolverBtn');
  if(s7VolverBtn) s7VolverBtn.addEventListener('click', ()=> goTo(0));

  const consejosLinkBtn = document.getElementById('consejosLinkBtn');
  if(consejosLinkBtn) consejosLinkBtn.addEventListener('click', ()=> goTo(5));

  // Tarjeta de Inicio: un consejo distinto cada día, sacado de las mismas secciones
  const consejosTeaserEl = document.getElementById('consejosTeaser');
  if(consejosTeaserEl){
    const teasers = [
      CONSEJOS_GOLF.antesDeJugar.drivingRange[2],
      CONSEJOS_GOLF.ejecucion.golpes[0].d,
      CONSEJOS_GOLF.correcciones.lista[0].d,
      CONSEJOS_GOLF.mentalidad.cerrarBuenaRonda,
      CONSEJOS_GOLF.ejecucion.golpes[9].d,
      CONSEJOS_GOLF.antesDeJugar.estrategia[1],
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    consejosTeaserEl.textContent = teasers[dayOfYear % teasers.length];
  }
