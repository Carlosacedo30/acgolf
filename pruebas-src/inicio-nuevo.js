/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Inicio nuevo (diseño «fino y elegante» aprobado por Carlos, 15-nov-2026) ---
// Todo sale de DESIGN.md (secciones 1, 2, 3, 4, 5 y 8) y del dibujo diseno-ref/inicio.html.
// SOLO cambia el aspecto del Inicio; cada botón sigue haciendo lo mismo que hacía:
// · Arriba: foto del campo, escudo y nombre del grupo (los mismos que ya ponía la portada del grupo).
// · «Crear partida» (rojo) y «Organizar partidos» (dorado): son los botones de siempre, con otro traje.
// · Bloques «Ahora» (tarjeta sin entregar y partida en marcha), «Lo próximo» (partidos organizados + Apuntarme) y «Tu liga» (nombre y puesto).
// · Barra de 4 pestañas abajo: Inicio · Jugar · Liga · Mi cuenta. «Jugar» abre la pantalla Jugar (jugar-nuevo.js),
//   «Liga» la pantalla Liga (liga-nueva.js) y «Mi cuenta» la pantalla Mi cuenta (cuenta-nueva.js).
// · Los botones del Inicio que ya están en Jugar, Liga o Mi cuenta no se repiten aquí. En el bloque «Más»
//   quedan los que no tienen sitio en esas pantallas (Hoyo 19…).
(function(){
  'use strict';
  const pant = document.querySelector('.screen[data-screen="0"]');
  const cont = pant && pant.querySelector('.screen-content');
  const ahora = document.getElementById('homeAhora');
  if(!pant || !cont || !ahora) return;
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const crear = (etq, clase, html) => { const e = document.createElement(etq); e.className = clase; if(html) e.innerHTML = html; return e; };
  document.documentElement.classList.add('in-on');

  // ---------- Arriba: foto del campo, escudo y nombre del grupo ----------
  const foto = crear('div', 'in-foto'); foto.setAttribute('aria-hidden', 'true');
  const hero = crear('div', 'in-hero', '<div class="in-esc" id="inEsc"></div><h1 class="in-nombre" id="inNombre"></h1>');
  cont.insertBefore(hero, cont.firstChild);
  cont.insertBefore(foto, hero);
  // El escudo y el nombre se copian de la portada del grupo (portada.js los pone y los cambia según el grupo)
  function pintarCabecera(){
    const cab = cont.querySelector('.home-cab'); if(!cab) return;
    const e = cab.querySelector('.pv2-escudo'), t = cab.querySelector('.pv2-titulo');
    const caja = $('inEsc'), nom = $('inNombre');
    const clave = e ? (e.tagName === 'IMG' ? e.getAttribute('src') : e.innerHTML) : '';
    if(caja.dataset.clave !== clave){
      caja.dataset.clave = clave;
      if(!e) caja.innerHTML = '';
      else if(e.tagName === 'IMG') caja.innerHTML = '<img src="' + esc(e.getAttribute('src')) + '" alt="' + esc(e.getAttribute('alt') || '') + '">';
      else { caja.innerHTML = e.innerHTML; caja.setAttribute('role', 'img'); caja.setAttribute('aria-label', e.getAttribute('aria-label') || ''); }
      // El aro dorado fino solo en los escudos redondos
      const svg = caja.querySelector('svg');
      caja.classList.toggle('in-redondo', !svg || (svg.firstElementChild && svg.firstElementChild.tagName.toLowerCase() === 'circle'));
    }
    if(t){
      const copia = t.cloneNode(true);
      copia.querySelectorAll('br').forEach(b => b.replaceWith(' '));
      const nombre = copia.textContent.replace(/\s+/g, ' ').trim();
      if(nom.textContent !== nombre) nom.textContent = nombre;
    }
  }

  // ---------- Rótulos de los bloques ----------
  const rotulo = (texto, clase) => { const r = crear('div', 'in-sec ' + clase); r.textContent = texto; r.hidden = true; ahora.appendChild(r); return r; };
  const secAhora = rotulo('Ahora', 'in-sec-ahora');
  const secProx = rotulo('Lo próximo', 'in-sec-prox');
  const secLiga = rotulo('Tu liga', 'in-sec-liga');
  const secMas = rotulo('Más', 'in-sec-mas');
  secMas.hidden = false;

  // ---------- Ahora: «Te falta entregar tu tarjeta» ----------
  // El cartel de siempre (#tfInicio, lo pone marcador.js) se queda escondido y aquí sale con el aspecto del dibujo.
  // Al tocarlo se pulsa su botón «ENTREGAR AHORA» de siempre (abre esa partida para entregar la tarjeta).
  const tarjetas = crear('div', 'in-tarjetas'); tarjetas.id = 'inTarjetas';
  ahora.insertBefore(tarjetas, $('homeEnMarcha'));
  function pintarTarjetas(){
    const bandas = Array.from(pant.querySelectorAll('#tfInicio .tf-banda'));
    const html = bandas.map((b, i) => {
      const boton = b.querySelector('.tf-btn'), sub = b.querySelector('span');
      const tx = '<span class="in-aviso-tx"><b>' + (boton ? 'Te falta entregar tu tarjeta' : 'Faltan tarjetas por entregar') + '</b><span>' + esc(sub ? sub.textContent : '') + '</span></span>';
      return boton ? '<button type="button" class="in-aviso" data-i="' + i + '"><i class="in-aviso-ic" aria-hidden="true">!</i>' + tx + '<i class="in-fl" aria-hidden="true"></i></button>'
                   : '<div class="in-aviso suave">' + tx + '</div>';
    }).join('');
    if(tarjetas.dataset.html !== html){ tarjetas.innerHTML = html; tarjetas.dataset.html = html; }
  }
  tarjetas.addEventListener('click', ev => {
    const a = ev.target.closest('button.in-aviso'); if(!a) return;
    const banda = pant.querySelectorAll('#tfInicio .tf-banda')[+a.dataset.i];
    const boton = banda && banda.querySelector('.tf-btn');
    if(boton) boton.click();
  });

  // ---------- Tu liga: nombre de la liga y tu puesto (toca y abre la clasificación de siempre) ----------
  const liga = crear('button', 'in-liga');
  liga.type = 'button'; liga.id = 'inLiga'; liga.hidden = true;
  liga.onclick = () => { const b = $('hmLiga'); if(b) b.click(); };
  ahora.appendChild(liga);
  function pintarLiga(){
    const C = window.acgolfClasifLiga;
    let lista = [];
    try { lista = C ? Object.values(C.datos() || {}) : []; } catch(e){}
    if(!lista.length){ liga.hidden = true; secLiga.hidden = true; return; }
    // La misma liga que abre «Clasificación liga»: la que está en juego; si todas han terminado, la última
    const r = lista.slice().sort((a, b) => (a.terminada - b.terminada) || String(b.ultima).localeCompare(String(a.ultima)))[0];
    const yo = norm(window.miPerfil && window.miPerfil.player_name);
    const tabla = r.tabla || [];
    const i = yo ? tabla.findIndex(f => norm(f.jugador) === yo) : -1;
    let sub;
    if(i < 0) sub = 'Jornada ' + r.jugadasJ + ' de ' + r.total;
    else if(i === 0) sub = 'Vas líder';
    else { const d = tabla[0].puntos - tabla[i].puntos; sub = d === 0 ? 'Empatado con el líder' : 'A ' + d + (d === 1 ? ' punto' : ' puntos') + ' del líder'; }
    const html = '<span class="in-liga-tx"><b>' + esc(r.l.nombre) + '</b><span>' + esc(sub) + '</span></span>'
      + (i >= 0 ? '<span class="in-liga-pos">' + (i + 1) + '.º</span>' : '') + '<i class="in-fl" aria-hidden="true"></i>';
    if(liga.dataset.html !== html){ liga.innerHTML = html; liga.dataset.html = html; }
    liga.hidden = false; secLiga.hidden = false;
  }
  // Se lee una vez, cuando la cuenta ya está cargada (solo lectura; son los mismos datos de «Clasificación liga»)
  (function esperarCuenta(n){
    if(window.miPerfil){
      const C = window.acgolfClasifLiga;
      if(C && !document.documentElement.classList.contains('es-invitado')) Promise.resolve().then(() => C.cargarTodo()).then(pintarLiga, () => {});
      return;
    }
    if(n < 120) setTimeout(() => esperarCuenta(n + 1), 500);
  })(0);

  // ---------- Lo próximo: la fecha y la hora en grande; el campo y los apuntados debajo (mismos datos) ----------
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  function afinarProximos(box){
    if(window.acgolfIdioma && window.acgolfIdioma !== 'es') return; // en otros idiomas se dejan los textos de siempre
    box.querySelectorAll('.ip-card').forEach(card => {
      const info = card.querySelector('.ip-info[data-conv-code]');
      const c = info && convActivas.find(x => x.code === info.dataset.convCode);
      const cuando = card.querySelector('.ip-cuando'), pie = card.querySelector('.ip-pie');
      if(!c || !cuando || !pie) return;
      const me = convMe(), mi = me ? convSlotOf(c, me) : -1;
      if(c.date === convIsoToday() && mi >= 0) return; // «Hoy juegas»: se queda como está (hora de salida y con quién)
      const d = new Date(c.date + 'T12:00:00');
      const alTiro = convAlTiro(c);
      const horas = alTiro ? convTime(c.times[0]) : c.times.map((t, k) => convEtq(c, k)).join(' y ');
      const total = c.groups.reduce((a, g) => a + g.length, 0);
      const campo = convCourse(c.courseId).name.replace(/^Club\s+/i, '');
      // Varias salidas: el día arriba y cada salida en su línea (no se parte el título)
      if(!alTiro && c.times.length > 1){
        cuando.innerHTML = esc(DIAS[d.getDay()] + ' ' + d.getDate()) + '<span class="in-salidas">' + c.times.map((t, k) => '<span>' + esc(convEtq(c, k)) + '</span>').join('') + '</span>';
      } else cuando.textContent = DIAS[d.getDay()] + ' ' + d.getDate() + ' · ' + horas;
      pie.innerHTML = '<i>' + esc(campo) + '</i> · ' + total + (total === 1 ? ' apuntado' : ' apuntados') + (alTiro ? ' · al tiro' : '');
    });
  }
  if(typeof window.renderConvHomeCards === 'function'){
    const pintarDeSiempre = window.renderConvHomeCards;
    window.renderConvHomeCards = function(box){
      const r = pintarDeSiempre.apply(this, arguments);
      try { afinarProximos(box); } catch(e){}
      return r;
    };
    try { renderConvHome(); } catch(e){}
  }

  // ---------- Barra de abajo: 4 pestañas ----------
  const nav = crear('nav', 'in-nav',
      '<button type="button" class="in-tab on" data-tab="inicio" aria-current="page">Inicio<i class="in-punto" id="inPunto" hidden></i></button>'
    + '<button type="button" class="in-tab" data-tab="jugar">Jugar</button>'
    + '<button type="button" class="in-tab" data-tab="liga">Liga</button>'
    + '<button type="button" class="in-tab" data-tab="cuenta">Mi cuenta</button>');
  nav.id = 'inNav'; nav.setAttribute('aria-label', 'Pestañas');
  pant.appendChild(nav);
  const pulsa = sel => { const b = document.querySelector(sel); if(b) b.click(); };
  nav.addEventListener('click', ev => {
    const b = ev.target.closest('.in-tab'); if(!b) return;
    const t = b.dataset.tab;
    const J = window.acgolfJugar; // la pantalla Jugar (jugar-nuevo.js)
    const L = window.acgolfLiga;  // la pantalla Liga (liga-nueva.js)
    const C = window.acgolfCuentaNueva; // la pantalla Mi cuenta (cuenta-nueva.js)
    if(t !== 'cuenta' && C) C.cerrar();
    if(t === 'inicio'){ if(J) J.cerrar(); if(L) L.cerrar(); try { cont.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){ cont.scrollTop = 0; } }
    else if(t === 'jugar'){ if(L) L.cerrar(); if(J) J.abrir(); else pulsa('#prAbrirBtn'); }
    else if(t === 'liga'){ if(J) J.cerrar(); if(L) L.abrir(); else pulsa('#hmLiga'); }   // sin la pantalla Liga: «Clasificación liga»
    else if(t === 'cuenta'){ if(C && window.miPerfil){ if(J) J.cerrar(); if(L) L.cerrar(); C.abrir(); } else pulsa('.cg-mi'); } // sin la pantalla Mi cuenta: «Ir a mi cuenta»
  });
  // La pestaña marcada es la de la pantalla que se está viendo (Jugar y Liga son hojas encima del Inicio)
  function marcarPestana(){
    const ve = id => { const e = $(id); return !!e && !e.hidden; };
    const cual = ve('cnPant') ? 'cuenta' : ve('lgPant') ? 'liga' : ve('jgPant') ? 'jugar' : 'inicio';
    nav.querySelectorAll('.in-tab').forEach(b => {
      const on = b.dataset.tab === cual;
      if(b.classList.contains('on') !== on){ b.classList.toggle('on', on); if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
  }
  window.acgolfInicio = { marcarPestana };

  // ---------- Repaso: qué bloques se ven y el puntito rojo ----------
  function repasar(){
    pintarCabecera();
    pintarTarjetas();
    const marcha = $('homeEnMarcha'), extras = $('vvExtras');
    const hayAhora = !!(tarjetas.children.length || (marcha && marcha.children.length) || (extras && extras.children.length) || $('amBannerHome'));
    if(secAhora.hidden === hayAhora) secAhora.hidden = !hayAhora;
    const hayProx = !!ahora.querySelector('#convHome .ip-card');
    if(secProx.hidden === hayProx) secProx.hidden = !hayProx;
    // «Más»: solo si queda algún botón a la vista (los demás están ya en Jugar, Liga o Mi cuenta)
    if(pant.classList.contains('active') && !pant.dataset.foco){
      const hayMas = Array.from(ahora.querySelectorAll('.home-menu > *, #irHatoBtn')).some(b => b.offsetParent !== null);
      if(secMas.hidden === hayMas) secMas.hidden = !hayMas;
    }
    // Puntito rojo en «Inicio»: te falta entregar tu tarjeta o hay una partida tuya en marcha (algo que hacer)
    const pendiente = !!(tarjetas.querySelector('button.in-aviso') || $('homeContinuarBtn') || ahora.querySelector('#vvExtras .home-big-btn:not(.vv-btn)'));
    const punto = $('inPunto');
    if(punto.hidden === pendiente) punto.hidden = !pendiente;
  }
  let enCola = false;
  const avisar = () => { if(enCola) return; enCola = true; setTimeout(() => { enCola = false; try { repasar(); } catch(e){} }, 60); };
  new MutationObserver(avisar).observe(pant, { childList: true, subtree: true }); // el Inicio entero (el cartel de la tarjeta va fuera del bloque)
  const cab = cont.querySelector('.home-cab');
  if(cab) new MutationObserver(avisar).observe(cab, { childList: true, subtree: true, characterData: true });
  repasar();
  // Al volver al Inicio se repasa (la liga puede haber cambiado en «Clasificación liga»)
  if(typeof window.goTo === 'function'){
    const irDeSiempre = window.goTo;
    window.goTo = function(n){
      const r = irDeSiempre.apply(this, arguments);
      if(n === 0) setTimeout(() => { try { repasar(); pintarLiga(); } catch(e){} }, 300);
      return r;
    };
  }
})();
