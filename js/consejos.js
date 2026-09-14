  // Pantalla "Consejos de Golf": el manual de referencia del usuario, generado desde CONSEJOS_GOLF
  function renderConsejos(){
    const el = document.getElementById('consejosContent');
    if(!el) return;
    const b = CONSEJOS_GOLF;
    el.innerHTML =
      '<details open><summary>' + b.antesDeJugar.titulo + '</summary>'
      + '<div class="section-sub" style="margin-top:10px;">Orden para calentar: ' + b.antesDeJugar.calentamiento.join(' → ') + '</div>'
      + '<h2 style="margin-top:14px;">En el driving range</h2>'
      + b.antesDeJugar.drivingRange.map(t => '<div class="plan-item"><div class="dot2"></div><div>' + t + '</div></div>').join('')
      + '<h2 style="margin-top:14px;">Estrategia en el campo</h2>'
      + b.antesDeJugar.estrategia.map(t => '<div class="plan-item"><div class="dot2"></div><div>' + t + '</div></div>').join('')
      + '<div class="pattern" style="margin-top:14px;"><p>' + b.antesDeJugar.cierre + '</p></div>'
      + '</details>'

      + '<details><summary>' + b.ejecucion.titulo + '</summary>'
      + '<div class="section-sub" style="margin-top:10px;">Rutina previa al golpe: ' + b.ejecucion.preShotRoutine.join(' · ') + '</div>'
      + '<div style="margin-top:10px;">' + b.ejecucion.golpes.map(g =>
          '<div class="answer-row"><div class="answer-main">' + g.t + '</div><div class="answer-sub">' + g.d + '</div></div>'
        ).join('') + '</div>'
      + '</details>'

      + '<details><summary>' + b.correcciones.titulo + '</summary>'
      + '<div style="margin-top:10px;">' + b.correcciones.lista.map(c =>
          '<div class="answer-row"><div class="answer-main">' + c.t + '</div><div class="answer-sub">' + c.d + '</div></div>'
        ).join('') + '</div>'
      + '</details>'

      + '<details><summary>' + b.mentalidad.titulo + '</summary>'
      + '<div class="pattern" style="margin-top:10px;"><p>' + b.mentalidad.cerrarBuenaRonda + '</p></div>'
      + '<div class="pattern" style="margin-top:10px;"><p>' + b.mentalidad.cuandoNadaSalga + '</p></div>'
      + '<div class="pattern" style="margin-top:10px;"><p>' + b.mentalidad.cuandoSiSalga + '</p></div>'
      + '</details>';
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
