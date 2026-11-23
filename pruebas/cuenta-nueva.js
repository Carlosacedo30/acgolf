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
  const SOPORTE = '<path d="M5 6.5h14v9.5h-7.5L8 19.5V16H5z"/><path d="M8.5 10h7M8.5 12.8h4.5"/>';
  const rapida = (va, ico, titulo, sub) => '<button type="button" class="cn-rap" data-va="' + va + '"><span class="cn-ic">' + svg(ico) + '</span><b>' + titulo + '</b><span>' + sub + '</span></button>';
  caja.innerHTML = '<div class="cn-cab"><div><h1 class="cn-titulo">Mi cuenta</h1><p class="cn-sub" id="cnNombre"></p></div>'
    + '<button type="button" class="cn-foto" id="cnFoto" data-va="foto" aria-label="Cambiar mi foto o avatar"><b id="cnIni"></b><i><svg viewBox="0 0 24 24" fill="none" stroke="#16120A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></i></button></div>'
    + '<div class="cn-tabs" id="cnTabs" hidden><button type="button" class="cn-tab on" data-tab="cuenta">Mi cuenta</button><button type="button" class="cn-tab" data-tab="sup">Superadministrador</button></div>'
    + '<div class="cn-main" id="cnMain"><div class="cn-sup" id="cnSup" hidden>'
    + '<div class="cn-sec" style="margin-top:18px">En el campo</div>'
    + tarjeta(fila('sup:seg', '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/>', 'Seguimiento', 'Dónde está cada grupo en el campo (ritmo de partido)'))
    + '<div class="cn-sec">Jugadores</div>'
    + '<div class="cn-card"><button type="button" class="cn-row" id="pnSop" data-va="sup:sop"><span class="cn-ic">' + svg(SOPORTE) + '</span><span class="cn-tx"><b>Mensajes de soporte</b><span>Lo que te escriben los jugadores</span></span><i class="cn-fl" aria-hidden="true"></i></button></div>'
    + tarjeta(fila('sup:pro', '<path d="M5 10v4h3l6 4V6l-6 4H5z"/><path d="M17 9.5a3.5 3.5 0 0 1 0 5"/>', 'Promociones', 'Correos a los jugadores y avisos en redes'))
    + tarjeta(fila('sup:avi', '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5z"/><path d="M10.3 20.2a1.9 1.9 0 0 0 3.4 0"/>', 'Avisos', 'Quién tiene los avisos del móvil'))
    + '<div class="cn-sec">Datos de la app</div>'
    + tarjeta(fila('sup:est', '<path d="M5 19V5M5 19h14"/><path d="M8.5 15.5l3-4 2.5 2 4-5.5"/>', 'Estadísticas', 'De dónde vienen y visitas'))
    + tarjeta(fila('sup:res', '<rect x="4" y="6" width="16" height="11" rx="2"/><path d="M9 20h6M10.5 9.8v3.6l3.4-1.8z"/>', 'Resúmenes', 'El plató de cualquier partida'))
    + '<div class="cn-sec">Gestión</div>'
    + '<div class="cn-card">' + fila('sup:gru', '<circle cx="9" cy="9.5" r="3"/><path d="M3.5 18.5c.6-2.8 2.8-4.2 5.5-4.2s4.9 1.4 5.5 4.2"/><path d="M15.5 6.8a3 3 0 0 1 0 5.6M17.5 14.6c1.6.6 2.7 1.9 3.1 3.9"/>', 'Grupos', 'Crear, entrar y miembros')
    +   fila('sup:usu', '<circle cx="12" cy="9.2" r="3.4"/><path d="M5 19.5c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/>', 'Usuarios', 'Roles y bajas')
    +   fila('sup:cod', '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8M17 12v3M20 12v2.2"/>', 'Códigos', 'Códigos de administrador')
    +   fila('sup:cam', '<path d="M12 20s-5.5-5.2-5.5-9.3a5.5 5.5 0 0 1 11 0C17.5 14.8 12 20 12 20z"/><circle cx="12" cy="10.5" r="1.9"/>', 'Campos', 'Mapa de los campos') + '</div>'
    + '</div><div class="cn-todo" id="cnTodo">'
    // ----- Lo primero: el grupo (cambiar de grupo o crear uno) -----
    + '<div class="cn-gran"><div class="cn-gran-top"><span class="cn-gesc" id="cnGesc"></span><span class="cn-tx"><em>Tu grupo</em><b id="cnGnom"></b></span></div>'
    +   '<button type="button" class="cn-oro" data-va="misGrupos">Cambiar de grupo o crear uno</button></div>'
    // ----- Mi golf -----
    + '<div class="cn-sec">Mi golf</div>'
    + '<div class="cn-card cn-hcp"><button type="button" class="cn-row" data-va="hcp"><span class="cn-tx"><b>Mi hándicap</b><span>Cómo se calcula</span></span><span class="cn-num" id="cnHcp"></span><i class="cn-fl" aria-hidden="true"></i></button></div>'
    + '<div class="cn-raps">' + rapida('partidas', '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>', 'Mis últimas partidas', 'Tarjetas y resultados')
    +   rapida('como', '<path d="M5 19V5M5 19h14"/><path d="M8.5 15.5l3-4 2.5 2 4-5.5"/>', '¿Cómo jugué?', 'Mi última partida') + '</div>'
    // ----- Mi grupo -----
    + '<div class="cn-sec" id="cnSecGrupo">Mi grupo</div>'
    + tarjeta(fila('invitar', '<circle cx="10" cy="9.5" r="3.2"/><path d="M4 19c.7-3 3-4.6 6-4.6 1.2 0 2.3.3 3.2.7"/><path d="M18 14v6M15 17h6"/>', 'Invitar amigos', 'Enlace y QR del grupo'))
    + '<div class="cn-adm" id="cnAdm" hidden><i>Solo administrador</i>'
    +   fila('miembros', '<path d="M5 7h9M5 12h9M5 17h6"/><path d="M16 16.5l2 2 3.5-4"/>', 'Miembros', 'Quién está en el grupo')
    +   fila('portada', '<rect x="4" y="5.5" width="16" height="13" rx="2"/><path d="M4 15.5l4.5-4 3.5 3 2.5-2 5.5 4.5"/><circle cx="15.5" cy="9.5" r="1.2"/>', 'Portada', 'Escudo, colores y campo')
    +   fila('ayudajug', SOPORTE, 'Ayuda con un jugador', 'Hablar con soporte de acgolf') + '</div>'
    // ----- Mi perfil y avisos -----
    + '<div class="cn-sec">Mi perfil y avisos</div>'
    + '<div class="cn-card">' + fila('foto', '<circle cx="12" cy="9.2" r="3.4"/><path d="M5 19.5c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/>', 'Foto o avatar', 'Cambiar mi imagen')
    +   fila('datos', '<circle cx="8.5" cy="12" r="3.5"/><path d="M12 12h8M17 12v3M20 12v2.2"/>', 'Contraseña y datos', 'Mi contraseña y mis datos') + '</div>'
    + '<div class="cn-card cn-pleg" id="cnPleg"><button type="button" class="cn-row" id="cnPlegBtn" aria-expanded="false"><span class="cn-ic">' + svg('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5h4"/>') + '</span><span class="cn-tx"><b>Avisos</b><span>Elige cómo te avisamos</span></span><i class="cn-fl cn-abre" aria-hidden="true"></i></button>'
    +   '<div class="cn-pleg-c" id="cnPlegC" hidden><div class="cn-avisos" id="cnAvisos"></div><div class="cn-msg" id="cnMsg" role="status"></div></div></div>'
    // ----- Ayuda y club -----
    + '<div class="cn-sec">Ayuda y club</div>'
    + '<div class="cn-card">' + fila('soporte', SOPORTE, 'Escribir a soporte', 'Te contestamos en la app')
    +   fila('manual', '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.8a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2 1-1.2 1.9"/><path d="M12 16.6v.1"/>', 'Manual de la app', 'Cómo se usa cada pantalla')
    +   fila('reglas', '<path d="M12 6.5c-2-1.3-4.5-1.5-7-1v12.5c2.5-.5 5-.3 7 1 2-1.3 4.5-1.5 7-1V5.5c-2.5-.5-5-.3-7 1z"/><path d="M12 6.5V19"/>', 'Reglas de golf', 'Las reglas explicadas')
    +   enlace('hato', '<path d="M9 19.5V4.5l8 3.2-8 3.2"/><path d="M5 19.5c1.5-1 6.5-1 8 0"/>', 'App Hato Verde', 'La app del club') + '</div>'
    // ----- Síguenos y valóranos (la reseña del patrocinador no sale mientras el patrocinador esté apagado) -----
    + '<div class="cn-sec" id="cnSecRedes">Síguenos y valóranos</div>'
    + '<div class="cn-redes">' + R.REDES.map(r => '<a class="cn-red" href="' + esc(r.url) + '" target="_blank" rel="noopener"><em>' + svg(LOGOS[r.c] || '') + '</em><span>' + esc(r.n) + '</span></a>').join('') + '</div>'
    + '<p class="cn-apoyo">Una reseña en Google nos ayuda muchísimo. Gracias</p>'
    + R.RESENAS.slice(0, 1).map((r, i) => tarjeta('<a class="cn-row" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + dentro(ESTRELLA, esc(String(r.n).replace(/^\W+/, '')), QUIEN[i] || '') + '</a>')).join('')
    // ----- Sesión -----
    + '<div class="cn-sesion"><button type="button" class="cn-salir" data-va="salir">Cerrar sesión</button>'
    + '<div class="cn-borrar"><button type="button" data-va="borrar">Borrar mi cuenta<small>Se borra para siempre</small></button></div></div>'
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
    if(!p || !C) return false;
    if(va.indexOf('sup:') === 0) return !!p.es_super;
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
    // Cada fila se esconde por sí sola; la tarjeta solo se esconde si TODAS sus filas faltan (antes mandaba la última: sin «App Hato Verde» desaparecía toda la tarjeta de Ayuda)
    caja.querySelectorAll('[data-va]').forEach(f => { const falta = !existe(f.dataset.va); const tj = f.closest('.cn-card'); if(tj && tj.querySelectorAll('[data-va]').length > 1){ if(f.hidden !== falta) f.hidden = falta; } else { const quien = tj || f; if(quien.hidden !== falta) quien.hidden = falta; } });
    caja.querySelectorAll('.cn-card').forEach(tj => { const fs = tj.querySelectorAll('[data-va]'); if(fs.length > 1){ const todas = Array.prototype.every.call(fs, x => x.hidden); if(tj.hidden !== todas) tj.hidden = todas; } });
    caja.querySelectorAll('.cn-adm').forEach(b => { const vacio = !b.querySelector('.cn-row:not([hidden])'); if(b.hidden !== vacio) b.hidden = vacio; });
    const sg = $('cnSecGrupo'); if(sg){ const hay = !!(sg.nextElementSibling && !sg.nextElementSibling.hidden) || !$('cnAdm').hidden; if(sg.hidden !== !hay) sg.hidden = !hay; }
    const esSup = !!(p && p.es_super); if($('cnTabs').hidden === esSup) $('cnTabs').hidden = !esSup;
    if(!esSup && pestana === 'sup') ponPestana('cuenta');
    caja.classList.toggle('cn-con-super', esSup);
    // App Hato Verde y soporte: los mismos enlaces de siempre
    const hato = $('irHatoBtn'), fh = caja.querySelector('[data-va="hato"]');
    if(hato && fh.getAttribute('href') !== hato.getAttribute('href')){ fh.setAttribute('href', hato.getAttribute('href')); if(hato.target) fh.target = hato.target; }
    // Avisos: los interruptores de siempre (cuenta.js y avisos-movil.js)
    if(p && window.acgolfCuenta && pintadoPara !== p){ pintadoPara = p; window.acgolfCuenta.avisos($('cnAvisos'), aviso); }
    // El mismo escudo que el Inicio (inicio-nuevo.js lo copia de la portada del grupo), también en la tarjeta «Mis grupos»
    const gn = $('inNombre'), ge = $('cnGesc'), gt = $('cnGnom');
    if(gn && gt && gt.textContent !== gn.textContent) gt.textContent = gn.textContent;
    const de = $('inEsc');
    const ini = $('cnIni'), iniTxt = (nombre || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    if(ini && ini.textContent !== iniTxt) ini.textContent = iniTxt;
    if(de && ge && ge.dataset.clave !== de.dataset.clave){ ge.dataset.clave = de.dataset.clave || ''; ge.innerHTML = de.innerHTML; ge.classList.toggle('cn-redondo', de.classList.contains('in-redondo')); }
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
    if(donde === 'redes') main.scrollTop = $('cnSecRedes').offsetTop - main.offsetTop; // aviso «Síguenos en redes» del móvil
  }
  function cerrar(){ if(!caja.hidden) caja.hidden = true; repasar(); }
  window.acgolfCuentaNueva = { abrir, cerrar };

  let pestana = 'cuenta';
  function ponPestana(t){
    pestana = t === 'sup' ? 'sup' : 'cuenta';
    $('cnSup').hidden = pestana !== 'sup'; $('cnTodo').hidden = pestana === 'sup';
    caja.querySelectorAll('.cn-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === pestana));
    main.scrollTop = 0;
    if(pestana === 'sup' && window.acgolfCuenta && window.acgolfCuenta.puntoSoporte) window.acgolfCuenta.puntoSoporte();
    bordes();
  }
  caja.querySelectorAll('.cn-tab').forEach(b => b.addEventListener('click', () => ponPestana(b.dataset.tab)));
  window.acgolfCuentaNueva.irSuper = () => { abrir(); ponPestana('sup'); };
  $('cnPlegBtn').addEventListener('click', () => { const c = $('cnPlegC'), ab = c.hidden; c.hidden = !ab; $('cnPlegBtn').setAttribute('aria-expanded', String(ab)); $('cnPleg').classList.toggle('abierto', ab); });
  caja.addEventListener('click', ev => {
    const f = ev.target.closest('[data-va]'); if(!f) return;
    const va = f.dataset.va, C = window.acgolfCuenta;
    if(va.indexOf('sup:') === 0){ const id = va.slice(4); if(id === 'seg'){ if(window.acgolfRitmo && window.acgolfRitmo.abrir) window.acgolfRitmo.abrir(); } else if(C && C.superIr) C.superIr(id); return; }
    if(DE_SIEMPRE[va]){ const b = document.querySelector(DE_SIEMPRE[va]); if(b) b.click(); return; }
    if(va === 'foto'){ window.acgolfAvatares.editar(window.miPerfil); return; }
    if(va === 'hato') return; // es un enlace
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
