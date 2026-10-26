/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Inicio: «Crear partida» de protagonista y el próximo partido en una tarjeta discreta ---
// · CREAR PARTIDA va lo primero y es el botón más grande.
// · Debajo, cada partido organizado en una tarjeta pequeña: «Domingo 18 · Hato Verde · 3 apuntados»
//   con «Apuntarme» (se elige la hora ahí mismo: 8:40 · 8:50 · No voy) o «✓ 8:40» si ya vas.
// · El día del partido la tarjeta dice «Hoy juegas · salida a las 8:40» y con quién.
(function(){
  if(typeof renderConvHomeCards !== 'function') return;
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const primero = n => String(n || '').trim().split(/\s+/)[0] || '';
  let abierta = null; // tarjeta con las horas desplegadas
  let guardando = false;

  // Logo propio de cada grupo, por su nombre. Para dar de alta un grupo nuevo: añadir aquí su nombre y su archivo.
  const LOGOS_GRUPO = {
    'los iscariotes': { src: 'logo-iscariotes.svg?v=6', nombre: 'Los Iscariotes' },
    'cajapollos':     { src: 'logo-cajapollos.svg?v=1', nombre: 'Cajapollos' }
  };
  // Los demás grupos: el escudo que se diseñó al crear el grupo (el mismo de su portada). Las partidas personales, nada.
  function logoDelGrupo(){
    const perfil = window.miPerfil || {};
    const nombre = String(window.acgolfGrupo || perfil.grupo || '').trim();
    const propio = LOGOS_GRUPO[nombre.toLowerCase()];
    if(propio) return propio;
    const P = window.acgolfPortada;
    if(!nombre || perfil.grupo_tipo === 'personal' || !P || typeof P.escudo !== 'function') return null;
    const m = P.marcaDe(perfil);
    return { svg: P.escudo(m.escudo, m.iniciales, m.color, 44), nombre: nombre };
  }
  window.acgolfLogosGrupo = LOGOS_GRUPO;

  // CREAR PARTIDA, lo primero del bloque
  function ordenar(){
    const crear = document.getElementById('prAbrirBtn'), conv = document.getElementById('convHome');
    if(crear && conv && crear.nextElementSibling !== conv) conv.parentNode.insertBefore(crear, conv);
  }

  window.renderConvHomeCards = function(box){
    ordenar();
    const isAdmin = !!getAdminKey();
    convSyncActiva(conv);
    const lista = convActivas;
    // Cualquier jugador con cuenta puede organizar un partido con sus amigos
    const puedeOrganizar = isAdmin || !!window.miPerfilId;
    // Cada grupo con SU logo (por su nombre). Si no tiene logo propio, su escudo de grupo.
    const logo = logoDelGrupo();
    const nuevoBtn = puedeOrganizar ? '<button type="button" class="conv-home-new' + (logo ? ' con-logo' : '') + '" id="convHomeNew">'
      + (logo ? (logo.src ? '<img class="ip-logo-grupo" src="' + logo.src + '" alt="' + esc(logo.nombre) + '">'
                          : '<span class="ip-logo-grupo ip-escudo" role="img" aria-label="Escudo de ' + esc(logo.nombre) + '">' + logo.svg + '</span>') : '')
      + '<span>Organizar partidos</span></button>' : '';
    const me = convMe();
    const hoy = convIsoToday();
    // «Organizar partidos» justo debajo de CREAR PARTIDA (lo más importante, arriba del todo)
    box.innerHTML = (nuevoBtn ? '<div class="ip-nuevo">' + nuevoBtn + '</div>' : '') + lista.map(c => {
      const total = c.groups.reduce((a, g) => a + g.length, 0);
      const mi = me ? convSlotOf(c, me) : -1;
      const d = new Date(c.date + 'T12:00:00');
      const esHoy = c.date === hoy;
      const campo = convCourse(c.courseId).name.replace(/^Club\s+/i, '');
      const horas = convAlTiro(c) ? 'al tiro a las ' + convTime(c.times[0]) : 'salidas ' + c.times.map((t, k) => convEtq(c, k)).join(' y ');
      const compis = mi >= 0 ? (c.groups[mi] || []).filter(n => n !== me).map(primero) : [];
      const etiqueta = esHoy && mi >= 0 ? 'Hoy juegas' : esHoy ? 'Hoy se juega' : 'Próximo partido';
      const cuando = esHoy && mi >= 0 ? campo + ' · salida a las ' + convTime(c.times[mi]) : DIAS[d.getDay()] + ' ' + d.getDate() + ' · ' + campo;
      const pie = esHoy && mi >= 0 && compis.length ? 'Con ' + compis.join(', ').replace(/, ([^,]*)$/, ' y $1') : total + (total === 1 ? ' apuntado' : ' apuntados') + ' · ' + horas;
      const derecha = c.roundCode ? '<span class="ip-ok">Partida creada ›</span>'
        : mi >= 0 ? '<span class="ip-ok">✓ ' + esc(convTime(c.times[mi])) + '</span>'
        : '<button type="button" class="ip-apuntar" data-apuntar="' + esc(c.code) + '">Apuntarme</button>';
      const elegir = abierta === c.code ? '<div class="ip-horas">' + c.times.map((t, k) => {
          const llena = (c.groups[k] || []).length >= CONV_SLOTS && mi !== k;
          return '<button type="button" class="ip-hora' + (mi === k ? ' sel' : '') + '" data-c="' + esc(c.code) + '" data-k="' + k + '"' + (llena ? ' disabled' : '') + '>' + esc(convEtq(c, k)) + (llena ? '<small>llena</small>' : '') + '</button>';
        }).join('') + '<button type="button" class="ip-hora no" data-c="' + esc(c.code) + '" data-k="-1">No voy</button></div>' : '';
      const cambiar = mi >= 0 && !c.roundCode && abierta !== c.code ? '<button type="button" class="ip-cambiar" data-apuntar="' + esc(c.code) + '">Cambiar hora o decir que no voy</button>' : '';
      return '<div class="ip-card' + (esHoy ? ' hoy' : '') + '">'
        + '<div class="ip-fila"><div class="ip-info" role="button" tabindex="0" data-conv-code="' + esc(c.code) + '">'
        + '<div class="ip-eti">' + etiqueta + '</div><div class="ip-cuando">' + esc(cuando) + '</div><div class="ip-pie">' + esc(pie) + '</div></div>'
        + derecha + '</div>' + elegir + cambiar + '</div>';
    }).join('');

    box.querySelectorAll('[data-conv-code]').forEach(card => card.addEventListener('click', () => {
      const c = convActivas.find(x => x.code === card.dataset.convCode); if(!c) return;
      if(!conv || conv.code !== c.code){ conv = c; convWatch(); }
      if(c.roundCode && typeof convOpenRound === 'function') convOpenRound(); else openConv(false);
    }));
    box.querySelectorAll('[data-apuntar]').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      abierta = abierta === b.dataset.apuntar ? null : b.dataset.apuntar;
      renderConvHome();
    }));
    box.querySelectorAll('.ip-hora').forEach(b => b.addEventListener('click', async ev => {
      ev.stopPropagation();
      if(guardando || b.disabled) return;
      const c = convActivas.find(x => x.code === b.dataset.c); if(!c) return;
      const yo = convMe() || (window.miPerfil && window.miPerfil.player_name);
      if(!yo) return;
      guardando = true; b.textContent = 'Guardando…';
      if(!conv || conv.code !== c.code){ conv = c; convWatch(); }
      try { await convSignUp(yo, parseInt(b.dataset.k, 10)); } finally { guardando = false; abierta = null; renderConvHome(); }
    }));
    const nb = document.getElementById('convHomeNew'); if(nb) nb.addEventListener('click', () => openConv(true));
  };

  // La ventana «Partido con amigos» también lleva el logo del grupo en el que estás (antes salía siempre Los Iscariotes)
  function logoVentana(){
    const head = document.querySelector('#convOverlay .conv-head');
    if(!head) return;
    const logo = logoDelGrupo();
    const clave = logo ? (logo.src || logo.svg) : 'ninguno';
    if(head.dataset.logo === clave) return;
    head.dataset.logo = clave;
    const viejo = head.querySelector('img, .conv-escudo');
    if(viejo) viejo.remove();
    if(!logo) return;  // partidas personales: sin logo
    let el;
    if(logo.src){
      el = document.createElement('img');
      el.src = logo.src; el.alt = logo.nombre; el.width = 92; el.height = 92;
    } else {
      el = document.createElement('div');
      el.className = 'conv-escudo'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Escudo de ' + logo.nombre);
      el.innerHTML = logo.svg.replace(/width="\d+" height="\d+"/, 'width="92" height="92"');
    }
    head.insertBefore(el, head.firstChild);
  }
  logoVentana();
  setInterval(logoVentana, 700);

  ordenar();
  try { renderConvHome(); } catch(e){}
  // La cuenta llega un poco después de pintar el Inicio: en cuanto llega, se vuelve a pintar con el botón
  if(!window.miPerfilId){
    let n = 0;
    const t = setInterval(() => {
      if(window.miPerfilId){ clearInterval(t); try { renderConvHome(); } catch(e){} }
      else if(++n > 60) clearInterval(t);
    }, 500);
  }
})();
