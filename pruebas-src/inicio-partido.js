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
    const nuevoBtn = isAdmin ? '<button type="button" class="conv-home-new" id="convHomeNew">' + icono('megafono') + ' Organizar partido con amigos</button>' : '';
    const me = convMe();
    const hoy = convIsoToday();
    box.innerHTML = lista.map(c => {
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
    }).join('') + (nuevoBtn ? '<div class="ip-nuevo">' + nuevoBtn + '</div>' : '');

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

  ordenar();
  try { renderConvHome(); } catch(e){}
})();
