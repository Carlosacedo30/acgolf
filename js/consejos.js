/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
  // Pantalla "Consejos de golf": consejos propios de acgolf (CONSEJOS_GOLF), ordenada en 5 apartados plegables
  // por el momento en que se usan: antes de salir, en el campo, cada golpe, arreglar el swing y la cabeza.
  function cjLista(arr){ return '<ul class="cj-lista">' + arr.map(t => '<li>' + t + '</li>').join('') + '</ul>'; }
  function cjFichas(arr){ return '<div class="cj-fichas">' + arr.map(g => '<div class="cj-ficha"><div class="cj-ficha-t">' + g.t + '</div><div class="cj-ficha-d">' + g.d + '</div></div>').join('') + '</div>'; }
  function cjPasos(arr){ return '<ol class="cj-pasos">' + arr.map((t, i) => '<li><b>' + (i + 1) + '</b><span>' + t + '</span></li>').join('') + '</ol>'; }
  function cjFrase(t){ const i = t.indexOf(':'); return i > 0 && i < 40 ? { t: t.slice(0, i), d: t.slice(i + 1).trim() } : { t: '', d: t }; }

  function renderConsejos(){
    const el = document.getElementById('consejosContent');
    if(!el) return;
    const b = CONSEJOS_GOLF, e = b.ejecucion;
    const apartados = [
      { ico:'calentar', t:'Antes de jugar', sub:'Calentamiento y campo de prácticas', html:
          '<h3 class="cj-h">Para calentar</h3>' + cjPasos(b.antesDeJugar.calentamiento)
        + '<h3 class="cj-h">En el campo de prácticas</h3>' + cjLista(b.antesDeJugar.drivingRange) },
      { ico:'bandera', t:'En el campo', sub:'Cómo pensar cada hoyo', html:
          cjLista(b.antesDeJugar.estrategia)
        + '<div class="cj-cita">' + b.antesDeJugar.cierre + '</div>' },
      { ico:'palo', t:'Cada golpe', sub:'Rutina, salida, cerca del green y putt', html:
          '<h3 class="cj-h">Antes de cada golpe</h3>' + cjPasos(e.rutina)
        + '<h3 class="cj-h">Salida y calle</h3>' + cjFichas(e.salida)
        + '<h3 class="cj-h">Cerca del green</h3>' + cjFichas(e.cerca)
        + '<h3 class="cj-h">En el green</h3>' + cjFichas(e.green) },
      { ico:'llaveInglesa', t:'Arreglar el swing', sub:'Cuando la bola no va donde quieres', html: cjFichas(b.correcciones.lista) },
      { ico:'brillo', t:'La cabeza', sub:'Cómo llevar la vuelta', html: cjFichas(b.mentalidad) },
    ];

    // Consejo del día (el mismo para todos ese día), arriba del todo
    const ficha = x => x.t + ': ' + x.d;
    const todos = [].concat(b.antesDeJugar.estrategia, e.salida.map(ficha), e.cerca.map(ficha), e.green.map(ficha), b.correcciones.lista.map(ficha), b.mentalidad.map(ficha));
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
      CONSEJOS_GOLF.antesDeJugar.estrategia[0],
      CONSEJOS_GOLF.ejecucion.salida[0].d,
      CONSEJOS_GOLF.correcciones.lista[0].d,
      CONSEJOS_GOLF.mentalidad[0].d,
      CONSEJOS_GOLF.ejecucion.green[1].d,
      CONSEJOS_GOLF.antesDeJugar.estrategia[3],
    ];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    consejosTeaserEl.textContent = teasers[dayOfYear % teasers.length];
  }
