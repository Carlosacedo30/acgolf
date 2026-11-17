/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pantalla Mi cuenta (diseño aprobado por Carlos, 15-nov-2026) ---
// Todo sale de DESIGN.md (secciones 1 a 5, 8 y 9) y del dibujo diseno-ref/cuenta/cuenta.html.
// Es SOLO un menú con el aspecto nuevo: cada fila abre lo de siempre, no hace nada por su cuenta.
// · Panel general (solo super administrador), Mis grupos, Invitar amigos, Miembros, Portada, Contraseña y datos,
//   los interruptores de Avisos, Cerrar sesión y Borrar mi cuenta → las mismas funciones de cuenta.js (window.acgolfCuenta).
// · Mi hándicap, Mis últimas partidas, ¿Cómo jugué?, Reglas de golf y Manual de la app → sus botones de siempre del Inicio.
// · Foto o avatar → avatares.js. · App Hato Verde → el enlace de ir-hato.js. · Escribir a soporte → el correo de ayuda.js.
// · Síguenos y Reseñas en Google → las direcciones de redes.js.
// Si algo de siempre no existe para ese jugador (no es administrador, su grupo no juega en Hato Verde…), su fila no sale.
// Se abre con la pestaña «Mi cuenta» de la barra de abajo (inicio-nuevo.js), que se sigue viendo aquí.
(function(){
  'use strict';
  const pant = document.querySelector('.screen[data-screen="0"]');
  const nav = document.getElementById('inNav');
  if(!pant || !nav) return;
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const svg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="#E9CF8C" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const dentro = (ico, titulo, sub) => '<span class="cn-ic">' + svg(ico) + '</span><span class="cn-tx"><b>' + titulo + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</span><i class="cn-fl" aria-hidden="true"></i>';
  const fila = (va, ico, titulo, sub) => '<button type="button" class="cn-row" data-va="' + va + '">' + dentro(ico, titulo, sub) + '</button>';
  const enlace = (va, ico, titulo, sub) => '<a class="cn-row" data-va="' + va + '" rel="noopener">' + dentro(ico, titulo, sub) + '</a>';
  const tarjeta = f => '<div class="cn-card">' + f + '</div>';
  const mas = t => '<div class="cn-mas" aria-hidden="true"><span>Más abajo: ' + t + '</span><i></i></div>';
  const ESTRELLA = '<path d="M12 4.5l2.3 4.7 5.2.7-3.8 3.6.9 5.1L12 16.2l-4.6 2.4.9-5.1L4.5 9.9l5.2-.7z"/>';
  // Logos de las redes (los del dibujo), por el orden de redes.js
  const LOGOS = {
    ig: '<rect x="4.5" y="4.5" width="15" height="15" rx="4.2"/><circle cx="12" cy="12" r="3.4"/><circle cx="16.3" cy="7.7" r=".7" fill="#E9CF8C" stroke="none"/>',
    tt: '<path d="M13.6 4.5v10.3a3.4 3.4 0 1 1-3.4-3.4"/><path d="M13.6 4.5c.3 2.5 1.9 4 4.4 4.3"/>',
    yt: '<rect x="3.5" y="6.5" width="17" height="11" rx="3.5"/><path d="M10.4 9.7v4.6l4-2.3z"/>',
    fb: '<path d="M15 4.8h-1.7a2.8 2.8 0 0 0-2.8 2.8v11.9"/><path d="M7.8 11.3h6.4"/>',
    li: '<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M8.6 11v5.2M11.9 16.2V11M11.9 13.3a2 2 0 0 1 4 0v2.9"/><circle cx="8.6" cy="8.4" r=".7" fill="#E9CF8C" stroke="none"/>',
  };
  const R = window.acgolfRedes || { REDES: [], RESENAS: [] };
  const QUIEN = ['Nuestra app', 'Nuestro patrocinador'];

  const caja = document.createElement('div');
  caja.className = 'cn'; caja.id = 'cnPant'; caja.hidden = true;
  caja.innerHTML = '<div class="cn-cab"><div><h1 class="cn-titulo">Mi cuenta</h1><p class="cn-sub" id="cnNombre"></p></div><div class="cn-esc" id="cnEsc"></div></div>'
    + '<div class="cn-main" id="cnMain">'
    // ----- Trozo 1: (solo super administrador) Panel general · Mi golf · Mi perfil -----
    + '<div class="cn-parte" id="cnP1">'
    + '<div class="cn-adm cn-super" id="cnSuper" hidden><i>Solo super administrador</i>'
    +   fila('panel', '<path d="M5 7h7M16 7h3M5 12h2M11 12h8M5 17h8M17 17h2"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>', 'Panel general', 'Todo el control de la app') + '</div>'
    + '<div class="cn-sec">Mis grupos</div>'
    + '<div class="cn-card cn-grupo"><button type="button" class="cn-row" data-va="misGrupos"><span class="cn-gesc" id="cnGesc"></span>'
    +   '<span class="cn-tx"><b id="cnGnom"></b><span>Cambiar de grupo o crear uno</span></span><i class="cn-fl" aria-hidden="true"></i></button></div>'
    + '<div class="cn-sec">Mi golf</div>'
    + '<div class="cn-card cn-hcp"><button type="button" class="cn-row" data-va="hcp"><span class="cn-tx"><b>Mi hándicap</b><span>Cómo se calcula</span></span><span class="cn-num" id="cnHcp"></span><i class="cn-fl" aria-hidden="true"></i></button></div>'
    + tarjeta(fila('partidas', '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>', 'Mis últimas partidas', 'Tarjetas y resultados'))
    + tarjeta(fila('como', '<path d="M5 19V5M5 19h14"/><path d="M8.5 15.5l3-4 2.5 2 4-5.5"/>', '¿Cómo jugué?', 'Resumen de mi última partida'))
    + '<div class="cn-sec">Mi perfil</div>'
    + tarjeta(fila('foto', '<circle cx="12" cy="9.2" r="3.4"/><path d="M5 19.5c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/>', 'Foto o avatar', 'Cambiar mi imagen'))
    + tarjeta(fila('datos', '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8M17 12v3M20 12v2.2"/>', 'Contraseña y datos', 'Mi contraseña y mis datos'))
    + mas('Mi grupo y Avisos') + '</div>'
    // ----- Trozo 2: Mi grupo · Avisos -----
    + '<div class="cn-parte" id="cnP2">'
    + '<div class="cn-sec">Mi grupo</div>'
    + tarjeta(fila('invitar', '<circle cx="10" cy="9.5" r="3.2"/><path d="M4 19c.7-3 3-4.6 6-4.6 1.2 0 2.3.3 3.2.7"/><path d="M18 14v6M15 17h6"/>', 'Invitar amigos', 'Enlace y QR del grupo'))
    + '<div class="cn-adm" id="cnAdm" hidden><i>Solo administrador</i>'
    +   fila('miembros', '<path d="M5 7h9M5 12h9M5 17h6"/><path d="M16 16.5l2 2 3.5-4"/>', 'Miembros', 'Quién está en el grupo')
    +   fila('portada', '<rect x="4" y="5.5" width="16" height="13" rx="2"/><path d="M4 15.5l4.5-4 3.5 3 2.5-2 5.5 4.5"/><circle cx="15.5" cy="9.5" r="1.2"/>', 'Portada', 'Escudo, colores y campo')
    +   fila('ayudajug', '<path d="M5 6.5h14v9.5h-7.5L8 19.5V16H5z"/><path d="M8.5 10h7M8.5 12.8h4.5"/>', 'Ayuda con un jugador', 'Hablar con soporte de acgolf') + '</div>'
    + '<div class="cn-sec">Avisos</div>'
    + '<div class="cn-avisos" id="cnAvisos"></div><div class="cn-msg" id="cnMsg" role="status"></div>'
    + mas('Ayuda y Sesión') + '</div>'
    // ----- Trozo 3: Ayuda y club · Síguenos -----
    + '<div class="cn-parte" id="cnP3">'
    + '<div class="cn-sec">Ayuda y club</div>'
    + tarjeta(fila('reglas', '<path d="M12 6.5c-2-1.3-4.5-1.5-7-1v12.5c2.5-.5 5-.3 7 1 2-1.3 4.5-1.5 7-1V5.5c-2.5-.5-5-.3-7 1z"/><path d="M12 6.5V19"/>', 'Reglas de golf'))
    + tarjeta(fila('manual', '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.8a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2 1-1.2 1.9"/><path d="M12 16.6v.1"/>', 'Manual de la app'))
    + tarjeta(enlace('hato', '<path d="M9 19.5V4.5l8 3.2-8 3.2"/><path d="M5 19.5c1.5-1 6.5-1 8 0"/>', 'App Hato Verde'))
    + tarjeta(enlace('soporte', '<path d="M5 6.5h14v9.5h-7.5L8 19.5V16H5z"/><path d="M8.5 10h7M8.5 12.8h4.5"/>', 'Escribir a soporte'))
    + '<div class="cn-sec" id="cnSecRedes">Síguenos</div>'
    + '<div class="cn-redes">' + R.REDES.map(r => '<a class="cn-red" href="' + esc(r.url) + '" target="_blank" rel="noopener"><em>' + svg(LOGOS[r.c] || '') + '</em><span>' + esc(r.n) + '</span></a>').join('') + '</div>'
    + mas('Reseñas y Sesión') + '</div>'
    // ----- Trozo 4: Reseñas en Google · Sesión -----
    + '<div class="cn-parte" id="cnP4">'
    + '<div class="cn-sec">Reseñas en Google</div><p class="cn-apoyo">Un minuto y nos ayudas muchísimo. Gracias</p>'
    + R.RESENAS.map((r, i) => tarjeta('<a class="cn-row" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + dentro(ESTRELLA, esc(String(r.n).replace(/^\W+/, '')), QUIEN[i] || '') + '</a>')).join('')
    + '<div class="cn-sec">Sesión</div>'
    + '<button type="button" class="cn-salir" data-va="salir">Cerrar sesión</button>'
    + '<div class="cn-borrar"><button type="button" data-va="borrar">Borrar mi cuenta</button></div>'
    + '</div></div>';
  pant.insertBefore(caja, nav);
  document.documentElement.classList.add('cn-hay');
  const main = $('cnMain');
  const aviso = (txt, ok) => { const m = $('cnMsg'); m.textContent = txt || ''; m.className = 'cn-msg' + (ok ? ' ok' : ''); };

  // El botón de siempre del Inicio que pulsa cada fila
  const DE_SIEMPRE = { hcp: '#hmHcp', partidas: '.home-menu-btn[data-foco="recientes"]', como: '#hmDiagnostico', reglas: '#hmReglas', manual: '#hmManual' };
  // ¿Sale la fila? Solo si lo de siempre existe para este jugador (las mismas condiciones que la Mi cuenta de siempre)
  function existe(va){
    const p = window.miPerfil, C = window.acgolfCuenta;
    if(DE_SIEMPRE[va]) return !!document.querySelector(DE_SIEMPRE[va]);
    if(va === 'foto') return !!(p && window.acgolfAvatares);
    if(va === 'hato') return !!$('irHatoBtn');             // solo los grupos que juegan en Hato Verde (ir-hato.js)
    if(va === 'soporte') return !!window.acgolfAyuda;
    if(!p || !C) return false;
    if(va === 'panel') return !!p.es_super;
    if(va === 'invitar') return !!(p.es_admin || p.grupo_tipo === 'liga');   // 17-nov: cualquier jugador del grupo puede mandar el enlace y el QR
    if(va === 'miembros' || va === 'portada' || va === 'ayudajug') return !!(p.es_admin && p.grupo_tipo === 'liga');
    return true;
  }

  // Mi hándicap: el mismo número que enseña la pantalla «Mi hándicap» (js/handicap.js). Solo se lee.
  async function pintarHcp(){
    const num = $('cnHcp');
    try {
      if(typeof hcpCargar !== 'function' || !window.miPerfil) return;
      await hcpCargar();
      const yo = hClave(window.miPerfil.player_name);
      const j = hcpDatos.jugadores.find(x => hClave(x.name) === yo);
      num.textContent = j && j.hcp != null ? hNum(j.hcp) : '';
    } catch(e){}
  }

  let pintadoPara = null; // los interruptores de Avisos se pintan una vez por jugador
  function repasar(){
    if(window.acgolfInicio) window.acgolfInicio.marcarPestana();
    if(caja.hidden) return;
    const p = window.miPerfil;
    const nombre = p ? p.player_name : '';
    if($('cnNombre').textContent !== nombre) $('cnNombre').textContent = nombre;
    caja.querySelectorAll('[data-va]').forEach(f => { const falta = !existe(f.dataset.va); const quien = f.closest('.cn-card') || f; if(quien.hidden !== falta) quien.hidden = falta; });
    caja.querySelectorAll('.cn-adm').forEach(b => { const vacio = !b.querySelector('.cn-row:not([hidden])'); if(b.hidden !== vacio) b.hidden = vacio; });
    caja.classList.toggle('cn-con-super', !$('cnSuper').hidden);
    // App Hato Verde y soporte: los mismos enlaces de siempre
    const hato = $('irHatoBtn'), fh = caja.querySelector('[data-va="hato"]');
    if(hato && fh.getAttribute('href') !== hato.getAttribute('href')){ fh.setAttribute('href', hato.getAttribute('href')); if(hato.target) fh.target = hato.target; }
    const fs = caja.querySelector('[data-va="soporte"]');
    if(window.acgolfAyuda){ const h = window.acgolfAyuda.correoSoporte(); if(fs.getAttribute('href') !== h) fs.setAttribute('href', h); }
    // Avisos: los interruptores de siempre (cuenta.js y avisos-movil.js)
    if(p && window.acgolfCuenta && pintadoPara !== p){ pintadoPara = p; window.acgolfCuenta.avisos($('cnAvisos'), aviso); }
    // El mismo escudo que el Inicio (inicio-nuevo.js lo copia de la portada del grupo), también en la tarjeta «Mis grupos»
    const gn = $('inNombre'), ge = $('cnGesc'), gt = $('cnGnom');
    if(gn && gt && gt.textContent !== gn.textContent) gt.textContent = gn.textContent;
    const de = $('inEsc'), a = $('cnEsc');
    if(de && ge && ge.dataset.clave !== de.dataset.clave){ ge.dataset.clave = de.dataset.clave || ''; ge.innerHTML = de.innerHTML; ge.classList.toggle('cn-redondo', de.classList.contains('in-redondo')); }
    if(de && a.dataset.clave !== de.dataset.clave){ a.dataset.clave = de.dataset.clave || ''; a.innerHTML = de.innerHTML; a.classList.toggle('cn-redondo', de.classList.contains('in-redondo')); }
    bordes();
  }
  // Difuminado donde la lista queda cortada (arriba, y abajo si el corte no coincide con el final de un trozo)
  function bordes(){
    const fin = main.scrollTop + main.clientHeight;
    const justo = Array.from(main.children).some(t => Math.abs(t.offsetTop - main.offsetTop + t.offsetHeight - fin) <= 2);
    main.classList.toggle('arriba', main.scrollTop > 1);
    main.classList.toggle('abajo', !justo && fin < main.scrollHeight - 1);
  }
  main.addEventListener('scroll', bordes, { passive: true });

  function abrir(donde){
    if(caja.hidden){ caja.hidden = false; main.scrollTop = 0; aviso(''); pintarHcp(); }
    repasar();
    if(donde === 'redes') main.scrollTop = $('cnP3').offsetTop - main.offsetTop; // aviso «Síguenos en redes» del móvil
  }
  function cerrar(){ if(!caja.hidden) caja.hidden = true; repasar(); }
  window.acgolfCuentaNueva = { abrir, cerrar };

  caja.addEventListener('click', ev => {
    const f = ev.target.closest('[data-va]'); if(!f) return;
    const va = f.dataset.va, C = window.acgolfCuenta;
    if(DE_SIEMPRE[va]){ const b = document.querySelector(DE_SIEMPRE[va]); if(b) b.click(); return; }
    if(va === 'foto'){ window.acgolfAvatares.editar(window.miPerfil); return; }
    if(va === 'hato' || va === 'soporte') return; // son enlaces
    if(!C) return;
    if(va === 'borrar') C.borrar(f, aviso);
    else if(typeof C[va] === 'function') C[va]();
  });

  // Mientras está abierta se repasa (el perfil y los botones de siempre se ponen solos al cargar la app)
  setInterval(() => { if(!caja.hidden) repasar(); }, 1000);
  // Al ir a «¿Cómo jugué?» la hoja se queda: al volver se ve otra vez Mi cuenta. Si se va a otra pantalla
  // (una partida, por ejemplo) se cierra, y al volver se ve el Inicio, igual que hacen Jugar y Liga.
  if(typeof window.goTo === 'function'){
    const irDeSiempre = window.goTo;
    window.goTo = function(n){
      if(n !== 0 && n !== 4) cerrar();
      const r = irDeSiempre.apply(this, arguments);
      if(n === 0 && !caja.hidden) setTimeout(() => { try { repasar(); pintarHcp(); } catch(e){} }, 300);
      return r;
    };
  }
})();
