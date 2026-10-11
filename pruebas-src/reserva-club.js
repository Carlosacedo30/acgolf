/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Pedir la reserva al club desde un partido organizado (solo administradores de grupos con liga) ---
// En «Organizar partido con amigos» sale el botón «Pedir reserva al club»: abre el correo del móvil
// con el mensaje ya escrito (día, horas y jugadores apuntados). El administrador solo pulsa «Enviar».
(function(){
  // Correo de reservas de cada club (si un campo no está aquí, no sale el botón)
  const CORREO_CLUB = {
    'hato-verde': 'info@clubhatoverde.es'
  };
  const yaPedida = c => { try { return localStorage.getItem('acgolfReserva_' + c) === '1'; } catch(e){ return false; } };
  const marcarPedida = c => { try { localStorage.setItem('acgolfReserva_' + c, '1'); } catch(e){} };
  // Teléfono del administrador para que el club confirme (se pregunta una vez y el móvil lo recuerda)
  const telGuardado = () => { try { return localStorage.getItem('acgolfTelReservas') || ''; } catch(e){ return ''; } };
  function pedirTel(){
    const t = prompt('¿A qué teléfono puede llamarte el club para confirmar la reserva?\n(Solo se pregunta una vez; el móvil lo recuerda.)', telGuardado());
    if(t === null) return null;
    const limpio = t.trim();
    try { localStorage.setItem('acgolfTelReservas', limpio); } catch(e){}
    return limpio;
  }

  function mensaje(c, campo, tel){
    const salidas = c.times.map((t, i) => ({ etq: convEtq(c, i), jug: c.groups[i] || [] })).filter(s => s.jug.length);
    const total = salidas.reduce((n, s) => n + s.jug.length, 0);
    const grupo = (window.miPerfil && window.miPerfil.grupo) || 'Los Iscariotes';
    const yo = (window.miPerfil && window.miPerfil.player_name) || '';
    const asunto = 'Reserva de salida · ' + convLongDate(c.date) + ' · ' + total + ' jugadores';
    const cuerpo = 'Hola, buenos días, equipo de ' + campo.name + ':\n\n'
      + 'Os escribimos desde el grupo de golf «' + grupo + '», ¡esperamos que estéis muy bien!\n\n'
      + 'Queríamos reservar salida en ' + campo.name + ' para el ' + convLongDate(c.date).toLowerCase().replace(',', '')
      + (typeof convAlTiro === 'function' && convAlTiro(c) ? ', salida al tiro a las ' + convTime(c.times[0]) : '') + ':\n\n'
      + salidas.map(s => '· ' + s.etq + ' — ' + s.jug.length + (s.jug.length === 1 ? ' jugador: ' : ' jugadores: ') + s.jug.join(', ')).join('\n')
      + '\n\nEn total, ' + total + (total === 1 ? ' jugador.' : ' jugadores.')
      + '\n\nPara confirmar la reserva, podéis llamarme' + (tel ? ' al ' + tel : '') + ' o responder a este correo.'
      + '\n\nMuchas gracias de antemano. Un saludo muy cordial,\n' + yo;
    return { asunto, cuerpo, total };
  }

  function ponerBoton(){
    const ov = document.getElementById('convOverlay');
    if(!ov || ov.hidden || typeof conv === 'undefined' || !conv) return;
    const p = window.miPerfil;
    // En «Mis partidas» (espacio personal) todos son administradores de lo suyo: ahí no sale.
    if(!p || !p.es_admin || p.grupo_tipo !== 'liga') return;
    const acc = ov.querySelector('.conv-actions');
    if(!acc || acc.querySelector('#convReserva')) return;
    const campo = convCourse(conv.courseId);
    const correo = campo && CORREO_CLUB[campo.id];
    if(!correo) return;
    const pedida = yaPedida(conv.code);
    const a = document.createElement('a');
    a.className = 'conv-btn ghost'; a.id = 'convReserva';
    a.textContent = pedida ? '✓ Reserva pedida al club (volver a pedir)' : '📧 Pedir reserva al club';
    const codigo = conv.code;
    a.addEventListener('click', ev => {
      if(!(conv.groups || []).some(g => g && g.length)){ ev.preventDefault(); alert('Todavía no hay nadie apuntado. Pide la reserva cuando estén los jugadores.'); return; }
      let tel = telGuardado();
      if(!tel){ tel = pedirTel(); if(tel === null){ ev.preventDefault(); return; } }
      const m = mensaje(conv, campo, tel);
      if(!confirm('Se abrirá tu correo con el mensaje para ' + campo.name + ' (' + correo + '):\n\n' + m.cuerpo + '\n\nRevísalo y pulsa «Enviar».')){ ev.preventDefault(); return; }
      a.href = 'mailto:' + correo + '?subject=' + encodeURIComponent(m.asunto) + '&body=' + encodeURIComponent(m.cuerpo);
      marcarPedida(codigo);
      setTimeout(() => { a.textContent = '✓ Reserva pedida al club (volver a pedir)'; }, 500);
    });
    const wa = acc.querySelector('#convMail') || acc.querySelector('#convShareWa');
    if(wa && wa.nextSibling) acc.insertBefore(a, wa.nextSibling); else acc.appendChild(a);
  }

  // Cada vez que se pinta la ventana del partido
  let pendiente = false;
  new MutationObserver(() => {
    if(pendiente) return; pendiente = true;
    requestAnimationFrame(() => { pendiente = false; try { ponerBoton(); } catch(e){} });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
