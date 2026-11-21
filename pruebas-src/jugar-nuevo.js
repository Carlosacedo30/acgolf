/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pantalla Jugar (diseño aprobado por Carlos, 15-nov-2026) ---
// Todo sale de DESIGN.md (secciones 1 a 5, 8 y 9) y del dibujo diseno-ref/jugar.html.
// Es SOLO un menú con el aspecto nuevo: cada fila pulsa el botón de siempre, no hace nada por su cuenta.
// · «CREAR PARTIDA» → el botón «Crear partida» del Inicio.
// · Organizar partidos → el botón «Organizar partidos» del Inicio.
// · Próximos partidos → el bloque «Lo próximo» del Inicio (ahí están las fechas, las horas y los apuntados).
// · Ganadores de la semana, Cartas, Ryder Cup y Campos de golf → sus botones de siempre.
// Si un botón de siempre no existe para ese jugador, su fila no sale.
// Se abre con la pestaña «Jugar» de la barra de abajo (inicio-nuevo.js), que se sigue viendo aquí.
(function(){
  'use strict';
  const pant = document.querySelector('.screen[data-screen="0"]');
  const cont = pant && pant.querySelector('.screen-content');
  const nav = document.getElementById('inNav');
  if(!pant || !cont || !nav) return;
  const sv = d => '<span class="jg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#E9CF8C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></span>';
  const fila = (va, ico, titulo, sub) => '<button type="button" class="jg-fila" data-va="' + va + '">' + sv(ico)
    + '<span class="jg-tx"><b>' + titulo + '</b><span>' + sub + '</span></span><i class="jg-fl" aria-hidden="true"></i></button>';
  const caja = document.createElement('div');
  caja.className = 'jg'; caja.id = 'jgPant'; caja.hidden = true;
  caja.innerHTML = '<div class="jg-cab"><div><h1 class="jg-titulo">Jugar</h1><p class="jg-sub">Todo lo de una partida</p></div><div class="jg-esc" id="jgEsc"></div></div>'
    + '<button type="button" class="jg-crear" data-va="crear">Crear partida</button>'
    + '<div class="jg-bloque"><div class="jg-sec">Con tu grupo</div>'
    + fila('organizar', '<path d="M4 10v4h3l7 4V6l-7 4H4z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/>', 'Organizar partidos', 'Avisa al grupo y apuntaos')
    + fila('proximos', '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', 'Próximos partidos', 'Fechas, horas y apuntados')
    + fila('ritmo', '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V8.5M12 3.5v2M9.5 3.5h5"/>', 'Ritmo del campo', 'Dónde va cada grupo (administrador)')
    + fila('ganadores', '<path d="M12 4.2l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z"/>', 'Ganadores de la semana', 'Partidas de esta semana')
    + '</div><div class="jg-bloque"><div class="jg-sec">Otras formas de jugar</div>'
    + fila('cartas', '<rect x="6" y="3.5" width="12" height="17" rx="2.2"/><path d="M12 8.2c-1.6 1.7-3 2.8-3 4.3a1.7 1.7 0 0 0 3 1 1.7 1.7 0 0 0 3-1c0-1.5-1.4-2.6-3-4.3zM12 13.5V16"/>', 'Cartas', 'Para reírse en el campo')
    + fila('ryder', '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5.5H5.2v1.2A2.8 2.8 0 0 0 8 9.5M16 5.5h2.8v1.2A2.8 2.8 0 0 1 16 9.5M12 13v4M8.5 20h7M9.5 17h5"/>', 'Ryder Cup', 'Equipos contra equipos')
    + fila('ryins', '<path d="M12 3.8l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/><path d="M6 20h12"/>', 'Apuntarme a la Ryder', 'Elige tu equipo')
    + '</div><div class="jg-bloque"><div class="jg-sec">Antes de salir</div>'
    + fila('campos', '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>', 'Campos de golf', 'Busca tu campo')
    + '</div>';
  pant.insertBefore(caja, nav);
  document.documentElement.classList.add('jg-hay');

  // El botón de siempre que pulsa cada fila
  const DE_SIEMPRE = { crear: '#prAbrirBtn', organizar: '#convHomeNew', ganadores: '.home-menu-btn[data-foco="premios"]', cartas: '#hmCartas', ryder: '#hmRyder', campos: '#hmCampos' };
  const hayProximos = () => !!cont.querySelector('#convHome .ip-card');

  // Qué filas salen (solo las que tienen su botón de siempre), el escudo del grupo y la pestaña activa
  function repasar(){
    const abierta = !caja.hidden;
    if(window.acgolfInicio) window.acgolfInicio.marcarPestana(); // inicio-nuevo.js marca la pestaña de la pantalla que se ve
    if(!abierta) return;
    caja.querySelectorAll('[data-va]').forEach(f => {
      const sel = DE_SIEMPRE[f.dataset.va];
      const falta = f.dataset.va === 'ritmo' ? !(window.miPerfil && window.miPerfil.es_admin) : (!!sel && !document.querySelector(sel));
      if(f.hidden !== falta) f.hidden = falta;
    });
    const sub = caja.querySelector('[data-va="proximos"] .jg-tx span'), txt = hayProximos() ? 'Fechas, horas y apuntados' : 'Ahora no hay ninguno';
    if(sub.textContent !== txt) sub.textContent = txt;
    caja.querySelectorAll('.jg-bloque').forEach(b => { const vacio = !b.querySelector('.jg-fila:not([hidden])'); if(b.hidden !== vacio) b.hidden = vacio; });
    // El mismo escudo que el Inicio (inicio-nuevo.js lo copia de la portada del grupo)
    const de = document.getElementById('inEsc'), a = document.getElementById('jgEsc');
    if(de && a.dataset.clave !== de.dataset.clave){ a.dataset.clave = de.dataset.clave || ''; a.innerHTML = de.innerHTML; a.classList.toggle('jg-redondo', de.classList.contains('in-redondo')); }
  }
  function abrir(){ if(caja.hidden){ caja.hidden = false; caja.scrollTop = 0; } repasar(); }
  function cerrar(){ if(!caja.hidden) caja.hidden = true; repasar(); }
  window.acgolfJugar = { abrir, cerrar };

  caja.addEventListener('click', ev => {
    const f = ev.target.closest('[data-va]'); if(!f) return;
    const va = f.dataset.va;
    if(va === 'proximos'){
      // Los próximos partidos están en el Inicio, en el bloque «Lo próximo»: se va allí
      cerrar();
      const r = cont.querySelector('.in-sec-prox');
      cont.scrollTop = r && !r.hidden ? Math.max(0, cont.scrollTop + r.getBoundingClientRect().top - cont.getBoundingClientRect().top - 48) : 0;
      return;
    }
    if(va === 'ritmo'){ cerrar(); if(window.acgolfRitmo) window.acgolfRitmo.abrir(); return; }
    if(va === 'ryins'){ cerrar(); if(window.acgolfRyderIns) window.acgolfRyderIns.abrir(); return; }
    const b = document.querySelector(DE_SIEMPRE[va]);
    if(b) b.click();
  });

  // Mientras está abierta se repasa (los botones de Cartas, Ryder o Campos se ponen solos al cargar la app)
  setInterval(() => { if(!caja.hidden) repasar(); }, 1000);
  // Al irse a otra pantalla (crear la partida, la clasificación…) Jugar se cierra: al volver se ve el Inicio
  if(typeof window.goTo === 'function'){
    const irDeSiempre = window.goTo;
    window.goTo = function(n){
      if(n !== 0) cerrar();
      return irDeSiempre.apply(this, arguments);
    };
  }
})();
