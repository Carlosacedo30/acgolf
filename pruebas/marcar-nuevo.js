/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pantalla de marcar golpes: diseño «Iscariotes sobre fondo blanco» (DESIGN.md §7, aprobado por Carlos el 15-nov-2026) ---
// No cambia lo que hace la pantalla, solo cómo se ve y dónde está cada cosa:
// · Arriba: «‹ Salir», el escudo del grupo y «Hoyo N de 18» (contado desde el hoyo por el que sale el grupo).
// · Título «HOYO 7», «Par 4 · Hcp 9» y la barra de rayitas (jugados, el actual y los que faltan).
// · Abajo: «‹ Hoyo 6» y «SIGUIENTE HOYO ›» (son los mismos botones de siempre, cambiados de sitio).
// · «Finalizar partida» baja al final de la pantalla; en el último hoyo ocupa el sitio de «SIGUIENTE HOYO».
// Lo de dentro del hoyo (tarjeta «Marcas a», teclado y «Tu grupo») lo pinta marcador.js. Los colores están en marcar-nuevo.css.
(function(){
  if(typeof window.renderHoleView !== 'function') return;
  const scr = document.querySelector('.screen[data-screen="3"]');
  const sc = scr && scr.querySelector('.screen-content');
  const bar = sc && sc.querySelector('.app-bar');
  const hv = document.getElementById('holeViewSection');
  const hvP = document.getElementById('hvPlayers');
  const back = document.getElementById('s3Back');
  const prev = document.getElementById('holePrevBtn'), next = document.getElementById('holeNextBtn');
  if(!sc || !bar || !hv || !hvP || !back || !prev || !next) return;
  document.documentElement.classList.add('mn-on');
  const crear = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if(html) e.innerHTML = html; return e; };

  // ---------- Arriba: Salir · escudo · Hoyo N de 18 ----------
  back.textContent = '‹ Salir';
  back.setAttribute('aria-label', 'Salir de la partida');
  const escudo = crear('div', 'mn-esc'); escudo.setAttribute('aria-hidden', 'true');
  const cuenta = crear('div', 'mn-cnt', 'Hoyo<b id="mnCnt"></b>');
  bar.appendChild(escudo); bar.appendChild(cuenta);

  // ---------- Rayitas de los hoyos y botones de abajo ----------
  const prog = crear('div', 'mn-prog'); prog.id = 'mnProg'; prog.setAttribute('aria-hidden', 'true');
  hv.insertBefore(prog, hvP);
  const bot = crear('div', 'mn-bot');
  hvP.after(bot);
  bot.appendChild(prev); bot.appendChild(next);
  [prev, next].forEach(b => { b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
    b.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); b.click(); } }); });

  // ---------- «Finalizar partida»: al final de la pantalla (no tapa los botones de abajo) ----------
  const acciones = scr.querySelector(':scope > .actions');
  const fin = document.getElementById('finalizarRondaBtn');
  if(acciones) sc.appendChild(acciones);

  const salida = () => typeof hoyoSalidaActual === 'function' ? hoyoSalidaActual() : 1;
  const total = () => typeof hoyosPartida === 'function' ? hoyosPartida() : 18;
  const conGolpes = h => Array.prototype.some.call(document.querySelectorAll('.golpes-input[data-hole="' + h + '"]'), x => x.value !== '');

  // Lo que mide la «hoja» de marcar: justo lo que queda de pantalla debajo de la barra de arriba
  function medir(){
    if(!sc.clientHeight) return;
    const y = hv.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    const alto = Math.max(0, Math.round(sc.clientHeight - y));
    if(alto) hv.style.setProperty('--mn-alto', alto + 'px');
  }

  function pintar(){
    const h = currentHole, sal = salida(), n = total();
    // «Hoyo N de 18»: se cuenta desde el hoyo por el que salió el grupo (norma de Carlos)
    const pos = ((h - sal + 18) % 18) + 1;
    const c = document.getElementById('mnCnt');
    const txt = (pos <= n ? pos : h) + ' de ' + n;
    if(c && c.textContent !== txt) c.textContent = txt;
    let rayas = '';
    for(let k = 0; k < n; k++){
      const hk = ((sal - 1 + k) % 18) + 1;
      rayas += '<i class="' + (hk === h ? 'a' : conGolpes(hk) ? 'h' : '') + '"></i>';
    }
    if(prog.innerHTML !== rayas) prog.innerHTML = rayas;

    // Botones de abajo (los de siempre, con su rótulo)
    const ant = typeof hoyoAnterior === 'function' ? hoyoAnterior(h) : h - 1;
    const ultimo = next.classList.contains('disabled');
    const tp = '‹ Hoyo ' + ant, tn = 'SIGUIENTE HOYO ›';
    if(prev.textContent !== tp) prev.textContent = tp;
    if(next.textContent !== tn) next.textContent = tn;
    prev.setAttribute('aria-disabled', prev.classList.contains('disabled') ? 'true' : 'false');
    hv.classList.toggle('mn-ultimo', ultimo);
    // En el último hoyo, «Finalizar partida» ocupa el sitio de «SIGUIENTE HOYO»
    if(fin && acciones){
      if(ultimo && fin.parentNode !== bot) bot.appendChild(fin);
      else if(!ultimo && fin.parentNode !== acciones) acciones.appendChild(fin);
      acciones.classList.toggle('mn-vacia', ultimo);
    }

    // Partidas sin marcadores: el nombre COMPLETO de cada jugador (norma de Carlos), no solo nombre y apellido
    hvP.querySelectorAll('.hv-cell .hv-n[title]').forEach(e => {
      const t = e.getAttribute('title') || '';
      if(t && t.indexOf(' / ') < 0 && e.textContent !== t) e.textContent = t;
    });
    // Con marcadores: la hoja ocupa la pantalla entera y el teclado se queda con todo el sitio que sobra
    hv.classList.toggle('mn-con', !!hvP.querySelector('.mk-cols'));
    // «Me retiro» va al final de la tarjeta, debajo de la leyenda de colores (marcador-retiro.js lo vuelve a crear en cada repintado)
    const finTarjeta = document.getElementById('tbLeyenda') || document.getElementById('tbTira');
    document.querySelectorAll('.screen[data-screen="3"] .mr-bloque').forEach(bl => { if(finTarjeta && finTarjeta.parentNode) finTarjeta.after(bl); else hv.after(bl); });

    // El mismo escudo que el Inicio (inicio-nuevo.js lo copia de la portada del grupo)
    const de = document.getElementById('inEsc');
    const clave = de ? (de.dataset.clave || '') : '';
    if(escudo.dataset.clave !== clave){
      escudo.dataset.clave = clave;
      escudo.innerHTML = de ? de.innerHTML : '';
      escudo.classList.toggle('mn-redondo', !!de && de.classList.contains('in-redondo'));
    }
    medir();
  }

  const orig = window.renderHoleView;
  window.renderHoleView = function(){
    const r = orig.apply(this, arguments);
    try { pintar(); } catch(e){ console.error(e); }
    return r;
  };
  if(typeof window.goTo === 'function'){
    const ir = window.goTo;
    window.goTo = function(){ const r = ir.apply(this, arguments); try { medir(); } catch(e){} return r; };
  }
  window.addEventListener('resize', medir);
  if(typeof ResizeObserver === 'function'){ try { new ResizeObserver(medir).observe(sc); new ResizeObserver(medir).observe(bar); } catch(e){} }
  try { pintar(); } catch(e){}
})();
