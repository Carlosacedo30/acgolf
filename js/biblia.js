  // Pantalla "Biblia del Golf": el manual de referencia del usuario, generado desde BIBLIA_GOLF
  function renderBiblia(){
    const el = document.getElementById('bibliaContent');
    if(!el) return;
    const b = BIBLIA_GOLF;
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
      + '<div class="section-sub" style="margin-top:10px;">Pre-shot routine: ' + b.ejecucion.preShotRoutine.join(' · ') + '</div>'
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

  const bibliaLinkBtn = document.getElementById('bibliaLinkBtn');
  if(bibliaLinkBtn) bibliaLinkBtn.addEventListener('click', ()=> goTo(7));
