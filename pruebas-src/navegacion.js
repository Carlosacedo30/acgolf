/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Navegación unificada ---
// Todas las secciones (Liga, Mi hándicap, Reglas, Sevilla–Betis, Consejos, Ryder Cup) se dejan igual:
// un solo botón «‹ Volver al inicio», arriba y siempre visible al bajar. Fuera las ✕, el «‹ Inicio» pequeño
// y los botones repetidos de abajo. El nombre y el grupo de arriba solo se ven en el Inicio.
// La clasificación de la liga pasa los meses con el mismo pasador en todas partes: «Este mes», «El mes pasado»…
(function(){
  const $ = id => document.getElementById(id);

  // El Sevilla–Betis tenía su «Volver al inicio» solo abajo: se sube arriba, bajo la cabecera
  function subirDerbi(){
    const v = $('derbiVolver'), cab = document.querySelector('#derbiOverlay .derbi-cab');
    if(v && cab && v.previousElementSibling !== cab) cab.parentNode.insertBefore(v, cab.nextSibling);
  }

  // ¿Estamos en el Inicio? (sin ninguna sección ni ventana grande abierta)
  const SECCIONES = ['#hcpOverlay', '#reglasOverlay', '#derbiOverlay', '#ryOverlay', '#convOverlay', '#prOverlay', '#greensMapaOverlay', '#medallasOverlay'];
  function enInicio(){
    const act = document.querySelector('.screen.active');
    if(act && act.dataset.screen !== '0') return false;
    if(act && act.dataset.foco) return false; // Ganadores, Medallas o Últimas partidas abiertos desde el Inicio
    return !SECCIONES.some(s => { const o = document.querySelector(s); return o && !o.hidden && o.style.display !== 'none'; });
  }

  // Pasador de meses de la liga: nombres claros y «Volver a este mes»
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const FLECHA_I = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"></path></svg>';
  const FLECHA_D = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>';
  function pasadorLiga(){
    const lab = $('ligaMonthLabel'), sub = $('ligaMonthSub'), caja = document.querySelector('.liga-month');
    if(!lab || !caja || typeof ligaMonth === 'undefined') return;
    const pa = $('ligaPrevMonth'), si = $('ligaNextMonth');
    if(pa && !pa.querySelector('svg')) pa.innerHTML = FLECHA_I;
    if(si && !si.querySelector('svg')) si.innerHTML = FLECHA_D;
    const hoy = new Date(), dif = (hoy.getFullYear() * 12 + hoy.getMonth()) - (ligaMonth.y * 12 + ligaMonth.m);
    const nombre = MESES[ligaMonth.m].charAt(0).toUpperCase() + MESES[ligaMonth.m].slice(1) + ' ' + ligaMonth.y;
    const titulo = dif <= 0 ? 'Este mes' : dif === 1 ? 'El mes pasado' : nombre;
    const pie = dif <= 1 ? nombre : 'Mes cerrado';
    if(lab.textContent !== titulo) lab.textContent = titulo;
    if(sub && sub.textContent !== pie) sub.textContent = pie;
    let hoyBtn = $('ligaHoyBtn');
    if(!hoyBtn){
      hoyBtn = document.createElement('button');
      hoyBtn.type = 'button'; hoyBtn.id = 'ligaHoyBtn'; hoyBtn.className = 'nv-hoy';
      hoyBtn.textContent = 'Volver a este mes';
      hoyBtn.onclick = () => { const n = $('ligaNextMonth'); for(let i = 0; i < 36 && n && !n.disabled; i++) n.click(); };
      caja.parentNode.insertBefore(hoyBtn, caja.nextSibling);
    }
    hoyBtn.hidden = dif <= 0;
  }

  // Clasificación: título como en la propuesta
  function tituloLiga(){
    const h = document.querySelector('.screen[data-screen="6"] .app-bar h1');
    if(h && h.textContent !== 'Clasificación de la liga') h.textContent = 'Clasificación de la liga';
  }
  // Ventanas que se abren encima: su ✕ o «Cerrar» pasa a ser el mismo botón «‹ Volver» de toda la app, arriba
  const CIERRES = '.conv-close, .av-x, #normasCerrar, #leaguePlayersClose';
  function unificarVentanas(){
    document.querySelectorAll('.modal-overlay:not([hidden]), .av-ov').forEach(ov => {
      if(ov.querySelector('.pantalla-volver') || ov.querySelector('.nv-volver')) return; // ya tiene su botón
      const cierre = ov.querySelector(CIERRES);
      const caja = ov.querySelector('.modal-card, .av-caja');
      if(!cierre || !caja) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'nv-volver';
      b.textContent = '‹ Volver';
      b.onclick = () => cierre.click();
      caja.insertBefore(b, caja.firstChild);
      ov.classList.add('nv-con-volver');
    });
  }
  // Mi cuenta: el mismo botón arriba («‹ Volver a la app»)
  function unificarCuenta(){
    const gate = document.getElementById('cuentaGate');
    if(!gate || gate.hidden) return;
    const cerrar = gate.querySelector('#cgCerrar'), card = gate.querySelector('.cg-card');
    if(!cerrar || !card || card.querySelector('.nv-volver')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nv-volver';
    b.textContent = '‹ Volver a la app';
    b.onclick = () => cerrar.click();
    card.insertBefore(b, card.firstChild);
    cerrar.style.display = 'none';
  }
  function repasar(){
    unificarVentanas();
    unificarCuenta();
    subirDerbi();
    tituloLiga();
    document.body.classList.toggle('nv-dentro', !enInicio());
    pasadorLiga();
  }
  setInterval(repasar, 400);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', repasar); else repasar();
})();
