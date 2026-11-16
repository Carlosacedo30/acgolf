/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pantalla Liga (diseño aprobado por Carlos, 15-nov-2026) ---
// Todo sale de DESIGN.md (secciones 1 a 5, 8 y 9) y del dibujo diseno-ref/liga.html.
// Es SOLO un menú con el aspecto nuevo: cada fila pulsa el botón de siempre, no hace nada por su cuenta.
// · Arriba: el nombre de la liga (el que se puso al crearla) y «Jornada X de Y».
// · Los 3 primeros con sus puntos de LIGA (los de la jornada; no los de la general del año). Solo se leen
//   los datos que ya carga «Clasificación liga» (clasif-liga.js); aquí no se calcula ni se guarda nada.
// · Ver la clasificación completa → el botón «Clasificación liga» de siempre.
// · Salón de campeones → está dentro de «Clasificación liga», abajo: se abre esa pantalla y se baja hasta él.
// · Medallas → el botón «Medallas nuevas» de siempre.
// · Ligas (solo administrador) → el botón «Ligas» de siempre; la fila sale solo si ese botón se ve.
// Si un botón de siempre no existe para ese jugador, su fila no sale.
// Se abre con la pestaña «Liga» de la barra de abajo (inicio-nuevo.js), que se sigue viendo aquí.
(function(){
  'use strict';
  const pant = document.querySelector('.screen[data-screen="0"]');
  const nav = document.getElementById('inNav');
  if(!pant || !nav) return;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  // Nombre(s) y primer apellido, como en las demás listas (DESIGN.md §5). Con 2 palabras o menos se deja tal cual.
  const nombreYApellido = n => {
    const w = String(n || '').trim().split(/\s+/).filter(Boolean);
    if(w.length <= 2) return w.join(' ');
    const part = /^(de|del|la|las|los|y|san|santa)$/i;
    let k = w.length - 1;
    while(k - 1 >= 0 && part.test(w[k - 1])) k--;
    if(k < w.length - 1 || part.test(w[k - 1] || '')) k = Math.max(k - 1, 0);
    const quedan = w.slice(0, k);
    return (quedan.length >= 2 ? quedan : w.slice(0, 2)).join(' ');
  };
  const sv = d => '<span class="lg-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#E9CF8C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg></span>';
  const fila = (va, ico, titulo, sub, clase) => '<button type="button" class="lg-row' + (clase || '') + '" data-va="' + va + '">' + (ico ? sv(ico) : '')
    + '<span class="lg-tx"><b>' + titulo + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</span><i class="lg-fl" aria-hidden="true"></i></button>';
  const caja = document.createElement('div');
  caja.className = 'lg'; caja.id = 'lgPant'; caja.hidden = true;
  caja.innerHTML = '<div class="lg-cab"><div><h1 class="lg-titulo" id="lgTitulo">Liga</h1><p class="lg-sub" id="lgSub" hidden></p></div><div class="lg-esc" id="lgEsc"></div></div>'
    + '<div class="lg-card" id="lgTop" hidden></div>'
    + '<div class="lg-card">' + fila('clasif', '', 'Ver la clasificación completa', 'Esta liga · General del año', ' lg-sin') + '</div>'
    + '<div class="lg-sec">Premios</div><div class="lg-card">'
    + fila('salon', '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5.5H5.2v1.2A2.8 2.8 0 0 0 8 9.5M16 5.5h2.8v1.2A2.8 2.8 0 0 1 16 9.5M12 13v4M8.5 20h7M9.5 17h5"/>', 'Salón de campeones')
    + fila('medallas', '<path d="M8.5 3.5l2.6 5M15.5 3.5l-2.6 5M6 3.5h12"/><circle cx="12" cy="14.5" r="5.2"/><path d="M12 12.2v4.6M10.6 13.2l1.4-1"/>', 'Medallas')
    + '</div><div class="lg-adm"><i>Solo administrador</i>'
    + fila('ligas', '<path d="M5 7h9M5 12h9M5 17h6"/><path d="M17.5 14v6M14.5 17h6"/>', 'Ligas', 'Crear y gestionar')
    + '</div><div class="lg-fin"></div>';
  pant.insertBefore(caja, nav);
  document.documentElement.classList.add('lg-hay');
  const $ = id => document.getElementById(id);

  // El botón de siempre que pulsa cada fila
  const DE_SIEMPRE = { clasif: '#hmLiga', salon: '#hmLiga', medallas: '.home-menu-btn[data-foco="medallas"]', ligas: '#hmLigas' };
  function existe(va){
    const b = document.querySelector(DE_SIEMPRE[va]);
    if(!b) return false;
    if(va === 'ligas') return !b.hidden;          // la misma condición del botón «Ligas» (ligas.js lo esconde a quien no es administrador)
    if(va === 'salon') return !!window.acgolfSalon; // el Salón lo pinta salon.js dentro de «Clasificación liga»
    return true;
  }

  // Cabecera y los 3 primeros: la misma liga que abre «Clasificación liga» (la que está en juego; si todas han terminado, la última)
  function pintarLiga(){
    const C = window.acgolfClasifLiga;
    let lista = [];
    try { lista = C ? Object.values(C.datos() || {}) : []; } catch(e){}
    const r = lista.slice().sort((a, b) => (a.terminada - b.terminada) || String(b.ultima).localeCompare(String(a.ultima)))[0];
    const titulo = r ? r.l.nombre : 'Liga';
    const sub = r && r.jugadasJ > 0 ? 'Jornada ' + r.jugadasJ + ' de ' + r.total : '';
    const t = $('lgTitulo'), s = $('lgSub'), top = $('lgTop');
    if(t.textContent !== titulo) t.textContent = titulo;
    if(s.textContent !== sub) s.textContent = sub;
    if(s.hidden !== !sub) s.hidden = !sub;
    let html = '';
    if(r){
      const tres = (r.tabla || []).slice(0, 3);
      html = tres.length ? tres.map((f, i) => '<div class="lg-pod' + (i === 0 ? ' lg-oro' : '') + '"><span class="lg-pos">' + (i + 1) + '.º</span><span class="lg-nom">' + esc(nombreYApellido(f.jugador)) + '</span><span class="lg-pts">' + esc(f.puntos) + '<small>pts</small></span></div>').join('')
        : '<p class="lg-nota">Los puntos empiezan a contar cuando se juegue la primera jornada.</p>';
    }
    if(top.dataset.html !== html){ top.innerHTML = html; top.dataset.html = html; }
    if(top.hidden !== !html) top.hidden = !html;
  }

  // Qué filas salen (solo las que tienen su botón de siempre), el escudo del grupo y la pestaña activa
  function repasar(){
    if(window.acgolfInicio) window.acgolfInicio.marcarPestana();
    if(caja.hidden) return;
    caja.querySelectorAll('[data-va]').forEach(f => { const falta = !existe(f.dataset.va); if(f.hidden !== falta) f.hidden = falta; });
    caja.querySelectorAll('.lg-card:not(#lgTop), .lg-adm').forEach(b => { const vacio = !b.querySelector('.lg-row:not([hidden])'); if(b.hidden !== vacio) b.hidden = vacio; });
    const sec = caja.querySelector('.lg-sec'), sinPremios = sec.nextElementSibling.hidden;
    if(sec.hidden !== sinPremios) sec.hidden = sinPremios;
    pintarLiga();
    // El mismo escudo que el Inicio (inicio-nuevo.js lo copia de la portada del grupo)
    const de = $('inEsc'), a = $('lgEsc');
    if(de && a.dataset.clave !== de.dataset.clave){ a.dataset.clave = de.dataset.clave || ''; a.innerHTML = de.innerHTML; a.classList.toggle('lg-redondo', de.classList.contains('in-redondo')); }
  }
  function abrir(){ if(caja.hidden){ caja.hidden = false; caja.scrollTop = 0; } repasar(); }
  function cerrar(){ if(!caja.hidden) caja.hidden = true; repasar(); }
  window.acgolfLiga = { abrir, cerrar };

  caja.addEventListener('click', ev => {
    const f = ev.target.closest('[data-va]'); if(!f) return;
    const va = f.dataset.va;
    const b = document.querySelector(DE_SIEMPRE[va]);
    if(!b) return;
    b.click();
    if(va !== 'salon') return;
    // El Salón de campeones está al final de «Clasificación liga»: cuando esa pantalla termina de pintarse, se baja hasta él
    let n = 0;
    const t = setInterval(() => {
      const p6 = document.querySelector('.screen[data-screen="6"]'), s = $('salonSection'), c = $('clNuevo');
      if(++n > 40 || !p6 || !p6.classList.contains('active')){ clearInterval(t); return; }
      if(s && s.firstChild && c && c.querySelector('.cl-tabs')){ clearInterval(t); try { s.scrollIntoView({ block: 'start' }); } catch(e){} }
    }, 250);
  });

  // Mientras está abierta se repasa (el botón «Ligas» y los datos de la liga se ponen solos al cargar la app)
  setInterval(() => { if(!caja.hidden) repasar(); }, 1000);
  // Al ir a «Clasificación liga» la hoja se queda: al volver se ve otra vez Liga. Si se va a otra pantalla
  // (una partida, por ejemplo) se cierra, y al volver se ve el Inicio, igual que hace Jugar.
  if(typeof window.goTo === 'function'){
    const irDeSiempre = window.goTo;
    window.goTo = function(n){
      if(n !== 0 && n !== 6) cerrar();
      const r = irDeSiempre.apply(this, arguments);
      if(n === 0 && !caja.hidden) setTimeout(() => { try { repasar(); } catch(e){} }, 300);
      return r;
    };
  }
})();
