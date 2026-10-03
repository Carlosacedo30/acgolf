/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Cuentas de jugador (versión de pruebas) ---
// Cada jugador entra con su email y contraseña. La primera vez elige quién es de la liga
// y acepta la política de privacidad. Sin cuenta no se ve ni se toca nada de la liga.
(function(){
  const VERSION_PRIVACIDAD = '2026-10-03';
  const client = initSupabase();
  const gate = document.createElement('div');
  gate.id = 'cuentaGate';
  gate.className = 'cg';
  document.body.appendChild(gate);

  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $ = id => document.getElementById(id);

  // El móvil recuerda si la cuenta es de administrador (la base de datos lo vuelve a comprobar siempre)
  function esAdminGuardado(){ try { return localStorage.getItem('acgolfEsAdmin') === '1'; } catch(e){ return false; } }
  window.getAdminKey = function(){ return esAdminGuardado() ? 'cuenta' : ''; };

  function traducir(err){
    const m = String((err && (err.message || err.error_description)) || err || '');
    if(/Invalid login credentials/i.test(m)) return 'El email o la contraseña no son correctos.';
    if(/Email not confirmed/i.test(m)) return 'Aún no has confirmado tu correo. Busca el mensaje que te enviamos y pulsa el enlace.';
    if(/already registered|already been registered/i.test(m)) return 'Ese correo ya tiene cuenta. Pulsa «Entrar».';
    if(/Password should be|at least/i.test(m)) return 'La contraseña tiene que tener al menos 8 caracteres.';
    if(/valid email|invalid format|Unable to validate email/i.test(m)) return 'Ese correo no parece válido.';
    if(/rate limit|too many|security purposes/i.test(m)) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
    if(/sending|smtp/i.test(m) && /error/i.test(m)) return 'No se pudo enviar el correo. Avisa al administrador.';
    if(/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Revisa la cobertura y vuelve a probar.';
    return m || 'Algo ha fallado. Vuelve a probar.';
  }

  function cabecera(titulo, sub){
    return '<div class="cg-head"><img src="logo-iscariotes.svg?v=6" alt="" width="84" height="84">'
      + '<div class="cg-eyebrow">Los Iscariotes · Liga de golf</div>'
      + '<h1 class="cg-title">' + titulo + '</h1>'
      + (sub ? '<p class="cg-sub">' + sub + '</p>' : '') + '</div>';
  }
  function msg(txt, ok){ const el = $('cgMsg'); if(el){ el.textContent = txt || ''; el.className = 'cg-msg' + (ok ? ' ok' : ''); } }
  async function ocupado(btn, fn){
    const t = btn.textContent; btn.disabled = true; btn.textContent = 'Un momento…';
    try { await fn(); } finally { btn.disabled = false; btn.textContent = t; }
  }
  function mostrar(html){ gate.innerHTML = '<div class="cg-card">' + html + '</div>'; gate.hidden = false; document.body.classList.add('cg-open'); gate.scrollTop = 0; }
  function ocultar(){ gate.hidden = true; gate.innerHTML = ''; document.body.classList.remove('cg-open'); }

  // ---------- Pantallas ----------
  function pantallaEntrar(aviso){
    mostrar(cabecera('Entrar', 'Con el correo y la contraseña de tu cuenta.')
      + '<label class="cg-lbl">Correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<label class="cg-lbl">Contraseña<input id="cgPass" type="password" autocomplete="current-password"></label>'
      + '<label class="cg-ver"><input type="checkbox" id="cgVer"> Ver la contraseña</label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgEntrar">Entrar</button>'
      + '<button type="button" class="cg-link" id="cgIrOlvido">He olvidado mi contraseña</button>'
      + '<div class="cg-sep">¿Es tu primera vez?</div>'
      + '<button type="button" class="cg-btn ghost" id="cgIrCrear">Crear mi cuenta</button>');
    if(aviso) msg(aviso, true);
    $('cgVer').onchange = e => { $('cgPass').type = e.target.checked ? 'text' : 'password'; };
    $('cgIrCrear').onclick = () => pantallaCrear();
    $('cgIrOlvido').onclick = () => pantallaOlvido($('cgEmail').value);
    $('cgEntrar').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim(), password = $('cgPass').value;
      if(!email || !password){ msg('Escribe tu correo y tu contraseña.'); return; }
      const { error } = await client.auth.signInWithPassword({ email, password });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    });
  }

  function pantallaCrear(){
    mostrar(cabecera('Crear mi cuenta', 'Solo hay que hacerlo una vez. Después el móvil te recuerda.')
      + '<label class="cg-lbl">Tu correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<label class="cg-lbl">Inventa una contraseña<small>Mínimo 8 letras o números</small><input id="cgPass" type="password" autocomplete="new-password"></label>'
      + '<label class="cg-ver"><input type="checkbox" id="cgVer"> Ver la contraseña</label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgCrear">Crear cuenta</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Ya tengo cuenta: entrar</button>');
    $('cgVer').onchange = e => { $('cgPass').type = e.target.checked ? 'text' : 'password'; };
    $('cgVolver').onclick = () => pantallaEntrar();
    $('cgCrear').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim(), password = $('cgPass').value;
      if(!email){ msg('Escribe tu correo.'); return; }
      if(password.length < 8){ msg('La contraseña tiene que tener al menos 8 caracteres.'); return; }
      const { data, error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo: location.origin + location.pathname } });
      if(error){ msg(traducir(error)); return; }
      if(data && data.session){ location.reload(); return; }
      mostrar(cabecera('Mira tu correo', 'Te hemos enviado un mensaje a <b>' + esc(email) + '</b>.')
        + '<p class="cg-p">Ábrelo y pulsa el enlace para confirmar tu cuenta. Si no lo ves, mira en «Correo no deseado».</p>'
        + '<p class="cg-p">Después vuelve aquí y entra con tu correo y tu contraseña.</p>'
        + '<button type="button" class="cg-btn" id="cgYa">Ya lo he confirmado: entrar</button>');
      $('cgYa').onclick = () => pantallaEntrar();
    });
  }

  function pantallaOlvido(emailPrevio){
    mostrar(cabecera('Nueva contraseña', 'Te mandamos un correo con un enlace para poner una contraseña nueva.')
      + '<label class="cg-lbl">Tu correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off" value="' + esc(emailPrevio || '') + '"></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgMandar">Enviarme el enlace</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Volver</button>');
    $('cgVolver').onclick = () => pantallaEntrar();
    $('cgMandar').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim();
      if(!email){ msg('Escribe tu correo.'); return; }
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if(error){ msg(traducir(error)); return; }
      msg('Listo. Abre el correo que te hemos enviado y pulsa el enlace.', true);
    });
  }

  function pantallaNuevaClave(){
    mostrar(cabecera('Pon tu contraseña nueva', '')
      + '<label class="cg-lbl">Contraseña nueva<small>Mínimo 8 letras o números</small><input id="cgPass" type="password" autocomplete="new-password"></label>'
      + '<label class="cg-ver"><input type="checkbox" id="cgVer"> Ver la contraseña</label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgGuardar">Guardar contraseña</button>');
    $('cgVer').onchange = e => { $('cgPass').type = e.target.checked ? 'text' : 'password'; };
    $('cgGuardar').onclick = e => ocupado(e.target, async () => {
      const password = $('cgPass').value;
      if(password.length < 8){ msg('La contraseña tiene que tener al menos 8 caracteres.'); return; }
      const { error } = await client.auth.updateUser({ password });
      if(error){ msg(traducir(error)); return; }
      history.replaceState(null, '', location.pathname);
      location.reload();
    });
  }

  async function pantallaCompletar(email){
    mostrar(cabecera('¿Quién eres?', 'Toca tu nombre. Solo se hace una vez.') + '<div class="cg-p">Cargando jugadores…</div>');
    let libres = [];
    try {
      const { data, error } = await client.rpc('jugadores_libres');
      if(error) throw error;
      libres = data || [];
    } catch(e){ msg(traducir(e)); }
    let elegido = '';
    mostrar(cabecera('¿Quién eres?', 'Toca tu nombre. Solo se hace una vez.')
      + '<div class="cg-nombres" id="cgNombres">' + (libres.length ? libres.map(n =>
          '<button type="button" class="cg-nombre" data-n="' + esc(n) + '">' + esc(n) + '</button>').join('')
          : '<div class="cg-p">No queda ningún jugador libre. Habla con el administrador.</div>') + '</div>'
      + '<label class="cg-acepto"><input type="checkbox" id="cgAcepto"><span>He leído y acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y las <a href="condiciones.html" target="_blank" rel="noopener">condiciones de uso</a>.</span></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgEmpezar">Empezar</button>'
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    gate.querySelectorAll('.cg-nombre').forEach(b => b.onclick = () => {
      elegido = b.dataset.n;
      gate.querySelectorAll('.cg-nombre').forEach(x => x.classList.toggle('on', x === b));
    });
    $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
    $('cgEmpezar').onclick = e => ocupado(e.target, async () => {
      if(!elegido){ msg('Toca tu nombre en la lista.'); return; }
      if(!$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      if(!confirm('¿Eres ' + elegido + '?\n\nTu cuenta quedará unida a este nombre.')) return;
      const { error } = await client.rpc('crear_mi_perfil', { p_player: elegido, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    });
  }

  // ---------- Mi cuenta ----------
  function panelMiCuenta(perfil){
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Mi cuenta</div><h1 class="cg-title">' + esc(perfil.player_name) + '</h1>'
      + '<p class="cg-sub">' + esc(perfil.email) + (perfil.es_admin ? ' · <b>Administrador</b>' : '') + '</p></div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn ghost" id="cgDatos">Descargar mis datos</button>'
      + '<button type="button" class="cg-btn ghost" id="cgClave">Cambiar mi contraseña</button>'
      + '<button type="button" class="cg-btn ghost" id="cgSalir">Cerrar sesión en este móvil</button>'
      + '<button type="button" class="cg-btn danger" id="cgBorrar">Borrar mi cuenta</button>'
      + '<p class="cg-legal"><a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a> · <a href="condiciones.html" target="_blank" rel="noopener">Condiciones de uso</a><br>Aceptadas el ' + esc(new Date(perfil.privacidad_aceptada_en).toLocaleDateString('es-ES')) + '</p>'
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    $('cgClave').onclick = pantallaNuevaClave;
    $('cgSalir').onclick = async () => {
      if(!confirm('¿Cerrar sesión en este móvil?\nPara volver a entrar necesitarás tu correo y tu contraseña.')) return;
      await client.auth.signOut();
      try { localStorage.removeItem('acgolfEsAdmin'); } catch(e){}
      location.reload();
    };
    $('cgDatos').onclick = e => ocupado(e.target, async () => {
      const { data, error } = await client.rpc('mis_datos');
      if(error){ msg(traducir(error)); return; }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mis-datos-golf.json';
      document.body.appendChild(a); a.click(); a.remove();
      msg('Descargado: mis-datos-golf.json', true);
    });
    $('cgBorrar').onclick = e => ocupado(e.target, async () => {
      if(!confirm('¿Borrar tu cuenta?\n\nSe borrarán tu correo y tu contraseña en unos días. Las partidas que ya jugaste se quedan en la liga, porque son también de tus compañeros.\n\nNo se puede deshacer.')) return;
      const { data, error } = await client.rpc('pedir_baja');
      if(error || !data){ msg(traducir(error)); return; }
      await client.auth.signOut();
      try { localStorage.removeItem('acgolfEsAdmin'); } catch(e){}
      mostrar(cabecera('Solicitud recibida', 'Tu cuenta se borrará en unos días. Ya has salido de la app en este móvil.')
        + '<button type="button" class="cg-btn" onclick="location.reload()">De acuerdo</button>');
    });
    if(perfil.es_admin) client.rpc('bajas_pendientes').then(({ data }) => {
      if(!data || !data.length) return;
      const box = document.createElement('div');
      box.className = 'cg-bajas';
      box.innerHTML = '<b>Cuentas para borrar (' + data.length + ')</b>'
        + data.map(b => '<div>' + esc(b.jugador || 'Sin jugador') + ' · ' + esc(b.email) + '</div>').join('')
        + '<small>Bórralas en Supabase → Authentication → Users.</small>';
      const ref = $('cgCerrar'); if(ref) ref.parentNode.insertBefore(box, ref);
    });
  }

  function botonMiCuenta(perfil){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cg-mi'; b.setAttribute('aria-label', 'Mi cuenta');
    b.textContent = '👤 ' + String(perfil.player_name).split(' ')[0];
    b.onclick = () => panelMiCuenta(perfil);
    document.body.appendChild(b);
  }

  // ---------- Arranque ----------
  mostrar('<div class="cg-head"><img src="logo-iscariotes.svg?v=6" alt="" width="84" height="84"><p class="cg-sub">Cargando…</p></div>');
  let recuperando = /type=recovery/.test(location.hash);
  if(client) client.auth.onAuthStateChange(ev => { if(ev === 'PASSWORD_RECOVERY'){ recuperando = true; pantallaNuevaClave(); } });

  (async function arrancar(){
    if(!client){ mostrar(cabecera('Sin conexión', 'No se ha podido conectar. Revisa la cobertura.') + '<button type="button" class="cg-btn" onclick="location.reload()">Reintentar</button>'); return; }
    let session = null;
    try { ({ data:{ session } } = await client.auth.getSession()); } catch(e){}
    if(recuperando && session){ pantallaNuevaClave(); return; }
    if(!session){ try { localStorage.removeItem('acgolfEsAdmin'); } catch(e){} pantallaEntrar(); return; }
    const { data: perfil, error } = await client.rpc('mi_perfil');
    if(error){ mostrar(cabecera('Sin conexión', traducir(error)) + '<button type="button" class="cg-btn" onclick="location.reload()">Reintentar</button>'); return; }
    if(!perfil){ pantallaCompletar(session.user && session.user.email); return; }
    const eraAdmin = esAdminGuardado();
    let eraYo = ''; try { eraYo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
    try { localStorage.setItem('acgolfEsAdmin', perfil.es_admin ? '1' : '0'); } catch(e){}
    try { localStorage.setItem('golfAppConvMe', perfil.player_name); } catch(e){} // "quién soy" = el de la cuenta
    window.miPerfil = perfil;
    // si cambian los permisos o "quién soy", se recarga una vez para que toda la app lo tenga en cuenta
    if(eraAdmin !== !!perfil.es_admin || eraYo !== perfil.player_name){ location.reload(); return; }
    botonMiCuenta(perfil);
    ocultar();
  })();
})();
