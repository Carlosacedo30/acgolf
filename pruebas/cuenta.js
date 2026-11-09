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

  const APP_PRUEBAS = 'https://carlosacedo30.github.io/acgolf/pruebas/';
  // Vuelta desde el enlace del correo cuando falla (ya se usó o ha caducado): Supabase añade ?error=… o #error=…
  let enlaceFallido = '';
  try {
    const h = new URLSearchParams((location.hash || '').replace(/^#/, '')), q = new URLSearchParams(location.search);
    const fallo = h.get('error_code') || q.get('error_code') || h.get('error') || q.get('error') || '';
    if(fallo){ enlaceFallido = fallo; history.replaceState(null, '', location.pathname); }
  } catch(e){}
  try {
    const inv = new URLSearchParams(location.search).get('unirse');
    if(inv){ localStorage.setItem('acgolfInvitacion', inv.trim().toUpperCase()); history.replaceState(null, '', location.pathname); }
  } catch(e){}
  const invitacion = () => { try { return localStorage.getItem('acgolfInvitacion') || ''; } catch(e){ return ''; } };
  const olvidarInvitacion = () => { try { localStorage.removeItem('acgolfInvitacion'); } catch(e){} };
  // Código de administrador (lo manda el super administrador): ?admin=ADM-XXXXXX
  try {
    const adm = new URLSearchParams(location.search).get('admin');
    if(adm){ localStorage.setItem('acgolfCodigoAdmin', adm.trim().toUpperCase()); history.replaceState(null, '', location.pathname); }
  } catch(e){}
  const codigoAdmin = () => { try { return localStorage.getItem('acgolfCodigoAdmin') || ''; } catch(e){ return ''; } };
  const olvidarCodigoAdmin = () => { try { localStorage.removeItem('acgolfCodigoAdmin'); } catch(e){} };

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

  const LOGO_APP = '<svg class="cg-logo" width="76" height="76" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#111316" stroke="#C6F24E" stroke-width="4"/><path d="M42 74 V26" stroke="#F2F4F5" stroke-width="5" stroke-linecap="round"/><path d="M45 26 L70 35 L45 45 Z" fill="#C6F24E"/><ellipse cx="46" cy="76" rx="16" ry="4" fill="#F2F4F5" opacity=".3"/></svg>';
  function cabecera(titulo, sub){
    return '<div class="cg-head">' + LOGO_APP
      + '<div class="cg-eyebrow">acgolf · Golf entre amigos</div>'
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

  // Entrar o crear la cuenta con Google (Supabase lo gestiona; al volver, la sesión ya está abierta)
  const G_SVG = '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  const botonGoogle = () => '<button type="button" class="cg-google" id="cgGoogle">' + G_SVG + '<span>Continuar con Google</span></button><div class="cg-sep cg-o">o con tu correo</div>';
  function ligarGoogle(){
    const b = $('cgGoogle'); if(!b) return;
    b.onclick = e => ocupado(b, async () => {
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if(error) msg(/provider|not enabled|Unsupported/i.test(String(error.message)) ? 'Entrar con Google aún no está activado. Usa tu correo.' : traducir(error));
    });
  }

  // ---------- Pantallas ----------
  function pantallaEntrar(aviso){
    mostrar(cabecera('Entrar', 'Con Google o con el correo y la contraseña de tu cuenta.') + botonGoogle()
      + '<label class="cg-lbl">Correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<label class="cg-lbl">Contraseña<input id="cgPass" type="password" autocomplete="current-password"></label>'
      + '<label class="cg-ver"><input type="checkbox" id="cgVer"> Ver la contraseña</label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgEntrar">Entrar</button>'
      + '<button type="button" class="cg-link" id="cgIrOlvido">He olvidado mi contraseña</button>'
      + '<div class="cg-sep">¿Es tu primera vez?</div>'
      + '<button type="button" class="cg-btn ghost" id="cgIrCrear">Crear mi cuenta</button>'
      + (window.acgolfInstalar ? '<button type="button" class="cg-link" id="cgInstalar">📲 Instalar la app en el móvil</button>' : ''));
    if($('cgInstalar')) $('cgInstalar').onclick = () => window.acgolfInstalar();
    if(aviso) msg(aviso, true);
    ligarGoogle();
    $('cgVer').onchange = e => { $('cgPass').type = e.target.checked ? 'text' : 'password'; };
    $('cgIrCrear').onclick = () => pantallaCrear();
    $('cgIrOlvido').onclick = () => pantallaOlvido($('cgEmail').value);
    $('cgEntrar').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim(), password = $('cgPass').value;
      if(!email || !password){ msg('Escribe tu correo y tu contraseña.'); return; }
      const { error } = await client.auth.signInWithPassword({ email, password });
      if(error){
        msg(traducir(error));
        if(/Email not confirmed/i.test(String(error.message || '')) && !$('cgOtroEnlace')){
          const b = document.createElement('button'); b.type = 'button'; b.className = 'cg-btn ghost'; b.id = 'cgOtroEnlace'; b.textContent = 'Mándame otro enlace';
          b.onclick = () => ocupado(b, () => mandarOtroEnlace($('cgEmail').value.trim()));
          $('cgMsg').after(b);
        }
        return;
      }
      location.reload();
    });
  }

  // Mandar otro enlace de confirmación (para quien no pudo confirmar)
  async function mandarOtroEnlace(email){
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg('Escribe bien tu correo.'); return; }
    const { error } = await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } });
    if(error){
      if(/already|confirmed/i.test(String(error.message || ''))){ msg('Tu correo ya está confirmado. Entra con tu correo y tu contraseña.', true); return; }
      msg(traducir(error)); return;
    }
    msg('Listo. Te hemos mandado un enlace nuevo a ' + email + '. Mira también en «Correo no deseado».', true);
  }

  function pantallaEnlaceFallido(){
    mostrar(cabecera('Este enlace ya no sirve', 'Ya se había usado o ha caducado. No pasa nada.')
      + '<p class="cg-p"><b>Si ya lo pulsaste antes</b>, tu correo ya está confirmado. Entra con tu correo y tu contraseña.</p>'
      + '<button type="button" class="cg-btn" id="cgEnlEntrar">Entrar con mi cuenta</button>'
      + '<div class="cg-sep">¿Todavía no puedes entrar?</div>'
      + '<p class="cg-p">Te mandamos un enlace nuevo. Dura 24 horas y solo hay que pulsarlo una vez.</p>'
      + '<label class="cg-lbl">Tu correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn ghost" id="cgEnlOtro">Mándame otro enlace</button>'
      + '<button type="button" class="cg-link" id="cgEnlClave">Era para cambiar mi contraseña</button>');
    $('cgEnlEntrar').onclick = () => pantallaEntrar();
    $('cgEnlClave').onclick = () => pantallaOlvido($('cgEmail').value);
    $('cgEnlOtro').onclick = e => ocupado(e.target, () => mandarOtroEnlace($('cgEmail').value.trim()));
  }

  function pantallaCrear(aviso){
    mostrar(cabecera('Crear mi cuenta', 'Solo hay que hacerlo una vez. Después el móvil te recuerda.') + botonGoogle()
      + '<label class="cg-lbl">Tu correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<label class="cg-lbl">Inventa una contraseña<small>Mínimo 8 letras o números</small><input id="cgPass" type="password" autocomplete="new-password"></label>'
      + '<label class="cg-ver"><input type="checkbox" id="cgVer"> Ver la contraseña</label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgCrear">Crear cuenta</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Ya tengo cuenta: entrar</button>');
    ligarGoogle();
    if(aviso) msg(aviso);
    $('cgVer').onchange = e => { $('cgPass').type = e.target.checked ? 'text' : 'password'; };
    $('cgVolver').onclick = () => pantallaEntrar();
    $('cgCrear').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim(), password = $('cgPass').value;
      if(!email){ msg('Escribe tu correo.'); return; }
      if(password.length < 8){ msg('La contraseña tiene que tener al menos 8 caracteres.'); return; }
      const { data, error } = await client.auth.signUp({ email, password, options:{ emailRedirectTo: location.origin + location.pathname } });
      if(error){ msg(traducir(error)); return; }
      // Supabase no avisa si el correo ya existe (no manda ningún mensaje): se nota porque viene sin «identidades»
      if(data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0){ msg('Ese correo ya tiene cuenta (quizá la creaste con Google). Pulsa «Continuar con Google» o «Ya tengo cuenta: entrar».'); return; }
      await evento('registro');
      if(data && data.session){ location.reload(); return; }
      mostrar(cabecera('Mira tu correo', 'Te hemos enviado un mensaje a <b>' + esc(email) + '</b>.')
        + '<p class="cg-p">Ábrelo y pulsa el enlace para confirmar tu cuenta. Si no lo ves, mira en «Correo no deseado».</p>'
        + '<p class="cg-p">El enlace dura 24 horas y <b>solo hay que pulsarlo una vez</b>.</p>'
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

  const aceptoHtml = '<label class="cg-acepto"><input type="checkbox" id="cgAcepto"><span>He leído y acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y las <a href="condiciones.html" target="_blank" rel="noopener">condiciones de uso</a>.</span></label>';
  const leerHcp = id => { const v = parseFloat(String(($(id) || {}).value || '').replace(',', '.')); return isNaN(v) ? null : v; };


  // ---------- Recordar si ya entró alguna vez ----------
  const yaEntroAntes = () => { try { return localStorage.getItem('acgolfYaEntro') === '1'; } catch(e){ return false; } };
  // Apunta el evento y espera como mucho 2 s (para que no se corte al recargar la app)
  const evento = e => { try { if(window.acgolfEvento) return Promise.race([window.acgolfEvento(e), new Promise(r => setTimeout(r, 2000))]); } catch(x){} return Promise.resolve(); };
  function pantallaGuardarCuenta(){
    mostrar(cabecera('Guardar mi cuenta', 'Así no pierdes tus partidas y puedes entrar desde cualquier móvil.')
      + '<label class="cg-lbl">Tu correo<input id="cgEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="off"></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgGuardarCta">Guardar mi cuenta</button>'
      + '<button type="button" class="cg-link" id="cgLuego">Ahora no</button>');
    $('cgLuego').onclick = () => ocultar();
    $('cgGuardarCta').onclick = e => ocupado(e.target, async () => {
      const email = $('cgEmail').value.trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg('Escribe bien tu correo.'); return; }
      const { error } = await client.auth.updateUser({ email }, { emailRedirectTo: location.origin + location.pathname });
      if(error){ msg(traducir(error)); return; }
      try { localStorage.setItem('acgolfFaltaClave', '1'); } catch(x){}
      evento('registro');
      mostrar(cabecera('Mira tu correo', 'Te hemos enviado un mensaje a <b>' + esc(email) + '</b>.')
        + '<p class="cg-p">Pulsa el enlace del mensaje para confirmar tu correo. Después la app te pedirá que inventes una contraseña.</p>'
        + '<p class="cg-p">Tus partidas se quedan guardadas.</p>'
        + '<button type="button" class="cg-btn" id="cgOk">Entendido</button>');
      $('cgOk').onclick = () => ocultar();
    });
  }
  window.acgolfGuardarCuenta = () => pantallaGuardarCuenta();
  function avisoPrueba(){
    const a = document.createElement('div');
    a.className = 'cg-prueba';
    a.innerHTML = '<span>Estás probando acgolf</span><button type="button">Guardar mi cuenta</button>';
    a.querySelector('button').onclick = () => pantallaGuardarCuenta();
    document.body.appendChild(a);
  }

  // Entrar en un grupo con el enlace de invitación
  async function pantallaUnirse(email, codigo){
    mostrar(cabecera('Cargando invitación…', '') );
    let info = null;
    try { const r = await client.rpc('info_invitacion', { p_codigo: codigo }); if(r.error) throw r.error; info = r.data; } catch(e){}
    if(!info){
      mostrar(cabecera('Esa invitación no vale', 'Puede que el administrador haya cambiado el enlace. Pídele uno nuevo.')
        + '<button type="button" class="cg-btn" id="cgSinInv">Seguir sin invitación</button>'
        + '<button type="button" class="cg-link" id="cgSalir">Salir</button>');
      $('cgSinInv').onclick = () => { olvidarInvitacion(); pantallaCompletar(email); };
      $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
      return;
    }
    if(info.yaEstoy){
      const { error } = await client.rpc('unirse_grupo', { p_codigo: codigo, p_player: '', p_hcp: null, p_version: VERSION_PRIVACIDAD });
      olvidarInvitacion();
      if(error){ msg(traducir(error)); return; }
      location.reload(); return;
    }
    let elegido = '';
    const libres = info.libres || [];
    const hg = await miHcpGlobal();
    mostrar(cabecera('Te unes a «' + esc(info.grupo) + '»', libres.length ? 'Toca tu nombre. Si no estás en la lista, escríbelo abajo.' : (hg ? 'Escribe tu nombre.' : 'Escribe tu nombre y tu hándicap.'))
      + (libres.length ? '<div class="cg-nombres">' + libres.map(n => '<button type="button" class="cg-nombre" data-n="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>'
          + '<div class="cg-sep">¿No estás en la lista?</div>' : '')
      + '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name" value="' + esc((window.miPerfil && window.miPerfil.player_name) || '') + '"></label>'
      + (hg ? '<div class="cg-hcp-global"><span>Tu hándicap</span><b>' + comaHcp(hg.hcp) + '</b><small>Entras con tu hándicap de siempre. Es el mismo en todos tus grupos.</small></div>'
            : '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4. Si no tienes, pon 36</small><input id="cgHcp" type="text" inputmode="decimal"></label>')
      + aceptoHtml + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgEmpezar">Entrar en el grupo</button>'
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    gate.querySelectorAll('.cg-nombre').forEach(b => b.onclick = () => {
      elegido = elegido === b.dataset.n ? '' : b.dataset.n;
      gate.querySelectorAll('.cg-nombre').forEach(x => x.classList.toggle('on', x.dataset.n === elegido));
      if(elegido){ $('cgNombre').value = ''; if($('cgHcp')) $('cgHcp').value = ''; }
    });
    $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
    $('cgEmpezar').onclick = e => ocupado(e.target, async () => {
      const nombre = elegido || $('cgNombre').value.trim();
      if(!nombre){ msg('Toca tu nombre o escríbelo.'); return; }
      const hcp = (elegido || hg) ? null : leerHcp('cgHcp');
      if(!elegido && !hg && hcp === null){ msg('Escribe tu hándicap.'); return; }
      if(!$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      const { error } = await client.rpc('unirse_grupo', { p_codigo: codigo, p_player: nombre, p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      olvidarInvitacion();
      location.reload();
    });
  }

  // Crear un grupo nuevo: quien lo crea queda como administrador
  function pantallaCrearGrupo(email, yaTengoCuenta){
    mostrar(cabecera('Crear un grupo nuevo', 'Tendréis vuestra propia liga, hándicaps, medallas y caddie. Solo lo veréis los de vuestro grupo.')
      + '<label class="cg-lbl">Nombre del grupo<small>Por ejemplo: Cajapollos</small><input id="cgGrupo" type="text" maxlength="40"></label>'
      + '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name"></label>'
      + '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4</small><input id="cgHcp" type="text" inputmode="decimal"></label>'
      + (yaTengoCuenta ? '' : aceptoHtml) + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgCrearGrupo">Crear el grupo</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Volver</button>');
    $('cgVolver').onclick = () => yaTengoCuenta ? pantallaMisGrupos(window.miPerfil || { email }) : pantallaBienvenida(email);
    $('cgCrearGrupo').onclick = e => ocupado(e.target, async () => {
      const grupo = $('cgGrupo').value.trim(), nombre = $('cgNombre').value.trim(), hcp = leerHcp('cgHcp');
      if(!grupo){ msg('Ponle un nombre al grupo.'); return; }
      if(!nombre){ msg('Escribe tu nombre.'); return; }
      if(hcp === null){ msg('Escribe tu hándicap.'); return; }
      if($('cgAcepto') && !$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      if(!confirm('¿Crear el grupo «' + grupo + '»?\n\nTú serás su administrador. Después podrás invitar a los demás con un enlace.')) return;
      const { error } = await client.rpc('crear_grupo', { p_nombre: grupo, p_player: nombre, p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    });
  }

  // Usar un código de administrador: crear el grupo nuevo o hacerse administrador del grupo del código
  async function pantallaCodigoAdmin(email, perfil, codigo){
    const volver = () => { olvidarCodigoAdmin(); perfil ? pantallaMisGrupos(perfil) : pantallaBienvenida(email); };
    if(!codigo){
      mostrar(cabecera('Código de administrador', 'Para crear un grupo hace falta un código. Ponte en contacto con acgolf para pedirlo.')
        + '<label class="cg-lbl">Tu código<small>Empieza por ADM-</small><input id="caCodigo" type="text" autocapitalize="characters" maxlength="40" placeholder="ADM-"></label>'
        + '<div id="cgMsg" class="cg-msg"></div>'
        + '<button type="button" class="cg-btn" id="caSeguir">Seguir</button>'
        + '<button type="button" class="cg-link" id="cgVolver">Volver</button>');
      $('cgVolver').onclick = volver;
      $('caSeguir').onclick = () => {
        let c = $('caCodigo').value.trim().toUpperCase().replace(/.*ADMIN=/, '');
        if(!c){ msg('Escribe el código.'); return; }
        if(!/^ADM-/.test(c)) c = 'ADM-' + c.replace(/^ADM/, '');
        try { localStorage.setItem('acgolfCodigoAdmin', c); } catch(e){}
        pantallaCodigoAdmin(email, perfil, c);
      };
      return;
    }
    mostrar(cabecera('Comprobando el código…', ''));
    let info = null;
    try { const r = await client.rpc('info_codigo_admin', { p_codigo: codigo }); if(r.error) throw r.error; info = r.data; } catch(e){}
    if(!info || !info.valido){
      const porque = !info ? 'Ese código no existe. Revisa que esté bien escrito.' : info.usado ? 'Ese código ya se ha usado. Ponte en contacto con acgolf para pedir otro.' : 'Ese código ha caducado. Ponte en contacto con acgolf para pedir otro.';
      mostrar(cabecera('Ese código no vale', porque)
        + '<button type="button" class="cg-btn" id="caOtro">Escribir otro código</button>'
        + '<button type="button" class="cg-link" id="cgVolver">Volver</button>');
      $('caOtro').onclick = () => { olvidarCodigoAdmin(); pantallaCodigoAdmin(email, perfil, ''); };
      $('cgVolver').onclick = volver;
      return;
    }
    const sinCuenta = !perfil;
    const nuevo = info.nuevo;
    mostrar(cabecera(nuevo ? 'Crear tu grupo' : 'Administrador de «' + esc(info.grupo) + '»',
        nuevo ? 'Con este código creas tu grupo y quedas como su administrador. Tendréis vuestra propia liga, hándicaps y caddie.'
              : 'Con este código pasas a ser administrador de «' + esc(info.grupo) + '».')
      + (nuevo ? '<label class="cg-lbl">Nombre del grupo<small>Por ejemplo: Cajapollos</small><input id="cgGrupo" type="text" maxlength="40"></label>' : '')
      + (nuevo || sinCuenta ? '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name"></label>'
          + '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4</small><input id="cgHcp" type="text" inputmode="decimal"></label>' : '')
      + (sinCuenta ? aceptoHtml : '') + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="caUsar">' + (nuevo ? 'Crear el grupo' : 'Ser administrador') + '</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Ahora no</button>');
    $('cgVolver').onclick = volver;
    $('caUsar').onclick = e => ocupado(e.target, async () => {
      const grupo = nuevo ? $('cgGrupo').value.trim() : '';
      const nombre = $('cgNombre') ? $('cgNombre').value.trim() : '';
      const hcp = $('cgHcp') ? leerHcp('cgHcp') : null;
      if(nuevo && !grupo){ msg('Ponle un nombre al grupo.'); return; }
      if($('cgNombre') && !nombre){ msg('Escribe tu nombre.'); return; }
      if(nuevo && hcp === null){ msg('Escribe tu hándicap.'); return; }
      if($('cgAcepto') && !$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      const { error } = await client.rpc('usar_codigo_admin', { p_codigo: codigo, p_nombre_grupo: grupo, p_player: nombre, p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      olvidarCodigoAdmin(); olvidarInvitacion();
      location.reload();
    });
  }

  // Crear un grupo: el super administrador lo crea directamente; los demás necesitan su código
  function botonNuevoGrupo(email, perfil){
    empezarGrupoNuevo(email, perfil || null);   // sin código: se elige plan, se activa y se crea el grupo
  }

  // Cuenta nueva sin grupo: solo dos caminos, muy explicados
  //   1) Tengo una invitación (código o enlace de un amigo)  ·  2) Crear mi grupo (gratis, aunque estés solo)
  const queEsGrupo = '<details class="cg-que"><summary>¿Qué es un grupo?</summary>'
    + '<p>Un grupo es como un <b>equipo</b>: los amigos con los que juegas. Allí se apuntan las partidas y se ve quién gana.</p>'
    + '<p>Puedes estar en <b>varios grupos</b>. Tu <b>hándicap es uno solo</b> y es el mismo en todos.</p></details>';
  function pantallaBienvenida(email){
    mostrar(cabecera('¡Hola! 👋', 'Para jugar necesitas un grupo. Elige una de estas dos cosas:')
      + '<button type="button" class="cg-camino" id="cgTengoInv"><span class="cg-camino-ico" aria-hidden="true">📩</span>'
      +   '<span class="cg-camino-txt"><b>Tengo una invitación</b><small>Un amigo te ha mandado un enlace o un código. Entras en su grupo.</small></span><i aria-hidden="true">›</i></button>'
      + '<button type="button" class="cg-camino" id="cgNuevoGrupo"><span class="cg-camino-ico" aria-hidden="true">⛳</span>'
      +   '<span class="cg-camino-txt"><b>Crear mi grupo</b><small>Empiezas tu propio grupo. Aunque estés solo, ya puedes jugar. Luego invitas a tus amigos.</small></span><i aria-hidden="true">›</i></button>'
      + queEsGrupo
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    $('cgTengoInv').onclick = () => pantallaTengoInvitacion(email, null);
    $('cgNuevoGrupo').onclick = () => botonNuevoGrupo(email, null);
    $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
  }
  // Saca el código de lo que peguen: el enlace entero, el mensaje de WhatsApp entero o solo el código
  function codigoDeTexto(t){
    const s = String(t || '').trim();
    const m = s.match(/unirse=([A-Za-z0-9]+)/i);
    if(m) return m[1].toUpperCase();
    const solo = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (solo.length >= 6 && solo.length <= 10 && s.length <= 14) ? solo : '';
  }
  // Escribir el código de la invitación (si no se abrió el enlace)
  function pantallaTengoInvitacion(email, perfil){
    mostrar(cabecera('📩 Tu invitación', 'Pega aquí lo que te mandó tu amigo. Vale el enlace entero o solo el código.')
      + '<div class="cg-ayuda"><b>¿Qué pego?</b><span>Puedes pegar el <b>enlace</b>, todo el <b>mensaje</b> o solo el <b>código</b>. La app busca el código sola.</span>'
      +   '<span>El código son 8 letras y números. Por ejemplo: <code>AB12CD34</code></span></div>'
      + '<label class="cg-lbl">Enlace o código<input id="cgCodigo" class="cg-codigo" type="text" autocapitalize="characters" autocomplete="off" placeholder="AB12CD34"></label>'
      + '<div id="cgHallado" class="cg-msg ok" style="display:none;"></div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgUnirme">Seguir</button>'
      + '<button type="button" class="cg-link" id="cgVolver">‹ Volver</button>');
    $('cgVolver').onclick = () => perfil ? pantallaMisGrupos(perfil) : pantallaBienvenida(email);
    const avisar = () => {
      const c = codigoDeTexto($('cgCodigo').value), h = $('cgHallado');
      if(c){ h.textContent = '✔ Código encontrado: ' + c; h.style.display = ''; msg(''); } else { h.style.display = 'none'; }
    };
    $('cgCodigo').oninput = avisar;
    $('cgCodigo').onpaste = () => setTimeout(avisar, 0);
    $('cgUnirme').onclick = () => {
      const c = codigoDeTexto($('cgCodigo').value);
      if(!c){ msg($('cgCodigo').value.trim() ? 'No encuentro el código. Pega el enlace o escribe solo las 8 letras y números.' : 'Pega el enlace o escribe el código.'); return; }
      try { localStorage.setItem('acgolfInvitacion', c); } catch(e){}
      pantallaUnirse(email || (perfil && perfil.email), c);
    };
  }
  // Mi hándicap global (null si aún no tengo): así no se pregunta otra vez al entrar en otro grupo
  async function miHcpGlobal(){
    try { const r = await client.rpc('mi_hcp_global'); return (!r.error && r.data && r.data.hcp != null) ? r.data : null; } catch(e){ return null; }
  }
  const comaHcp = v => String(Math.round(Number(v) * 10) / 10).replace('.', ',');

  // Mis grupos: cambiar de grupo, unirse con una invitación o crear uno nuevo (ya no hay espacio personal)
  async function pantallaMisGrupos(perfil){
    mostrar(cabecera('Mis grupos', 'Cargando…'));
    let grupos = [];
    try { const r = await client.rpc('mis_grupos'); if(r.error) throw r.error; grupos = r.data || []; } catch(e){}
    const hg = await miHcpGlobal();
    mostrar(cabecera('Mis grupos', 'Toca un grupo para entrar en él. Cada grupo tiene sus partidas y su clasificación.')
      + (hg ? '<div class="cg-hcp-global"><span>Tu hándicap</span><b>' + comaHcp(hg.hcp) + '</b><small>Es el mismo en todos tus grupos y se actualiza con todas tus partidas.</small></div>' : '')
      + '<div class="cg-grupos">' + grupos.map(g => '<button type="button" class="cg-grupo' + (g.activo ? ' on' : '') + '" data-g="' + esc(g.id) + '">'
          + '<b>🏆 ' + esc(g.nombre) + '</b>'
          + '<span>' + (g.miembro === false ? 'Entras solo para revisarlo: no juegas ni sales en él' : 'Juegas como ' + esc(g.jugador) + (g.es_admin ? ' · Eres el administrador' : '')) + '</span>'
          + (g.admins && g.admins.length ? '<span class="cg-grupo-adm">' + (g.admins.length > 1 ? 'Administradores: ' : 'Administrador: ') + esc(g.admins.join(', ')) + '</span>' : '')
          + (g.activo ? '<i>Estás aquí</i>' : '') + '</button>'
          + (g.es_admin && g.id !== '00000000-0000-0000-0000-000000000001' ? '<button type="button" class="cg-borrar-g" data-g="' + esc(g.id) + '">Borrar «' + esc(g.nombre) + '»' + (g.admins && g.admins.length ? ' (' + esc(g.admins.join(', ')) + ')' : '') + '</button>' : '')).join('') + '</div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<div class="cg-sep">¿Otro grupo?</div>'
      + '<button type="button" class="cg-camino" id="cgTengoInv"><span class="cg-camino-ico" aria-hidden="true">📩</span>'
      +   '<span class="cg-camino-txt"><b>Tengo una invitación</b><small>Entras en el grupo de un amigo.</small></span><i aria-hidden="true">›</i></button>'
      + '<button type="button" class="cg-camino" id="cgNuevoGrupo"><span class="cg-camino-ico" aria-hidden="true">⛳</span>'
      +   '<span class="cg-camino-txt"><b>Crear un grupo nuevo</b><small>Tú serás el administrador e invitarás a quien quieras.</small></span><i aria-hidden="true">›</i></button>'
      + queEsGrupo
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    gate.querySelectorAll('.cg-grupo').forEach(b => b.onclick = async () => {
      if(b.classList.contains('on')){ ocultar(); return; }
      b.disabled = true;
      const { error } = await client.rpc('cambiar_grupo', { p_grupo: b.dataset.g });
      if(error){ b.disabled = false; msg(traducir(error)); return; }
      location.reload();
    });
    gate.querySelectorAll('.cg-borrar-g').forEach(b => b.onclick = () => {
      const g = grupos.find(x => x.id === b.dataset.g); if(g) pantallaBorrarGrupo(perfil, g);
    });
    $('cgTengoInv').onclick = () => pantallaTengoInvitacion(perfil.email, perfil);
    $('cgNuevoGrupo').onclick = () => botonNuevoGrupo(perfil.email, perfil);
  }

  // Borrar un grupo entero (solo su administrador; Los Iscariotes no se pueden borrar)
  function pantallaBorrarGrupo(perfil, g){
    mostrar(cabecera('Borrar «' + esc(g.nombre) + '»', 'Se borran el grupo, sus jugadores, sus partidas, sus hándicaps y sus ligas. Los demás miembros dejarán de verlo.')
      + '<p class="cg-p"><b>No se puede deshacer desde la app.</b></p>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn danger" id="cgBorrarSi">Borrar el grupo para siempre</button>'
      + '<button type="button" class="cg-link" id="cgVolver">No, volver</button>');
    $('cgVolver').onclick = () => pantallaMisGrupos(perfil);
    $('cgBorrarSi').onclick = e => ocupado(e.target, async () => {
      // Sin escribir el nombre (decisión de Carlos): basta con confirmar
      const { error } = await client.rpc('borrar_grupo', { p_grupo: g.id, p_nombre: g.nombre });
      if(error){ msg(traducir(error)); return; }
      mostrar(cabecera('Grupo borrado', '«' + esc(g.nombre) + '» ya no existe.')
        + '<button type="button" class="cg-btn" onclick="location.reload()">Seguir</button>');
    });
  }

  async function pantallaCompletar(email, iscariotes){
    if(codigoAdmin()){ pantallaCodigoAdmin(email, null, codigoAdmin()); return; }
    if(invitacion()){ pantallaUnirse(email, invitacion()); return; }
    if(!iscariotes){ pantallaBienvenida(email); return; }   // (la lista «¿Quién eres?» de Los Iscariotes ya no se ofrece al darse de alta)
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
      + '<button type="button" class="cg-link" id="cgVolverB">‹ Volver</button>'
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    $('cgVolverB').onclick = () => pantallaBienvenida(email);
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

  // ---------- Asistente: montar la portada del grupo ----------
  // Sale solo la primera vez que el administrador entra en un grupo nuevo (y desde «Mi cuenta» cuando quiera cambiarla).
  // ---------- Planes del grupo ----------
  // Crear grupo: elegir plan → activarlo → «Crear tu grupo». ACGolf Par 11 · Birdie 30 · Eagle 50 · Club sin límite. Gratis por ahora.
  const RANGO_PLAN = p => p.max == null ? 'Jugadores sin límite' : 'De 0 a ' + p.max + ' jugadores';
  const MAX_PLAN = p => p.max == null ? 'jugadores sin límite' : 'hasta ' + p.max + ' jugadores';
  // info: lo que da mi_plan (cambiar el plan de mi grupo) o { nuevo:true, email, perfil, planes } (crear un grupo)
  function pantallaPlanes(info, elegido){
    const planes = info.planes || [];
    const sel = elegido || info.plan || '';
    const sub = info.nuevo ? 'Según cuántos jugadores vais a ser. Podréis cambiar a uno más grande cuando queráis.'
      : 'Según cuántos jugadores vais a ser en «' + esc(info.grupo) + '». Podéis cambiar a uno más grande cuando queráis.';
    mostrar(cabecera(info.nuevo ? 'Crea tu grupo: elige el plan' : 'Plan del grupo', sub)
      + '<div class="pl-lista" role="radiogroup" aria-label="Planes">' + planes.map(p => {
          const pequeno = p.max != null && (info.usados || 0) > p.max;
          return '<label class="pl-op' + (pequeno ? ' off' : '') + '">'
            + '<input type="radio" name="plPlan" value="' + esc(p.id) + '"' + (p.id === sel ? ' checked' : '') + (pequeno ? ' disabled' : '') + '>'
            + '<span class="pl-clip" aria-hidden="true"></span>'
            + '<span class="pl-txt"><b>' + esc(p.nombre) + '</b><small>' + RANGO_PLAN(p) + '</small></span>'
            + '<span class="pl-precio gratis">Gratis</span></label>';
        }).join('') + '</div>'
      + (!info.nuevo && info.plan && info.estado === 'activo' ? '<p class="cg-p" style="font-size:16px;">Ahora tenéis ' + esc((planes.find(x => x.id === info.plan) || {}).nombre || '') + ' · ' + esc(info.usados) + ' jugadores con cuenta.</p>' : '')
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="plSeguir">Continuar</button>'
      + (info.nuevo || info.estado === 'activo' ? '<button type="button" class="cg-link" id="plVolver">Volver</button>'
          : '<button type="button" class="cg-link" id="plSalir">Salir de mi cuenta</button>'));
    if($('plSalir')) $('plSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
    if($('plVolver')) $('plVolver').onclick = () => info.nuevo ? pantallaCrearGrupoPlan(info) : (window.miPerfil ? panelMiCuenta(window.miPerfil) : ocultar());
    $('plSeguir').onclick = e => ocupado(e.target, async () => {
      const r = document.querySelector('input[name="plPlan"]:checked');
      if(!r){ msg('Elige un plan tocando en él.'); return; }
      if(info.nuevo){ pantallaCrearGrupoPlan(Object.assign({}, info, { plan: r.value })); return; }
      const { data, error } = await client.rpc('elegir_plan', { p_plan: r.value });
      if(error){ msg(traducir(error)); return; }
      if(data.estado === 'activo'){ pantallaPagoHecho(data); return; }   // mismo plan que ya tenía
      pantallaPago(data);
    });
  }

  function pantallaPago(info){
    const p = (info.planes || []).find(x => x.id === info.plan) || {};
    mostrar(cabecera('Activar el plan', info.nuevo ? 'Para tu grupo nuevo' : 'Grupo «' + esc(info.grupo) + '»')
      + '<div class="pl-resumen"><b>' + esc(p.nombre || '') + '</b><span>' + RANGO_PLAN(p) + '</span><em>Gratis</em></div>'
      + '<div class="pl-pasarela"><b>Sin pagos</b><span>De momento todos los planes son gratis. No tienes que pagar nada.</span></div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="plPagar">Activar el plan</button>'
      + '<button type="button" class="cg-link" id="plCambiar">Cambiar de plan</button>');
    $('plCambiar').onclick = () => pantallaPlanes(info, info.plan);
    $('plPagar').onclick = e => ocupado(e.target, async () => {
      if(info.nuevo){ pantallaCrearGrupoPlan(info); return; }   // grupo nuevo: el plan queda activo al crear el grupo
      const { data, error } = await client.rpc('confirmar_pago_simulado');
      if(error){ msg(traducir(error)); return; }
      pantallaPagoHecho(data);
    });
  }

  // Tras activar el plan: crear el grupo (sin código de administrador)
  function pantallaCrearGrupoPlan(info){
    const p = (info.planes || []).find(x => x.id === info.plan) || {};
    const sinCuenta = !info.perfil;
    const hg = info.hg || null;
    mostrar(cabecera('⛳ Crear tu grupo', 'Solo tres datos y listo. Tú serás el administrador.')
      + '<ol class="cg-pasos-txt"><li>Pon un nombre a tu grupo.</li><li>Escribe tu nombre' + (hg ? '' : ' y tu hándicap') + '.</li><li>Toca «Crear el grupo». Luego invitas a tus amigos con un enlace.</li></ol>'
      + '<label class="cg-lbl">Nombre del grupo<small>Por ejemplo: Los del sábado</small><input id="cgGrupo" type="text" maxlength="40"></label>'
      + '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name" value="' + esc(info.perfil ? info.perfil.player_name || '' : '') + '"></label>'
      + (hg ? '<div class="cg-hcp-global"><span>Tu hándicap</span><b>' + comaHcp(hg.hcp) + '</b><small>Es el de siempre: el mismo en todos tus grupos.</small></div>'
            : '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4. Si no tienes, pon 36</small><input id="cgHcp" type="text" inputmode="decimal"></label>')
      + (sinCuenta ? aceptoHtml : '') + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgCrearGrupo">Crear el grupo</button>'
      + '<button type="button" class="cg-link" id="cgVolverCg">‹ Volver</button>');
    $('cgVolverCg').onclick = () => info.perfil ? pantallaMisGrupos(info.perfil) : pantallaBienvenida(info.email);
    $('cgCrearGrupo').onclick = e => ocupado(e.target, async () => {
      const grupo = $('cgGrupo').value.trim(), nombre = $('cgNombre').value.trim(), hcp = hg ? null : leerHcp('cgHcp');
      if(!grupo){ msg('Ponle un nombre al grupo.'); return; }
      if(!nombre){ msg('Escribe tu nombre.'); return; }
      if(!hg && hcp === null){ msg('Escribe tu hándicap.'); return; }
      if($('cgAcepto') && !$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      const { error } = await client.rpc('crear_grupo_con_plan', { p_plan: info.plan, p_nombre: grupo, p_player: nombre, p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      olvidarCodigoAdmin();
      location.reload();
    });
  }

  async function empezarGrupoNuevo(email, perfil){
    mostrar(cabecera('Crear tu grupo', 'Cargando…'));
    let planes = [];
    try { const r = await client.rpc('planes_acgolf'); if(!r.error) planes = r.data || []; } catch(e){}
    if(!planes.length){ mostrar(cabecera('Sin conexión', 'No se han podido cargar los planes.') + '<button type="button" class="cg-btn" onclick="location.reload()">Reintentar</button>'); return; }
    const hg = perfil ? await miHcpGlobal() : null;
    // Se empieza con el plan más pequeño (gratis); si sois más, se cambia luego desde «Mi cuenta»
    pantallaCrearGrupoPlan({ nuevo: true, email, perfil, planes, usados: 0, plan: (planes[planes.length - 1] || {}).id || 'club', hg });
  }

  function pantallaPagoHecho(info){
    const p = (info.planes || []).find(x => x.id === info.plan) || {};
    mostrar(cabecera('¡Plan activado!', 'Tu grupo «' + esc(info.grupo) + '» tiene ' + esc(p.nombre || '') + '.')
      + '<div class="pl-resumen"><b>' + esc(p.nombre || '') + '</b><span>Tu grupo admite ' + MAX_PLAN(p) + '.</span></div>'
      + '<button type="button" class="cg-btn" id="plEntrar">Volver a la app</button>');
    $('plEntrar').onclick = () => location.reload();
  }
  window.acgolfPlanes = {
    abrir: async () => { try { const r = await client.rpc('mi_plan'); if(!r.error && r.data && r.data.es_admin) pantallaPlanes(r.data); } catch(e){} }
  };

  // ---------- Bienvenida al grupo nuevo: qué hacer, en dos pasos y muy claro ----------
  const claveBienvenida = perfil => 'acgolfBienvenidaGrupo:' + (perfil.grupo_id || perfil.grupo || '');
  function bienvenidaVista(perfil){ try { return localStorage.getItem(claveBienvenida(perfil)) === '1'; } catch(e){ return true; } }
  // Primera vez dentro: resumen de lo que hace la app y un botón grande para entrar
  const BV_ICO = {
    partida: '<path d="M5 22V3"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
    clasif: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    caddie: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12Z"/><path d="M8.5 11h7"/><path d="M8.5 14.5h4"/>',
    directo: '<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9"/><path d="M16.5 7.5a6.4 6.4 0 0 1 0 9"/><path d="M4.5 4.5a10.6 10.6 0 0 0 0 15"/><path d="M19.5 4.5a10.6 10.6 0 0 1 0 15"/>',
    grafica: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M17.5 13.6a5 5 0 0 1 4 4.9"/>',
  };
  const BV_ITEMS = [
    ['partida', 'Apunta tu partida', 'Tus golpes hoyo a hoyo, con la tarjeta del campo.'],
    ['clasif', 'Quién gana', 'Cada semana, por golpes menos hándicap.'],
    ['caddie', 'Curro y Lola', 'Tus caddies te comentan cada hoyo, con voz.'],
    ['directo', 'En directo', 'Tus amigos siguen la partida desde su móvil.'],
    ['grafica', '¿Cómo jugué?', 'Gráficas de tu juego y de cómo mejoras.'],
    ['grupo', 'Grupos y amigos', 'Organiza partidos e invita con un enlace.'],
  ];
  async function bienvenidaGrupo(perfil){
    const nombre = String(perfil.player_name || '').split(' ')[0];
    const vista = () => { try { localStorage.setItem(claveBienvenida(perfil), '1'); } catch(e){} };
    mostrar('<div class="bv">'
      + '<div class="bv-hero">'
      +   '<div class="bv-eyebrow">Bienvenido a acgolf</div>'
      +   '<h1 class="bv-titulo">Tu golf,<br>con tus amigos.</h1>'
      +   '<p class="bv-sub">' + (nombre ? esc(nombre) + ', ' : '') + 'tu grupo <b>«' + esc(perfil.grupo || 'Tu grupo') + '»</b> ya está listo. Esto es lo que puedes hacer:</p>'
      + '</div>'
      + '<div class="bv-grid">' + BV_ITEMS.map(it => '<div class="bv-it"><span class="bv-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + BV_ICO[it[0]] + '</svg></span>'
          + '<b>' + it[1] + '</b><small>' + it[2] + '</small></div>').join('') + '</div>'
      + '<div class="bv-manual"><span class="bv-manual-ico" aria-hidden="true">📖</span><div><b>¿Alguna duda?</b><small>En la página principal tienes el botón <b>«Manual de la app»</b>. Te lo explica todo paso a paso, con palabras sencillas.</small></div></div>'
      + '<button type="button" class="bv-entrar" id="cgBvOk">Entrar en la app <span aria-hidden="true">›</span></button>'
      + '<button type="button" class="cg-link" id="cgBvManual">Ver el manual ahora</button>'
      + '</div>');
    $('cgBvOk').onclick = () => { vista(); ocultar(); };
    $('cgBvManual').onclick = () => { vista(); ocultar(); setTimeout(() => { if(window.acgolfManual) window.acgolfManual.abrir(); }, 250); };
  }

  function asistentePortada(perfil, desdeCuenta){
    const P = window.acgolfPortada;
    if(!P){ ocultar(); return; }
    const st = P.marcaDe(perfil);
    const TOTAL = 4;
    const barra = n => '<div class="pg-pasos" aria-label="Paso ' + n + ' de ' + TOTAL + '">'
      + Array.from({ length: TOTAL }, (_, i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</div>'
      + '<div class="pg-paso-n">Paso ' + n + ' de ' + TOTAL + '</div>';
    const cab = (n, titulo, sub) => '<div class="cg-head pg-head">' + barra(n)
      + '<div class="cg-eyebrow">' + esc(perfil.grupo) + '</div><h1 class="cg-title">' + titulo + '</h1>'
      + (sub ? '<p class="cg-sub">' + sub + '</p>' : '') + '</div>';
    const salir = desdeCuenta ? '<button type="button" class="cg-link" id="pgSalir">Dejarlo como está</button>' : '';
    const ponerSalir = () => { const b = $('pgSalir'); if(b) b.onclick = () => { const g = P.marcaDe(perfil); P.tonos(g.color, g.fondo); ocultar(); }; };

    function paso1(){
      mostrar(cab(1, 'Elegid vuestro escudo', 'Lo hacemos con las iniciales del grupo. Podéis cambiar las letras.')
        + '<label class="cg-lbl">Iniciales<small>Hasta 3 letras</small><input id="pgIni" type="text" maxlength="3" autocapitalize="characters" value="' + esc(st.iniciales) + '"></label>'
        + '<div class="pg-escudos" id="pgEscudos"></div>'
        + '<button type="button" class="cg-btn" id="pgSig">Siguiente: los colores</button>' + salir);
      const pintar = () => {
        $('pgEscudos').innerHTML = P.ESCUDOS.map(e => '<button type="button" class="pg-op' + (e.id === st.escudo ? ' on' : '') + '" data-e="' + e.id + '">'
          + P.escudo(e.id, st.iniciales, st.color, 84) + '<span>' + esc(e.n) + '</span></button>').join('');
        gate.querySelectorAll('.pg-op').forEach(b => b.onclick = () => { st.escudo = b.dataset.e; pintar(); });
      };
      pintar();
      $('pgIni').oninput = e => { st.iniciales = e.target.value.replace(/[^A-Za-zÑñ0-9]/g, '').toUpperCase() || P.iniciales(perfil.grupo); pintar(); };
      $('pgSig').onclick = paso2; ponerSalir();
    }

    function paso2(){
      mostrar(cab(2, 'Los colores de la app', 'Elegid el tono de fondo y vuestro color. La app entera cambia mientras elegís.')
        + '<div class="pg-sub">Tono de fondo</div><div class="pg-fondos" id="pgFondos"></div>'
        + '<div class="pg-sub">Vuestro color</div><div class="pg-colores" id="pgColores"></div>'
        + '<div class="pg-muestra" id="pgMuestra"></div>'
        + '<button type="button" class="cg-btn" id="pgSig">Siguiente: vuestro campo</button>'
        + '<button type="button" class="cg-link" id="pgAtras">‹ Atrás</button>');
      const pintar = () => {
        P.tonos(st.color, st.fondo);
        $('pgFondos').innerHTML = P.FONDOS.map(f => '<button type="button" class="pg-fondo' + (f.id === st.fondo ? ' on' : '') + '" data-f="' + f.id + '" style="--f0:' + f.t[0] + ';--f1:' + f.t[2] + ';--c:' + st.color + '">'
          + '<i><b></b><b></b><s></s></i><span>' + esc(f.n) + '</span></button>').join('');
        $('pgColores').innerHTML = P.COLORES.map(c => '<button type="button" class="pg-color' + (c.c === st.color ? ' on' : '') + '" data-c="' + c.c + '" style="--c:' + c.c + '"><i></i><span>' + esc(c.n) + '</span></button>').join('');
        $('pgMuestra').innerHTML = P.escudo(st.escudo, st.iniciales, st.color, 96);
        gate.querySelectorAll('.pg-fondo').forEach(b => b.onclick = () => { st.fondo = b.dataset.f; pintar(); });
        gate.querySelectorAll('.pg-color').forEach(b => b.onclick = () => { st.color = b.dataset.c; pintar(); });
      };
      pintar();
      $('pgSig').onclick = paso3; $('pgAtras').onclick = paso1;
    }

    function paso3(){
      mostrar(cab(3, 'Dónde jugáis', 'Sale encima del nombre del grupo. El patrocinador es opcional.')
        + '<label class="cg-lbl">Campo donde soléis jugar<small>Por ejemplo: Hato Verde</small><input id="pgCampo" type="text" maxlength="40" value="' + esc(st.campo) + '"></label>'
        + '<label class="cg-lbl">Temporada<small>Por ejemplo: Liga 2026</small><input id="pgTemp" type="text" maxlength="20" value="' + esc(st.temporada) + '"></label>'
        + '<label class="cg-lbl">Patrocinador (opcional)<small>Un bar, una tienda, un amigo con negocio…</small><input id="pgPatro" type="text" maxlength="40" value="' + esc(st.patrocinador) + '"></label>'
        + '<button type="button" class="cg-btn" id="pgSig">Ver cómo queda</button>'
        + '<button type="button" class="cg-link" id="pgAtras">‹ Atrás</button>');
      const leer = () => { st.campo = $('pgCampo').value.trim(); st.temporada = $('pgTemp').value.trim(); st.patrocinador = $('pgPatro').value.trim(); };
      $('pgSig').onclick = () => { leer(); paso4(); };
      $('pgAtras').onclick = () => { leer(); paso2(); };
    }

    function paso4(){
      const pal = String(perfil.grupo || '').trim().split(/\s+/);
      const titulo = pal.length > 1 ? esc(pal[0]) + '<br><span>' + esc(pal.slice(1).join(' ')) + '</span>' : '<span>' + esc(perfil.grupo) + '</span>';
      mostrar(cab(4, 'Así queda vuestra portada', 'Si os gusta, guardadla. Se puede cambiar cuando queráis desde «Mi cuenta».')
        + '<div class="pg-vista" style="--grupo-color:' + st.color + '">'
        +   '<div class="pg-vista-cab">' + P.escudo(st.escudo, st.iniciales, st.color, 92)
        +     '<div><div class="pg-vista-eb">' + esc([st.campo, st.temporada].filter(Boolean).join(' · ')) + '</div><div class="pg-vista-t">' + titulo + '</div></div></div>'
        +   (st.patrocinador ? '<div class="pg-vista-patro">Patrocina <b>' + esc(st.patrocinador) + '</b></div>' : '')
        +   '<div class="pg-vista-btn">Crear partida</div>'
        + '</div>'
        + '<div id="cgMsg" class="cg-msg"></div>'
        + '<button type="button" class="cg-btn" id="pgGuardar">Guardar la portada</button>'
        + '<button type="button" class="cg-link" id="pgAtras">‹ Cambiar algo</button>');
      $('pgAtras').onclick = paso3;
      $('pgGuardar').onclick = e => ocupado(e.target, async () => {
        const { data, error } = await client.rpc('guardar_marca', { p_marca: st });
        if(error){ msg(traducir(error)); return; }
        perfil.grupo_marca = data;
        if(desdeCuenta){ P.aplicar(perfil); ocultar(); return; }
        pasoInvitar();
      });
    }

    // Último paso del alta: invitar a los demás
    async function pasoInvitar(){
      mostrar('<div class="cg-head">' + P.escudo(st.escudo, st.iniciales, st.color, 84)
        + '<div class="cg-eyebrow">' + esc(perfil.grupo) + '</div><h1 class="cg-title">¡Grupo listo!</h1>'
        + '<p class="cg-sub">Ahora manda el enlace a tus compañeros. Al abrirlo y crear su cuenta, entran directamente en el grupo.</p></div>'
        + '<div class="cg-invita" id="cgInvita"><div class="cg-p">Cargando enlace…</div></div>'
        + '<div id="cgMsg" class="cg-msg"></div>'
        + '<button type="button" class="cg-btn" id="pgEntrar">Entrar en la app</button>');
      $('pgEntrar').onclick = () => location.reload();
      try {
        const r = await client.rpc('invitacion_de_mi_grupo', { p_nuevo: false });
        const inv = r.data; const box = $('cgInvita');
        if(!inv || !box){ if(box) box.remove(); return; }
        const enlace = APP_PRUEBAS + '?unirse=' + encodeURIComponent(inv.codigo);
        const texto = '⛳ Te invito a «' + inv.grupo + '» en acgolf, la app de golf entre amigos.\n\n1️⃣ Pulsa este enlace y crea tu cuenta:\n' + enlace + '\n\n2️⃣ Si la app te pide un código, escribe solo esto:\n' + inv.codigo;
        box.innerHTML = '<b>Invita a tus amigos a «' + esc(inv.grupo) + '»</b>'
          + '<div class="cg-enlace">' + esc(enlace) + '</div>'
          + '<a class="cg-btn" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
          + (window.acgolfQR ? '<div class="qr-caja"><b>Código QR de tu grupo</b><img id="cgQR" alt="Código QR para unirse a «' + esc(inv.grupo) + '»"><small>Ya está hecho: imprímelo o enséñalo en el móvil. Al escanearlo entran directamente en el grupo.</small>'
              + '<a class="cg-btn ghost" id="cgQRBajar" download="QR-' + esc(String(inv.grupo).replace(/[^\wÀ-ÿ]+/g, '-')) + '.png">Descargar el QR</a></div>' : '')
          + '<p class="cg-p" style="font-size:16px;margin-top:4px;">El enlace y el QR también los tienes siempre en «Mi cuenta».</p>';
        if(window.acgolfQR && $('cgQR')){ try { const png = window.acgolfQR.lamina(enlace, inv.grupo); $('cgQR').src = png; $('cgQRBajar').href = png; } catch(e){ const c = box.querySelector('.qr-caja'); if(c) c.remove(); } }
      } catch(e){ const box = $('cgInvita'); if(box) box.remove(); }
    }

    paso1();
  }

  // ---------- Paneles de administración (roles) ----------
  // super_admin: todos los grupos y usuarios · group_admin: los miembros de su grupo
  const fecha = d => d ? new Date(d).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' }) : '';
  const ROL = { group_admin: 'Administrador', user: 'Jugador' };

  // Panel general: todo ordenado en botones; cada uno abre su pantalla (con «‹ Volver al panel»)
  function pantallaPanel(perfil){
    const B = (id, ico, tit, sub, pri) => '<button type="button" class="pn-b' + (pri ? ' pri' : '') + '" id="' + id + '"><i>' + ico + '</i><b>' + tit + '</b><span>' + sub + '</span></button>';
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Panel general</h1><p class="cg-sub">Elige qué quieres hacer</p></div>'
      + '<div class="pn-grid">'
      + B('pnEst', '📈', 'Estadísticas', 'Seguimiento, de dónde vienen y visitas', true)
      + B('pnPro', '📣', 'Promociones', 'Correos a los jugadores y avisos en redes', true)
      + B('pnAvi', '🔔', 'Avisos', 'Quién tiene los avisos del móvil')
      + B('pnRes', '🎬', 'Resúmenes', 'El plató de cualquier partida')
      + B('pnGru', '👥', 'Grupos', 'Crear, entrar y miembros')
      + B('pnUsu', '🙋', 'Usuarios', 'Roles y bajas')
      + B('pnCod', '🔑', 'Códigos', 'Códigos de administrador')
      + B('pnCam', '⛳', 'Campos', 'Greens en el mapa')
      + '</div><button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    $('pnEst').onclick = () => pantallaSuper(perfil, 'seguimiento');
    $('pnPro').onclick = () => pantallaMenuPromos(perfil);
    $('pnAvi').onclick = () => pantallaSuper(perfil, 'avisos');
    $('pnRes').onclick = () => pantallaResumenes(perfil);
    $('pnGru').onclick = () => pantallaSuper(perfil, 'grupos');
    $('pnUsu').onclick = () => pantallaSuper(perfil, 'usuarios');
    $('pnCod').onclick = () => pantallaSuper(perfil, 'codigos');
    $('pnCam').onclick = () => { ocultar(); if(typeof gmAbrir === 'function') gmAbrir(); };
  }

  // Promociones: todo lo de comunicar con los jugadores
  function pantallaMenuPromos(perfil){
    const B = (id, ico, tit, sub, pri) => '<button type="button" class="pn-b pn-fila' + (pri ? ' pri' : '') + '" id="' + id + '"><i>' + ico + '</i><div><b>' + tit + '</b><span>' + sub + '</span></div></button>';
    mostrar('<button type="button" class="pn-atras" id="paAtras">‹ Volver al panel</button>'
      + '<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Promociones</h1><p class="cg-sub">Llega a tus jugadores</p></div>'
      + '<div id="cgMsg" class="cg-msg"></div><div class="pn-lista">'
      + B('pmGuia', '📋', 'Guía de los correos', 'A quién va cada correo y cuándo', true)
      + B('pmEnviar', '✉️', 'Enviar un correo', 'Elige el correo y a quién va, o escribe uno libre', true)
      + B('pmPrueba', '🧪', 'Mandarme un correo de prueba', 'Para ver cómo llega a tu móvil')
      + B('pmRedes', '📲', 'Avisar en el móvil: síguenos en redes', 'Aviso a todos los que tienen activados los avisos')
      + B('pmEnviado', '🕘', 'Lo enviado', 'Qué promociones se mandaron, cuándo y a cuántos')
      + '</div><div id="paRedesMsg" class="cg-msg"></div>');
    $('paAtras').onclick = () => pantallaSuper(perfil);
    $('pmGuia').onclick = () => pantallaGuiaCorreos(perfil);
    $('pmEnviar').onclick = () => pantallaPromociones(perfil);
    $('pmEnviado').onclick = () => pantallaEnviado(perfil);
    $('pmPrueba').onclick = e => ocupado(e.currentTarget, async () => {
      const { data, error } = await client.functions.invoke('avisar', { body: { prueba: true } });
      if(error || !data || !data.enviados){ msg('No se pudo mandar. ' + ((data && data.error) || (error && error.message) || '')); return; }
      msg('Enviado a ' + data.a + '. Mira tu correo en un minuto.', true);
    });
    $('pmRedes').onclick = e => ocupado(e.currentTarget, async () => {
      if(!confirm('¿Mandar ahora el aviso de redes a todos los jugadores con avisos activados en el móvil?')) return;
      const elRedes = $('paRedesMsg');
      const msgRedes = (txt, ok) => { if(elRedes){ elRedes.textContent = txt || ''; elRedes.className = 'cg-msg' + (ok ? ' ok' : ''); } };
      if(!window.acgolfAvisosMovil || !window.acgolfAvisosMovil.avisarRedes){ msgRedes('No está disponible ahora mismo.'); return; }
      const d = await window.acgolfAvisosMovil.avisarRedes();
      if(!d || d.error){ msgRedes((d && d.error) || 'No se pudo mandar el aviso.'); return; }
      msgRedes('✅ Avisados ' + (d.enviados || 0) + (d.enviados === 1 ? ' móvil' : ' móviles') + '.', true);
    });
  }

  // Lo enviado: registro de las promociones por correo
  async function pantallaEnviado(perfil){
    mostrar('<button type="button" class="pn-atras" id="paAtras">‹ Volver a Promociones</button><div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Lo enviado</h1><p class="cg-sub">Cargando…</p></div>');
    $('paAtras').onclick = () => pantallaMenuPromos(perfil);
    const r = await client.rpc('sa_promos_enviadas');
    if(r.error){ mostrar(cabecera('No se pudo abrir', traducir(r.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => pantallaMenuPromos(perfil); return; }
    const lista = r.data || [];
    const alc = { todos: 'A todos', grupo: 'A un grupo', persona: 'A una persona' };
    mostrar('<button type="button" class="pn-atras" id="paAtras">‹ Volver a Promociones</button>'
      + '<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Lo enviado</h1><p class="cg-sub">' + lista.length + (lista.length === 1 ? ' envío' : ' envíos') + '</p></div>'
      + (lista.length ? '<div class="pa-lista">' + lista.map(x => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(x.asunto || 'Sin asunto') + '</b>'
          + '<span>' + esc(alc[x.alcance] || x.alcance || '') + (x.grupo ? ' · ' + esc(x.grupo) : '') + ' · ' + x.correos + (x.correos === 1 ? ' persona' : ' personas') + '</span>'
          + '<span>' + fecha(x.enviado_en) + '</span></div></div>').join('') + '</div>'
        : '<p class="cg-p" style="font-size:16px;">Todavía no se ha enviado ninguna promoción.</p>')
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a Promociones</button>');
    $('paAtras').onclick = $('cgCerrar').onclick = () => pantallaMenuPromos(perfil);
  }

  async function pantallaSuper(perfil, pestana){
    if(!pestana){ pantallaPanel(perfil); return; }
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Panel general</h1></div><p class="cg-p">Cargando…</p>');
    const r = pestana === 'seguimiento' ? { data: [] } : await client.rpc(pestana === 'grupos' ? 'sa_grupos' : pestana === 'codigos' ? 'sa_codigos_admin' : pestana === 'avisos' ? 'sa_avisos_movil' : 'sa_usuarios');
    if(r.error){ mostrar(cabecera('No se pudo abrir', traducir(r.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>'); $('cgCerrar').onclick = ocultar; return; }
    const datos = r.data || [];
    let gruposLiga = [];
    if(pestana === 'codigos'){ try { const rg = await client.rpc('sa_grupos'); gruposLiga = (rg.data || []).filter(g => g.tipo !== 'personal'); } catch(e){} }
    let cuerpo = '';
    if(pestana === 'seguimiento'){
      cuerpo = '<div id="sgPanel"></div><a class="cg-btn ghost" href="https://cloud.umami.is/" target="_blank" rel="noopener">📊 Ver visitas (Umami)</a>';
    } else if(pestana === 'grupos'){
      cuerpo = '<div class="pa-lista">' + datos.map(g => '<div class="pa-fila">'
          + '<div class="pa-fila-t"><b>' + esc(g.nombre) + '</b><span>' + 'Grupo' + ' · ' + g.miembros + ' miembro' + (g.miembros === 1 ? '' : 's') + ' · desde ' + fecha(g.creado) + '</span>'
          + '<span>Admin: ' + (g.admins.length ? esc(g.admins.join(', ')) : '<i>sin administrador</i>') + '</span></div>'
          + '<div class="pa-acc"><button type="button" class="pa-b" data-entrar-grupo="' + esc(g.id) + '" data-n="' + esc(g.nombre) + '">Entrar</button>'
          + '<button type="button" class="pa-b" data-miembros="' + esc(g.id) + '" data-n="' + esc(g.nombre) + '">Miembros</button>'
          + (g.id !== '00000000-0000-0000-0000-000000000001' ? '<button type="button" class="pa-b rojo" data-borrar="' + esc(g.id) + '" data-n="' + esc(g.nombre) + '">Borrar</button>' : '')
          + '</div></div>').join('') + '</div>'
        + '<div class="cg-sep">Crear un grupo nuevo</div>'
        + '<label class="cg-lbl">Nombre del grupo<input id="paNombre" type="text" maxlength="40"></label>'
        + '<label class="cg-lbl">Correo de su administrador<small>Opcional. Tiene que tener ya cuenta en acgolf.</small><input id="paAdmin" type="email" autocapitalize="off"></label>'
        + '<button type="button" class="cg-btn ghost" id="paCrear">Crear el grupo</button>';
    } else if(pestana === 'codigos'){
      const estado = c => c.usado_en ? '✅ Usado por ' + esc(c.usado_por || '') + ' el ' + fecha(c.usado_en) + (c.grupo_creado ? ' · «' + esc(c.grupo_creado) + '»' : '')
        : new Date(c.caduca) <= new Date() ? '⛔ Anulado o caducado' : '⏳ Sin usar · vale hasta el ' + fecha(c.caduca);
      cuerpo = '<p class="cg-p" style="font-size:16px;">Crea un código y mándaselo a quien quieras hacer administrador. Sirve <b>una sola vez</b> y caduca a los 30 días.</p>'
        + '<label class="cg-lbl">¿Para qué es?<select id="paCodGrupo"><option value="">Para crear un grupo nuevo</option>'
        +   gruposLiga.map(g => '<option value="' + esc(g.id) + '">Administrador de «' + esc(g.nombre) + '»</option>').join('') + '</select></label>'
        + '<label class="cg-lbl">¿Para quién?<small>Una nota para acordarte. Por ejemplo: Paco</small><input id="paCodNota" type="text" maxlength="60"></label>'
        + '<button type="button" class="cg-btn" id="paCodCrear">Crear código</button>'
        + '<div id="paCodNuevo"></div>'
        + '<div class="cg-sep">Códigos creados</div>'
        + (datos.length ? '<div class="pa-lista">' + datos.map(c => {
            const vivo = !c.usado_en && new Date(c.caduca) > new Date();
            return '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(c.codigo) + (c.nota ? ' · ' + esc(c.nota) : '') + '</b>'
              + '<span>' + (c.grupo && !c.usado_en ? 'Administrador de «' + esc(c.grupo) + '»' : c.usado_en ? '' : 'Para crear un grupo nuevo') + '</span>'
              + '<span>' + estado(c) + '</span></div>'
              + (vivo ? '<div class="pa-acc"><button type="button" class="pa-b" data-enviar="' + esc(c.codigo) + '" data-gr="' + esc(c.grupo || '') + '">Enviar</button>'
                  + '<button type="button" class="pa-b rojo" data-anular="' + esc(c.codigo) + '">Anular</button></div>' : '')
              + '</div>'; }).join('') + '</div>'
          : '<p class="cg-p" style="font-size:16px;">Todavía no has creado ninguno.</p>');
    } else if(pestana !== 'avisos'){
      datos.sort((a, b) => (b.sin_nombre ? 1 : 0) - (a.sin_nombre ? 1 : 0));
      cuerpo = '<div class="pa-lista">' + datos.map(u => '<div class="pa-fila">'
          + '<div class="pa-fila-t"><b>' + esc(u.nombre) + (u.super ? ' <em class="pa-super">Super admin</em>' : '') + '</b><span>' + esc(u.email) + '</span>'
          + (u.sin_nombre ? '<span>' + (u.confirmado ? '⚠️ Confirmó el correo pero no terminó el alta' : '⏳ No ha confirmado su correo') + (u.creado ? ' · se apuntó el ' + fecha(u.creado) : '') + '</span>' : '')
          + (u.grupos.length ? u.grupos.map(g => '<label class="pa-rol">' + esc(g.nombre)
              + '<select data-u="' + esc(u.id) + '" data-g="' + esc(g.id) + '"><option value="user"' + (g.rol === 'user' ? ' selected' : '') + '>Jugador</option><option value="group_admin"' + (g.rol === 'group_admin' ? ' selected' : '') + '>Administrador</option></select></label>').join('')
            : '<span><i>Sin grupo todavía</i></span>')
          + '</div><div class="pa-acc">'
          + (u.sin_nombre && u.id !== (window.miPerfilId || '') ? '<button type="button" class="pa-b" data-reenviar="' + esc(u.email) + '" data-conf="' + (u.confirmado ? '1' : '0') + '">Reenviar correo</button>'
              + '<button type="button" class="pa-b rojo" data-borrar-u="' + esc(u.id) + '" data-e="' + esc(u.email) + '">Borrar</button>' : '')
          + '</div></div>').join('') + '</div>';
    }
    if(pestana === 'avisos'){
      const porGrupo = {};
      datos.forEach(x => { const k = x.grupo || 'Sin grupo'; (porGrupo[k] = porGrupo[k] || []).push(x); });
      const nombresGrupo = Object.keys(porGrupo).sort();
      cuerpo = '<p class="cg-p" style="font-size:16px;">' + datos.length + (datos.length === 1 ? ' persona' : ' personas') + ' con los avisos del móvil activados ahora mismo.</p>'
        + (nombresGrupo.length ? nombresGrupo.map(gn => '<div class="cg-sep">' + esc(gn) + '</div><div class="pa-lista">'
            + porGrupo[gn].map(x => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(x.jugador) + (x.es_admin ? ' <em class="pa-super">Admin</em>' : '') + '</b>'
                + '<span>' + x.moviles + (x.moviles === 1 ? ' móvil' : ' móviles') + ' · desde el ' + fecha(x.primera_vez) + '</span></div></div>').join('') + '</div>').join('')
          : '<p class="cg-p" style="font-size:16px;">Todavía nadie los tiene activados.</p>');
    }
    mostrar('<button type="button" class="pn-atras" id="paAtras">‹ Volver al panel</button><div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">' + ({ seguimiento: 'Estadísticas', grupos: 'Grupos', usuarios: 'Usuarios', codigos: 'Códigos', avisos: 'Avisos' }[pestana] || 'Panel') + '</h1>'
      + '<p class="cg-sub">' + (pestana === 'seguimiento' ? 'Nuevas incorporaciones y redes' : pestana === 'grupos' ? datos.length + ' grupos' : pestana === 'codigos' ? 'Códigos de administrador' : pestana === 'avisos' ? datos.length + ' con avisos activados' : datos.length + ' usuarios') + '</p></div>'
      + '<div id="cgMsg" class="cg-msg"></div>' + cuerpo
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver al panel</button>');
    $('cgCerrar').onclick = $('paAtras').onclick = () => pantallaSuper(perfil);
    if(pestana === 'seguimiento' && $('sgPanel') && window.acgolfSeguimiento) window.acgolfSeguimiento($('sgPanel'), client);
    gate.querySelectorAll('[data-miembros]').forEach(b => b.onclick = () => pantallaMiembros(perfil, b.dataset.miembros, b.dataset.n, true));
    gate.querySelectorAll('[data-entrar-grupo]').forEach(b => b.onclick = () => ocupado(b, async () => {
      const { error } = await client.rpc('cambiar_grupo', { p_grupo: b.dataset.entrarGrupo });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    }));
    gate.querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
      if(!confirm('¿Borrar «' + b.dataset.n + '» con todos sus jugadores y partidas para siempre?')) return;
      const { error } = await client.rpc('sa_borrar_grupo', { p_grupo: b.dataset.borrar });
      if(error){ msg(traducir(error)); return; }
      pantallaSuper(perfil, 'grupos');
    });
    if($('paCrear')) $('paCrear').onclick = e => ocupado(e.target, async () => {
      const nombre = $('paNombre').value.trim(); if(!nombre){ msg('Ponle un nombre al grupo.'); return; }
      const { error } = await client.rpc('sa_crear_grupo', { p_nombre: nombre, p_admin_email: $('paAdmin').value.trim() || null });
      if(error){ msg(traducir(error)); return; }
      pantallaSuper(perfil, 'grupos');
    });
    // Códigos de administrador
    const enviarCodigo = (codigo, grupo) => {
      const enlace = APP_PRUEBAS + '?admin=' + encodeURIComponent(codigo);
      const texto = '⛳ Te invito a ser administrador ' + (grupo ? 'de «' + grupo + '» ' : 'de tu propio grupo ') + 'en acgolf, la app de golf entre amigos.\n'
        + 'Abre este enlace, crea tu cuenta y ' + (grupo ? 'quedarás como administrador:' : 'podrás crear tu grupo:') + '\n' + enlace
        + '\n\nTu código es ' + codigo + ' (sirve una sola vez).';
      const box = $('paCodNuevo');
      box.innerHTML = '<div class="cg-invita"><b>Código ' + esc(codigo) + '</b><div class="cg-enlace">' + esc(enlace) + '</div>'
        + '<a class="cg-btn" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
        + '<button type="button" class="cg-btn ghost" id="paCodCopiar">Copiar el mensaje</button></div>';
      $('paCodCopiar').onclick = async () => { try { await navigator.clipboard.writeText(texto); msg('Mensaje copiado. Pégalo donde quieras.', true); } catch(e){ prompt('Copia el mensaje:', texto); } };
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if($('paCodCrear')) $('paCodCrear').onclick = e => ocupado(e.target, async () => {
      const sel = $('paCodGrupo');
      const { data, error } = await client.rpc('sa_crear_codigo_admin', { p_grupo: sel.value || null, p_nota: $('paCodNota').value.trim() || null });
      if(error){ msg(traducir(error)); return; }
      const grupo = sel.value ? sel.options[sel.selectedIndex].text.replace(/^Administrador de «|»$/g, '') : '';
      await pantallaSuper(perfil, 'codigos');
      enviarCodigo(data, grupo);
    });
    gate.querySelectorAll('[data-enviar]').forEach(b => b.onclick = () => enviarCodigo(b.dataset.enviar, b.dataset.gr));
    gate.querySelectorAll('[data-anular]').forEach(b => b.onclick = async () => {
      if(!confirm('¿Anular el código ' + b.dataset.anular + '?\nYa no servirá para nada.')) return;
      const { error } = await client.rpc('sa_anular_codigo_admin', { p_codigo: b.dataset.anular });
      if(error){ msg(traducir(error)); return; }
      pantallaSuper(perfil, 'codigos');
    });
    gate.querySelectorAll('select[data-u]').forEach(sel => sel.onchange = async () => {
      sel.disabled = true;
      const { error } = await client.rpc('sa_cambiar_rol', { p_user: sel.dataset.u, p_rol: sel.value, p_grupo: sel.dataset.g });
      sel.disabled = false;
      if(error){ msg(traducir(error)); return; }
      msg('Rol cambiado.', true);
    });
    gate.querySelectorAll('[data-reenviar]').forEach(b => b.onclick = () => ocupado(b, async () => {
      const email = b.dataset.reenviar;
      const { error } = b.dataset.conf === '1'
        ? await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: APP_PRUEBAS } })
        : await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: APP_PRUEBAS } });
      if(error){ msg(traducir(error)); return; }
      msg('Correo reenviado a ' + email + '. Que pulse el enlace del correo para terminar.', true);
    }));
    gate.querySelectorAll('[data-borrar-u]').forEach(b => b.onclick = async () => {
      if(!confirm('¿Borrar la cuenta de ' + b.dataset.e + '?\n\nNo había terminado el alta. Si luego quiere entrar, tendrá que crear la cuenta otra vez.')) return;
      const { error } = await client.rpc('sa_borrar_usuario', { p_user: b.dataset.borrarU });
      if(error){ msg(traducir(error)); return; }
      pantallaSuper(perfil, 'usuarios');
    });
    gate.querySelectorAll('[data-super]').forEach(b => b.onclick = async () => {
      const quitar = b.dataset.on === '1';
      if(!confirm(quitar ? '¿Quitarle el super administrador?' : '¿Hacerle super administrador?\nPodrá ver y cambiar todos los grupos y usuarios.')) return;
      const { error } = await client.rpc('sa_cambiar_rol', { p_user: b.dataset.super, p_rol: quitar ? 'no_super' : 'super_admin' });
      if(error){ msg(traducir(error)); return; }
      pantallaSuper(perfil, 'usuarios');
    });
  }

  // ---------- Resúmenes de las partidas (Panel general: abrir «El plató» de cualquier grupo) ----------
  async function pantallaResumenes(perfil, grupoId, grupoNombre){
    if(!grupoId){
      mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Resúmenes de las partidas</h1><p class="cg-sub">Elige un grupo</p></div><div id="cgMsg" class="cg-msg"></div><p class="cg-p">Cargando…</p>');
      const rg = await client.rpc('sa_grupos');
      if(rg.error){ mostrar(cabecera('No se pudo abrir', traducir(rg.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => pantallaSuper(perfil); return; }
      const grupos = (rg.data || []).filter(g => g.tipo !== 'personal');
      mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">Resúmenes de las partidas</h1><p class="cg-sub">Elige un grupo</p></div>'
        + '<div class="pa-lista">' + grupos.map(g => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(g.nombre) + '</b><span>' + g.miembros + ' miembro' + (g.miembros === 1 ? '' : 's') + '</span></div>'
            + '<div class="pa-acc"><button type="button" class="pa-b" data-ver-grupo="' + esc(g.id) + '" data-n="' + esc(g.nombre) + '">Ver partidas</button></div></div>').join('') + '</div>'
        + '<button type="button" class="cg-btn" id="cgVolver">Volver</button>');
      $('cgVolver').onclick = () => pantallaSuper(perfil);
      gate.querySelectorAll('[data-ver-grupo]').forEach(b => b.onclick = () => pantallaResumenes(perfil, b.dataset.verGrupo, b.dataset.n));
      return;
    }
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">' + esc(grupoNombre) + '</h1><p class="cg-sub">Cargando…</p></div>');
    const r = await client.rpc('sa_rondas_grupo', { p_grupo: grupoId });
    if(r.error){ mostrar(cabecera('No se pudo abrir', traducir(r.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => pantallaResumenes(perfil); return; }
    const lista = r.data || [];
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Super administrador</div><h1 class="cg-title">' + esc(grupoNombre) + '</h1>'
      + '<p class="cg-sub">' + lista.length + ' partida' + (lista.length === 1 ? '' : 's') + '</p></div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + (lista.length ? '<div class="pa-lista">' + lista.map(x => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(x.round_name || 'Partida') + '</b>'
          + '<span>' + esc((x.jugadores || []).flat().filter(Boolean).join(', ')) + '</span>'
          + '<span>' + fecha(x.updated_at || x.created_at) + '</span></div>'
          + '<div class="pa-acc"><button type="button" class="pa-b" data-ver-resumen="' + esc(x.code) + '">▶ Ver resumen</button></div></div>').join('') + '</div>'
        : '<p class="cg-p" style="font-size:16px;">Todavía no hay partidas en este grupo.</p>')
      + '<button type="button" class="cg-btn" id="cgVolver">Volver a los grupos</button>');
    $('cgVolver').onclick = () => pantallaResumenes(perfil);
    gate.querySelectorAll('[data-ver-resumen]').forEach(b => b.onclick = () => ocupado(b, async () => {
      if(!window.acgolfEnVivo || typeof window.acgolfEnVivo.pantalla !== 'function'){ msg('No está disponible ahora mismo.'); return; }
      const rr = await client.rpc('sa_leer_ronda', { p_code: b.dataset.verResumen });
      if(rr.error || !rr.data){ msg('No se pudo abrir esta partida.'); return; }
      ocultar();
      window.acgolfEnVivo.pantalla(b.dataset.verResumen, rr.data, true);
    }));
  }

  async function pantallaMiembros(perfil, grupoId, grupoNombre, desdeSuper){
    mostrar(cabecera('Miembros de «' + esc(grupoNombre) + '»', 'Cargando…'));
    const r = await client.rpc('ga_miembros', { p_grupo: grupoId });
    if(r.error){ mostrar(cabecera('No se pudo abrir', traducir(r.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => desdeSuper ? pantallaSuper(perfil) : panelMiCuenta(perfil); return; }
    const lista = r.data || [];
    mostrar('<div class="cg-head"><div class="cg-eyebrow">' + (desdeSuper ? 'Super administrador' : 'Administrador del grupo') + '</div><h1 class="cg-title">' + esc(grupoNombre) + '</h1>'
      + '<p class="cg-sub">' + lista.length + ' miembro' + (lista.length === 1 ? '' : 's') + '</p></div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<div class="pa-lista">' + lista.map(m => '<div class="pa-fila"><div class="pa-fila-t"><b>' + esc(m.nombre) + '</b>'
          + '<span>' + esc(m.email) + '</span><span>' + ROL[m.rol] + ' · desde ' + fecha(m.desde) + '</span></div>'
          + '<div class="pa-acc">' + (m.user_id === window.miPerfilId && !desdeSuper ? '<span class="pa-tu">Tú</span>' : '<button type="button" class="pa-b rojo" data-quitar="' + esc(m.user_id) + '" data-n="' + esc(m.nombre) + '">Quitar</button>') + '</div></div>').join('') + '</div>'
      + '<div id="cgSinCuenta"></div>'
      + '<div class="cg-sep">Añadir a alguien que ya tiene cuenta</div>'
      + '<label class="cg-lbl">Su correo<small>Si aún no tiene cuenta, mándale el enlace de invitación desde «Mi cuenta».</small><input id="paEmail" type="email" autocapitalize="off" inputmode="email"></label>'
      + '<button type="button" class="cg-btn ghost" id="paAnadir">Añadir al grupo</button>'
      + '<button type="button" class="cg-btn" id="cgVolver">Volver</button>');
    $('cgVolver').onclick = () => desdeSuper ? pantallaSuper(perfil, 'grupos') : panelMiCuenta(perfil);
    // Jugadores apuntados a mano, sin cuenta: salen con candado y un aviso para que se inscriban
    client.rpc('ga_sin_cuenta', { p_grupo: grupoId }).then(rs => {
      const box = $('cgSinCuenta'); const d = rs && rs.data;
      if(!box || rs.error || !d || !(d.jugadores || []).length) return;
      const enlace = d.codigo ? APP_PRUEBAS + '?unirse=' + encodeURIComponent(d.codigo) : '';
      const texto = j => '⛳ Hola, ' + j.nombre.split(' ')[0] + '. Estás apuntado en «' + d.grupo + '» en acgolf, la app de golf del grupo, pero todavía no te has inscrito.\n'
        + '🔒 Mientras no te inscribas puedes jugar, pero no sales en la clasificación, ni en el ganador de la semana, ni en las medallas.\n'
        + 'Para desbloquearlo, entra en este enlace, regístrate con tu correo y una contraseña e instálala en tu móvil:\n' + enlace
        + '\nPon tu nombre tal cual: ' + j.nombre + ' (así conservas tu hándicap).';
      box.innerHTML = '<div class="cg-sep">🔒 Sin cuenta todavía</div>'
        + '<div class="cg-candado"><b>🔒 Pendientes de inscribirse</b>Pueden jugar, pero no salen en la clasificación, ni en el ganador de la semana, ni en las medallas, y no pueden entrar en la app desde su móvil. '
        + 'Para desbloquearlos tienen que inscribirse con su correo desde el enlace de invitación, poniendo su nombre tal cual sale aquí.</div>'
        + '<div class="pa-lista">' + d.jugadores.map((j, i) => '<div class="pa-fila pa-bloq"><div class="pa-fila-t"><b>🔒 ' + esc(j.nombre) + '</b>'
            + '<span>Sin correo · Hándicap ' + (j.hcp == null ? '—' : esc(String(j.hcp).replace('.', ','))) + '</span></div>'
            + (enlace ? '<div class="pa-acc"><a class="pa-b" href="https://wa.me/?text=' + encodeURIComponent(texto(j)) + '" target="_blank" rel="noopener">Invitar</a></div>' : '')
            + '</div>').join('') + '</div>';
    }, () => {});
    $('paAnadir').onclick = e => ocupado(e.target, async () => {
      const email = $('paEmail').value.trim(); if(!email){ msg('Escribe su correo.'); return; }
      const { data, error } = await client.rpc('ga_anadir', { p_grupo: grupoId, p_email: email });
      if(error){ msg(traducir(error)); return; }
      await pantallaMiembros(perfil, grupoId, grupoNombre, desdeSuper);
      msg('Añadido: ' + data, true);
    });
    gate.querySelectorAll('[data-quitar]').forEach(b => b.onclick = async () => {
      if(!confirm('¿Quitar a ' + b.dataset.n + ' del grupo?\nSus partidas jugadas se quedan; él deja de ver el grupo.')) return;
      const { error } = await client.rpc('ga_quitar', { p_grupo: grupoId, p_user: b.dataset.quitar });
      if(error){ msg(traducir(error)); return; }
      pantallaMiembros(perfil, grupoId, grupoNombre, desdeSuper);
    });
  }

  // ---------- Mi cuenta ----------
  function panelMiCuenta(perfil){
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Mi cuenta</div><h1 class="cg-title">' + esc(perfil.player_name) + '</h1>'
      + '<p class="cg-sub">' + (perfil.grupo ? 'Grupo <b>' + esc(perfil.grupo) + '</b><br>' : '') + esc(perfil.email) + (perfil.es_admin ? ' · <b>Administrador</b>' : '') + '</p></div>'
      + (perfil.es_admin ? '<div class="cg-invita" id="cgInvita"><b>Invita a tus amigos</b><div class="cg-p" style="margin:6px 0;">Cargando enlace…</div></div>' : '')
      + '<div id="cgMsg" class="cg-msg"></div>'
      + (window.acgolfAvatares ? '<button type="button" class="cg-btn" id="cgAvatar">' + window.acgolfAvatares.html(perfil.player_name, 'sm') + (perfil.es_admin ? 'Fotos y avatares' : 'Mi foto o avatar') + '</button>' : '')
      + (perfil.es_super ? '<button type="button" class="cg-btn" id="cgSuper">🛡️ Panel de super administrador</button>' : '')
      + ''
      + (perfil.es_admin && perfil.grupo_tipo === 'liga' ? '<button type="button" class="cg-btn ghost" id="cgMiembros">Miembros del grupo</button>' : '')
      + (perfil.es_admin && perfil.grupo_tipo === 'liga' ? '<button type="button" class="cg-btn ghost" id="cgPortada">Cambiar la portada del grupo</button>' : '')
      + '<button type="button" class="cg-btn" id="cgMisGrupos">Mis grupos' + (perfil.num_grupos > 1 ? ' (' + perfil.num_grupos + ')' : '') + '</button>'
      + (perfil.grupo_tipo === 'liga' ? '<label class="am-lbl"><div class="am-card"><div class="am-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6l9 -6"/></svg></div>'
        + '<div class="am-txt"><b>Avisos por correo</b><span id="cgCorreosTxt">Un correo cuando alguien de tu grupo crea una partida</span></div>'
        + '<span class="am-sw"><input type="checkbox" id="cgCorreos" role="switch" checked disabled aria-label="Avisos por correo"><i></i></span></div></label>' : '')
      + '<label class="am-lbl"><div class="am-card"><div class="am-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l15-6v14L3 13z"/><path d="M7 14l1.5 6h3L10 15"/></svg></div>'
        + '<div class="am-txt"><b>Novedades de acgolf</b><span id="cgNovTxt">Un correo de vez en cuando con las novedades de la app</span></div>'
        + '<span class="am-sw"><input type="checkbox" id="cgNov" role="switch" checked disabled aria-label="Novedades de acgolf"><i></i></span></div></label>'
      + (perfil.grupo_tipo === 'liga' && window.acgolfAvisosMovil ? '<div id="cgMovil"></div>' : '')
      + (window.acgolfInstalar ? '<button type="button" class="cg-btn ghost" id="cgInstalar">📲 Instalar la app en el móvil</button>' : '')
      + '<button type="button" class="cg-btn ghost" id="cgDatos">Descargar mis datos</button>'
      + '<button type="button" class="cg-btn ghost" id="cgClave">Cambiar mi contraseña</button>'
      + '<button type="button" class="cg-btn ghost" id="cgSalir">Cerrar sesión en este móvil</button>'
      + '<a class="cg-btn ghost" id="cgSoporte" href="mailto:avisos@acgolf.es?subject=' + encodeURIComponent('Ayuda con acgolf' + (perfil.grupo ? ' (' + perfil.grupo + ')' : '')) + '" style="text-align:center;text-decoration:none;box-sizing:border-box;">✉️ Escribir a soporte</a>'
      + '<button type="button" class="cg-btn danger" id="cgBorrar">Borrar mi cuenta</button>'
      + '<p class="cg-legal"><a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a> · <a href="condiciones.html" target="_blank" rel="noopener">Condiciones de uso</a><br>Aceptadas el ' + esc(new Date(perfil.privacidad_aceptada_en).toLocaleDateString('es-ES')) + '</p>'
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    if($('cgAvatar')) $('cgAvatar').onclick = () => { ocultar(); window.acgolfAvatares.editar(perfil); };
    $('cgMisGrupos').onclick = () => pantallaMisGrupos(perfil);
    if($('cgPlan')) $('cgPlan').onclick = () => window.acgolfPlanes.abrir();
    const cc = $('cgCorreos');
    if(cc){
      client.rpc('mis_correos').then(r => { if(!r.error){ cc.checked = r.data !== false; cc.disabled = false;
        if(!cc.checked && $('cgCorreosTxt')) $('cgCorreosTxt').textContent = 'Desactivados. Actívalos para no perderte nada'; } });
      cc.onchange = async () => {
        cc.disabled = true;
        const { data, error } = await client.rpc('mis_correos', { p_quiero: cc.checked });
        cc.disabled = false;
        if(error){ cc.checked = !cc.checked; msg(traducir(error)); return; }
        msg(data ? 'Recibirás los avisos por correo.' : 'Ya no te llegarán avisos por correo.', true);
        const t = $('cgCorreosTxt'); if(t) t.textContent = data ? 'Un correo cuando alguien de tu grupo crea una partida' : 'Desactivados. Actívalos para no perderte nada';
      };
    }
    const cn = $('cgNov');
    if(cn){
      const txtNov = on => { const t = $('cgNovTxt'); if(t) t.textContent = on ? 'Un correo de vez en cuando con las novedades de la app' : 'Desactivadas. Actívalas para enterarte de lo nuevo'; };
      client.rpc('mis_novedades').then(r => { if(!r.error){ cn.checked = r.data !== false; cn.disabled = false; txtNov(cn.checked); } });
      cn.onchange = async () => {
        cn.disabled = true;
        const { data, error } = await client.rpc('mis_novedades', { p_quiero: cn.checked });
        cn.disabled = false;
        if(error){ cn.checked = !cn.checked; msg(traducir(error)); return; }
        msg(data ? 'Recibirás las novedades de acgolf.' : 'Ya no te llegarán novedades de acgolf.', true);
        txtNov(data);
      };
    }
    if($('cgMovil')) window.acgolfAvisosMovil.pintar($('cgMovil'), perfil, msg);
    if($('cgInstalar')) $('cgInstalar').onclick = () => { ocultar(); window.acgolfInstalar(); };
    if($('cgPortada')) $('cgPortada').onclick = () => asistentePortada(perfil, true);
    if($('cgSuper')) $('cgSuper').onclick = () => pantallaSuper(perfil);
    if($('cgMiembros')) $('cgMiembros').onclick = () => pantallaMiembros(perfil, perfil.grupo_id, perfil.grupo, false);
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
    if(perfil.es_admin){
      const pintarInvita = (inv) => {
        const box = $('cgInvita'); if(!box) return;
        if(!inv){ box.remove(); return; }
        const enlace = APP_PRUEBAS + '?unirse=' + encodeURIComponent(inv.codigo);
        const texto = '⛳ Te invito a «' + inv.grupo + '» en acgolf, la app de golf entre amigos.\n\n1️⃣ Pulsa este enlace y crea tu cuenta:\n' + enlace + '\n\n2️⃣ Si la app te pide un código, escribe solo esto:\n' + inv.codigo;
        box.innerHTML = '<b>Invita a tus amigos a «' + esc(inv.grupo) + '»</b>'
          + '<div class="cg-p" style="margin:6px 0;">Manda este enlace a tus amigos. Al abrirlo y crear su cuenta, entran directamente en tu grupo.</div>'
          + '<div class="cg-enlace">' + esc(enlace) + '</div>'
          + '<a class="cg-btn" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
          + (window.acgolfQR ? '<div class="qr-caja"><b>Código QR del grupo</b><img id="cgQR" alt="Código QR para unirse a «' + esc(inv.grupo) + '»"><small>Para imprimir o enseñar en el móvil: al escanearlo entran directamente en el grupo.</small>'
              + '<a class="cg-btn ghost" id="cgQRBajar" download="QR-' + esc(String(inv.grupo).replace(/[^\wÀ-ÿ]+/g, '-')) + '.png">Descargar el QR</a></div>' : '')
          + '<button type="button" class="cg-link" id="cgNuevoEnlace">Cambiar el enlace (el anterior deja de valer)</button>';
        if(window.acgolfQR && $('cgQR')){ try { const png = window.acgolfQR.lamina(enlace, inv.grupo); $('cgQR').src = png; $('cgQRBajar').href = png; } catch(e){ const c = box.querySelector('.qr-caja'); if(c) c.remove(); } }
        $('cgNuevoEnlace').onclick = async () => {
          if(!confirm('¿Cambiar el enlace de invitación?\nEl enlace anterior dejará de funcionar.')) return;
          const r = await client.rpc('invitacion_de_mi_grupo', { p_nuevo: true }); pintarInvita(r.data);
        };
      };
      client.rpc('invitacion_de_mi_grupo', { p_nuevo: false }).then(r => pintarInvita(r.data), () => pintarInvita(null));
    }
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

  // Promociones por correo desde avisos@acgolf.es (solo el super administrador).
  // Se elige la promoción (las fichas están en la base de datos: se añaden sin tocar la app), a quién va, y se envía.
  // Para enviar a varias personas hay que confirmar el número exacto que se ve en pantalla.
  // Guía de los correos: a quién va cada uno y cuándo (para no equivocarse)
  async function pantallaGuiaCorreos(perfil){
    mostrar(cabecera('Guía de los correos', 'Cargando…'));
    const r = await client.rpc('sa_promociones');
    if(r.error){ mostrar(cabecera('No se pudo abrir', traducir(r.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => pantallaMenuPromos(perfil); return; }
    const lista = (r.data || []).filter(p => p.quien);
    mostrar('<button type="button" class="pn-atras" id="gcAtras">‹ Volver a Promociones</button>'
      + cabecera('Guía de los correos', 'A quién va cada correo y cuándo. Salen siempre desde avisos@acgolf.es.')
      + '<div class="gc-lista">' + (lista.map(p => '<div class="gc-fila"><b>' + esc(p.nombre) + '</b>'
          + '<span><i>Va a:</i> ' + esc(p.quien) + '</span><span><i>Cuándo:</i> ' + esc(p.cuando) + '</span>'
          + (p.ultimo ? '<small>Último envío: ' + fecha(p.ultimo.cuando) + ' · ' + p.ultimo.correos + (p.ultimo.correos === 1 ? ' persona' : ' personas') + '</small>' : '<small>Todavía no se ha enviado.</small>')
          + '</div>').join('') || '<p class="cg-p">Todavía no hay correos preparados.</p>') + '</div>'
      + '<p class="cg-p">Nadie recibe el mismo correo dos veces. Los correos 2 y 3 solo van a quien tiene marcada «Novedades de acgolf».</p>'
      + '<button type="button" class="cg-btn" id="gcEnviar">Enviar un correo</button>');
    $('gcAtras').onclick = () => pantallaMenuPromos(perfil);
    $('gcEnviar').onclick = () => pantallaPromociones(perfil);
  }

  async function pantallaPromociones(perfil){
    mostrar(cabecera('Enviar un correo', 'Cargando…'));
    const [rp, rg] = await Promise.all([client.rpc('sa_promociones'), client.rpc('sa_grupos')]);
    if(rp.error){ mostrar(cabecera('No se pudo abrir', traducir(rp.error)) + '<button type="button" class="cg-btn" id="cgCerrar">Volver</button>'); $('cgCerrar').onclick = () => pantallaMenuPromos(perfil); return; }
    const promos = rp.data || [];
    const grupos = (rg.data || []).filter(g => g.tipo !== 'personal');
    let alc = 'todos', n = null;
    let cand = [], candCargados = false, filtro = 'todos', buscar = '', cuentaVez = 0;
    const marcados = new Set();
    mostrar(cabecera('Enviar un correo', 'Sale desde avisos@acgolf.es. Si te contestan, la respuesta llega a avisos@acgolf.es.')
      + '<div class="cp-seg" id="cpAlc"><button type="button" data-a="persona">Una persona</button><button type="button" data-a="grupo">Un grupo</button><button type="button" data-a="todos" class="on">A todos</button><button type="button" data-a="elegir">Elegir a mano</button></div>'
      + '<label class="cg-lbl" id="cpParaL" hidden>Para<small>El correo de la persona</small><input id="cpPara" type="email" autocomplete="off" inputmode="email"></label>'
      + '<label class="cg-lbl" id="cpGrupoL" hidden>Grupo<select id="cpGrupo">' + grupos.map(g => '<option value="' + esc(g.id) + '">' + esc(g.nombre) + ' (' + g.miembros + ')</option>').join('') + '</select></label>'
      + '<label class="cg-lbl">Qué correo<select id="cpPromo">' + promos.map((p, i) => '<option value="' + i + '">' + esc(p.nombre) + '</option>').join('') + '</select></label>'
      + '<div class="cp-recuerda" id="cpRecuerda" hidden></div>'
      + '<div class="cp-ultimo" id="cpUltimo"></div>'
      + '<div id="cpElegir" hidden>'
      +   '<div class="cp-et">Filtro rápido</div><div class="cp-chips" id="cpChips"></div>'
      +   '<input id="cpBuscar" class="cp-buscar" type="text" placeholder="Buscar por nombre, grupo o correo" autocomplete="off">'
      +   '<div class="cp-marcar"><button type="button" class="cg-link" id="cpTodos">Marcar todos los que salen</button><button type="button" class="cg-link" id="cpNinguno">Quitar todas las marcas</button></div>'
      +   '<div id="cpLista" class="cp-lista">Cargando…</div>'
      + '</div>'
      + '<div class="cp-caja" id="cpCuenta">Contando…</div>'
      + '<label class="cg-lbl">Asunto<input id="cpAsunto" type="text" maxlength="150"></label>'
      + '<label class="cg-lbl">Título del correo<small>Escribe [nombre] y saldrá el nombre de cada persona; [grupo], el de su grupo.</small><input id="cpTitulo" type="text" maxlength="140"></label>'
      + '<label class="cg-lbl">Texto de presentación<textarea id="cpIntro" rows="4" maxlength="600" class="cp-area"></textarea></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn ghost" id="cpVer">Ver cómo queda el correo</button>'
      + '<button type="button" class="cg-btn ghost" id="cpPrueba">Mandarme una prueba a mí</button>'
      + '<button type="button" class="cg-btn" id="cpEnviar">Enviar</button>'
      + '<button type="button" class="cg-link" id="cpLibre">Escribir un correo libre (a una persona)</button>'
      + '<button type="button" class="cg-link" id="cpVolver">Volver</button>');
    $('cpLibre').onclick = () => pantallaCorreoLibre(perfil);
    $('cpVolver').onclick = () => pantallaMenuPromos(perfil);
    if(!promos.length){ $('cpEnviar').disabled = true; $('cpPrueba').disabled = true; $('cpVer').disabled = true; msg('Todavía no hay promociones preparadas.'); }
    const actual = () => promos[+$('cpPromo').value] || {};
    const FILTROS = [['todos', 'Todos los nuevos'], ['7', 'Últimos 7 días'], ['A', 'Crearon grupo'], ['B', 'Entraron por invitación'], ['solo', 'Grupo con un solo jugador'], ['nuevo', 'Aún sin este correo']];
    const bloqueado = c => c.ya || (actual().solo_novedades && c.sin_novedades);
    const visibles = () => cand.filter(c => {
      if(filtro === '7' && Date.now() - new Date(c.desde).getTime() > 7 * 24 * 3600 * 1000) return false;
      if(filtro === 'A' && c.tipo !== 'A') return false;
      if(filtro === 'B' && c.tipo !== 'B') return false;
      if(filtro === 'solo' && !(c.solo && c.tipo === 'A')) return false;
      if(filtro === 'nuevo' && c.ya) return false;
      return !buscar || (String(c.nombre || '') + ' ' + String(c.grupo || '') + ' ' + String(c.correo || '')).toLowerCase().indexOf(buscar) > -1;
    });
    const pintarLista = () => {
      $('cpChips').innerHTML = FILTROS.map(f => '<button type="button" class="cp-chip' + (filtro === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>').join('');
      const v = visibles();
      $('cpLista').innerHTML = v.map(c => {
        const bl = bloqueado(c), on = marcados.has(c.user_id);
        return '<button type="button" class="cp-fila' + (bl ? ' dis' : '') + '" data-u="' + esc(c.user_id) + '"' + (bl ? ' disabled' : '') + '>'
          + '<span class="cp-ch' + (on ? ' on' : '') + '">' + (on ? '✔' : '') + '</span>'
          + '<span class="cp-fila-t"><b>' + esc(c.nombre || 'Sin nombre') + '</b><i class="cp-tag">' + (c.tipo === 'A' ? 'Creó grupo' : 'Por invitación') + '</i>'
          + '<small>' + esc(c.grupo || 'Sin grupo') + ' · se registró ' + fecha(c.desde) + (c.ya ? ' · ya lo recibió' : (bloqueado(c) ? ' · quitó «Novedades»' : '')) + '</small></span></button>';
      }).join('') || '<p class="cg-p">No sale nadie con este filtro.</p>';
    };
    const cargarCand = async () => {
      $('cpLista').textContent = 'Cargando…'; candCargados = false; marcados.clear();
      const r = await client.rpc('sa_promo_candidatos', { p_promo: actual().id });
      if(r.error){ $('cpLista').textContent = 'No se pudo cargar la lista. ' + traducir(r.error); return; }
      cand = r.data || []; candCargados = true;
      filtro = actual().para_tipo || 'todos';
      pintarLista(); contar();
    };
    const cargarPromo = () => {
      const p = actual();
      $('cpAsunto').value = p.asunto || ''; $('cpTitulo').value = p.titulo || ''; $('cpIntro').value = p.intro || '';
      const u = p.ultimo;
      $('cpUltimo').textContent = u ? 'Ya se envió el ' + fecha(u.cuando) + ' a ' + u.correos + (u.correos === 1 ? ' persona.' : ' personas.') : 'Todavía no se ha enviado.';
      const rc = $('cpRecuerda');
      rc.hidden = !p.quien;
      rc.innerHTML = p.quien ? '<b>Este correo va a:</b> ' + esc(p.quien) + '<br><b>Cuándo:</b> ' + esc(p.cuando || '') : '';
      if(alc === 'elegir') cargarCand();
    };
    const contenido = () => Object.assign({}, actual(), { asunto: $('cpAsunto').value.trim(), titulo: $('cpTitulo').value.trim(), intro: $('cpIntro').value.trim() });
    const contar = async () => {
      const caja = $('cpCuenta'); n = null;
      if(alc === 'persona'){ n = 1; caja.innerHTML = '<b>1 persona</b> recibiría este correo'; return; }
      if(alc === 'elegir'){
        const ids = [...marcados], vez = ++cuentaVez;
        if(!ids.length){ n = 0; caja.innerHTML = '<b>0 personas</b> elegidas<small>Marca a quién quieres enviarlo.</small>'; return; }
        caja.textContent = 'Contando…';
        const re = await client.rpc('sa_promo_elegidos', { p_promo: actual().id, p_ids: ids });
        if(vez !== cuentaVez) return;
        if(re.error){ caja.textContent = 'No se pudo contar. ' + traducir(re.error); return; }
        n = re.data.n;
        caja.innerHTML = '<b>Has elegido ' + re.data.elegidos + (re.data.elegidos === 1 ? ' persona' : ' personas') + '</b> · recibirán ' + n
          + (re.data.se_saltan > 0 ? '<small>' + re.data.se_saltan + ' se saltan: ya lo recibieron o quitaron «Novedades de acgolf».</small>' : '<small>Un mensaje para cada una: nadie ve los correos de los demás.</small>');
        return;
      }
      caja.textContent = 'Contando…';
      const r = await client.rpc('sa_promo_destinatarios', { p_alcance: alc, p_grupo: alc === 'grupo' ? $('cpGrupo').value : null });
      if(r.error){ caja.textContent = 'No se pudo contar. ' + traducir(r.error); return; }
      n = r.data.n;
      caja.innerHTML = '<b>' + n + (n === 1 ? ' persona' : ' personas') + '</b> recibirían este correo'
        + '<small>Un mensaje para cada una: nadie ve los correos de los demás. No reciben quienes apagaron «Novedades de acgolf» y las cuentas de acgolf.es.</small>';
    };
    const pintarAlc = () => {
      gate.querySelectorAll('#cpAlc button').forEach(b => b.classList.toggle('on', b.dataset.a === alc));
      $('cpParaL').hidden = alc !== 'persona'; $('cpGrupoL').hidden = alc !== 'grupo'; $('cpElegir').hidden = alc !== 'elegir';
      $('cpEnviar').textContent = alc === 'persona' ? 'Enviar a esa persona' : (alc === 'elegir' ? 'Enviar a los elegidos' : 'Enviar a las personas');
      if(alc === 'elegir' && !candCargados) cargarCand();
      contar();
    };
    gate.querySelectorAll('#cpAlc button').forEach(b => b.onclick = () => { alc = b.dataset.a; pintarAlc(); });
    $('cpGrupo').onchange = contar;
    $('cpPromo').onchange = cargarPromo;
    $('cpChips').onclick = e => { const f = e.target.closest('.cp-chip'); if(f){ filtro = f.dataset.f; pintarLista(); } };
    $('cpBuscar').oninput = e => { buscar = e.target.value.trim().toLowerCase(); pintarLista(); };
    $('cpLista').onclick = e => {
      const b = e.target.closest('.cp-fila'); if(!b || b.disabled) return;
      const id = b.dataset.u; if(marcados.has(id)) marcados.delete(id); else marcados.add(id);
      pintarLista(); contar();
    };
    $('cpTodos').onclick = () => { visibles().forEach(c => { if(!bloqueado(c)) marcados.add(c.user_id); }); pintarLista(); contar(); };
    $('cpNinguno').onclick = () => { marcados.clear(); pintarLista(); contar(); };
    cargarPromo(); pintarAlc();

    $('cpVer').onclick = e => ocupado(e.target, async () => {
      const { data, error } = await client.functions.invoke('promocion', { body: { accion: 'ver', promo: contenido() } });
      if(error || !data || !data.html){ msg('No se pudo mostrar. ' + ((data && data.error) || (error && error.message) || '')); return; }
      const v = document.createElement('div'); v.className = 'cp-vista';
      v.innerHTML = '<button type="button" class="cg-btn" id="cpCerrarVista">Cerrar la vista previa</button><iframe title="Vista previa del correo" sandbox></iframe>';
      v.querySelector('iframe').srcdoc = data.html;
      document.body.appendChild(v);
      v.querySelector('#cpCerrarVista').onclick = () => v.remove();
    });
    $('cpPrueba').onclick = e => ocupado(e.target, async () => {
      const { data, error } = await client.functions.invoke('promocion', { body: { accion: 'prueba', promo: contenido() } });
      if(error || !data || !data.enviados){ msg('No se pudo mandar. ' + ((data && data.error) || (error && error.message) || '')); return; }
      msg('Enviado a ' + data.a + '. Mira tu correo en un minuto.', true);
    });
    $('cpEnviar').onclick = e => ocupado(e.target, async () => {
      const p = contenido();
      if(!p.asunto || !p.titulo){ msg('Pon el asunto y el título.'); return; }
      let para = '';
      if(alc === 'persona'){
        para = $('cpPara').value.trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)){ msg('Escribe bien el correo de la persona.'); return; }
      } else if(alc === 'elegir' && !marcados.size){ msg('Marca a quién quieres enviarlo.'); return; }
      else if(!(n > 0)){ msg('No hay a quién enviarlo.'); return; }
      const quien = alc === 'persona' ? para : alc === 'elegir' ? (n === 1 ? 'la persona elegida' : 'las ' + n + ' personas elegidas') : (n === 1 ? 'la persona' : 'las ' + n + ' personas') + (alc === 'grupo' ? ' del grupo «' + $('cpGrupo').selectedOptions[0].textContent.replace(/ \(\d+\)$/, '') + '»' : '');
      const antes = actual().ultimo && alc !== 'persona' && alc !== 'elegir' ? '\n\nOJO: esta promoción ya se envió el ' + fecha(actual().ultimo.cuando) + ' a ' + actual().ultimo.correos + ' personas.' : '';
      if(!confirm('¿Enviar «' + p.asunto + '» a ' + quien + '?\n\nSale desde avisos@acgolf.es y no se puede deshacer.' + antes)) return;
      const { data, error } = await client.functions.invoke('promocion', { body: { accion: 'enviar', promo: p, alcance: alc === 'elegir' ? 'personas' : alc, ids: alc === 'elegir' ? [...marcados] : undefined, grupo: alc === 'grupo' ? $('cpGrupo').value : null, para, confirmo: alc === 'persona' ? 1 : n } });
      if(error || !data || !data.enviados){ msg('No se pudo enviar. ' + ((data && data.error) || (error && error.message) || '')); return; }
      mostrar(cabecera('Correo enviado', 'Se ha enviado a ' + data.enviados + (data.enviados === 1 ? ' persona' : ' personas') + ' desde avisos@acgolf.es.')
        + '<button type="button" class="cg-btn" id="cpOtro">Enviar otro</button>'
        + '<button type="button" class="cg-link" id="cpVolver2">Volver a Promociones</button>');
      $('cpOtro').onclick = () => pantallaPromociones(perfil);
      $('cpVolver2').onclick = () => pantallaMenuPromos(perfil);
    });
  }

  // Correo libre desde avisos@acgolf.es (solo el super administrador). Las respuestas llegan a avisos@acgolf.es.
  function pantallaCorreoLibre(perfil){
    mostrar(cabecera('Enviar un correo', 'Sale desde avisos@acgolf.es. Si te contestan, la respuesta te llega a tu correo.')
      + '<label class="cg-lbl">Para<small>El correo de la persona</small><input id="clPara" type="email" autocomplete="off" inputmode="email"></label>'
      + '<label class="cg-lbl">Asunto<input id="clAsunto" type="text" maxlength="150"></label>'
      + '<label class="cg-lbl">Texto<small>Escríbelo o pégalo tal cual</small><textarea id="clTexto" rows="10" maxlength="5000" style="font:500 18px/1.4 \'Barlow\', sans-serif;padding:14px;border-radius:12px;border:2px solid #4A6AA3;background:#15294D;color:#F6F1E4;width:100%;box-sizing:border-box;"></textarea></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="clEnviar">Enviar el correo</button>'
      + '<button type="button" class="cg-link" id="clVolver">Volver</button>');
    $('clVolver').onclick = () => pantallaPromociones(perfil);
    $('clEnviar').onclick = e => ocupado(e.target, async () => {
      const para = $('clPara').value.trim(), asunto = $('clAsunto').value.trim(), texto = $('clTexto').value.trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(para)){ msg('Escribe bien el correo del destinatario.'); return; }
      if(!asunto){ msg('Pon un asunto.'); return; }
      if(!texto){ msg('Escribe el texto.'); return; }
      if(!confirm('¿Enviar este correo a ' + para + '?\n\nSale desde avisos@acgolf.es.')) return;
      const { data, error } = await client.functions.invoke('avisar', { body: { libre: true, para, asunto, texto } });
      if(error || !data || !data.enviados){ msg('No se pudo enviar. ' + ((data && data.error) || (error && error.message) || '')); return; }
      mostrar(cabecera('Correo enviado', 'Se ha enviado a ' + esc(data.a) + ' desde avisos@acgolf.es.')
        + '<button type="button" class="cg-btn" id="clOtro">Enviar otro</button>'
        + '<button type="button" class="cg-link" id="clVolver">Volver a Promociones</button>');
      $('clOtro').onclick = () => pantallaCorreoLibre(perfil);
      $('clVolver').onclick = () => pantallaPromociones(perfil);
    });
  }

  // Barra de arriba: «Ir a mi cuenta» (botón principal) y el nombre de mi grupo (secundario, abre la lista de grupos)
  const ICO_PERSONA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  const ICO_GRUPO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M17.5 13.6a5 5 0 0 1 4 4.9"/></svg>';
  // Tarjeta del Inicio: mientras el grupo tiene un solo jugador, anima al administrador a invitar a sus amigos
  async function tarjetaInvitar(perfil){
    try {
      if(!perfil.es_admin || perfil.solo_control || perfil.grupo_tipo !== 'liga' || !perfil.grupo_id) return;
      if(document.getElementById('invTarjeta')) return;
      const claveX = 'acgolf_inv_x_' + perfil.grupo_id;
      try { const x = parseInt(localStorage.getItem(claveX) || '0', 10); if(x && Date.now() - x < 7*24*3600*1000) return; } catch(e){}   // la cerró hace menos de 7 días
      const conv = document.getElementById('convHome'); if(!conv) return;
      const rm = await client.rpc('ga_miembros', { p_grupo: perfil.grupo_id });
      if(rm.error || !Array.isArray(rm.data) || rm.data.length >= 4) return;   // con 4 jugadores o más el grupo ya está completo: no sale
      const nJug = rm.data.length;
      const ri = await client.rpc('invitacion_de_mi_grupo', { p_nuevo: false });
      const inv = ri.data; if(ri.error || !inv || !inv.codigo) return;
      const enlace = APP_PRUEBAS + '?unirse=' + encodeURIComponent(inv.codigo);
      const texto = '⛳ Te invito a «' + inv.grupo + '» en acgolf, la app de golf entre amigos.\n\n1️⃣ Pulsa este enlace y crea tu cuenta:\n' + enlace + '\n\n2️⃣ Si la app te pide un código, escribe solo esto:\n' + inv.codigo;
      const t = document.createElement('div');
      t.className = 'inv-tarjeta'; t.id = 'invTarjeta';
      t.innerHTML = '<button type="button" class="inv-x" id="invX" aria-label="Cerrar">✕</button><div class="inv-et">Tu grupo</div>'
        + '<div class="inv-tit">' + (nJug > 1 ? '«' + esc(inv.grupo) + '»: ¡invita a más amigos!' : '«' + esc(inv.grupo) + '» está esperando a tus amigos') + '</div>'
        + '<p class="inv-txt">Este es tu sitio de juego: aquí jugáis tú y tus amigos. Mándales la invitación y entran directos, sin escribir nada.</p>'
        + '<a class="inv-btn pri" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Invitar por WhatsApp</a>'
        + '<button type="button" class="inv-btn" id="invQR">Enseñar el código QR</button>'
        + '<div class="inv-ok" id="invOk" aria-live="polite"></div>';
      conv.insertAdjacentElement('afterend', t);
      $('invQR').onclick = () => panelMiCuenta(perfil);
      $('invX').onclick = () => { try { localStorage.setItem(claveX, String(Date.now())); } catch(e){} t.remove(); };
    } catch(e){}
  }

  function botonMiCuenta(perfil){
    const barra = document.createElement('div');
    barra.className = 'cg-barra';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cg-mi cg-bt cg-bt-pri';
    b.title = 'Accede a tu perfil y configura tu cuenta';
    b.setAttribute('aria-describedby', 'cgMiAyuda');
    b.innerHTML = '<span class="cg-bt-ico">' + ICO_PERSONA + '</span><span class="cg-bt-txt">Ir a mi cuenta</span>'
      + '<span id="cgMiAyuda" class="cg-oculto">Accede a tu perfil y configura tu cuenta</span>';
    b.onclick = () => { cerrarMenuGrupos(); panelMiCuenta(perfil); };
    const sg = document.createElement('button');
    sg.type = 'button'; sg.className = 'cg-selgrupo cg-bt cg-bt-sec';
    sg.title = 'Elige el grupo al que perteneces para ver sus recursos';
    sg.setAttribute('aria-label', 'Mi grupo: ' + (perfil.grupo || 'sin grupo'));
    sg.setAttribute('aria-describedby', 'cgGrupoAyuda');
    sg.setAttribute('aria-haspopup', 'menu'); sg.setAttribute('aria-expanded', 'false'); sg.setAttribute('aria-controls', 'cgGruposMenu');
    sg.innerHTML = '<span class="cg-bt-ico">' + ICO_GRUPO + '</span><span class="cg-bt-txt">' + esc(perfil.grupo || 'Mi grupo') + '</span><span class="cg-bt-flecha" aria-hidden="true">▾</span>'
      + '<span id="cgGrupoAyuda" class="cg-oculto">Elige el grupo al que perteneces para ver sus recursos. Ahora estás en ' + esc(perfil.grupo || 'tu grupo') + '.</span>';
    sg.onclick = () => menuGrupos(perfil, sg);
    barra.appendChild(b); barra.appendChild(sg);
    document.body.appendChild(barra);
    if(window.acgolfAvatares) window.acgolfAvatares.recargar();
  }

  // Lista desplegable de grupos: ✓ en el grupo en el que estás; al tocar otro, se cambia
  let menuAbierto = null;
  function cerrarMenuGrupos(devolverFoco){
    if(!menuAbierto) return;
    const { menu, boton, fuera } = menuAbierto;
    menuAbierto = null;
    menu.remove();
    boton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', fuera, true);
    window.removeEventListener('resize', cerrarMenuGrupos);
    if(devolverFoco) boton.focus();
  }
  async function menuGrupos(perfil, boton){
    if(menuAbierto){ cerrarMenuGrupos(); return; }
    const menu = document.createElement('div');
    menu.id = 'cgGruposMenu'; menu.className = 'cg-gmenu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Tus grupos');
    menu.innerHTML = '<div class="cg-gmenu-t">Tus grupos</div><div class="cg-gmenu-cargando">Cargando…</div>';
    document.body.appendChild(menu);
    const r = boton.getBoundingClientRect(), ancho = Math.min(320, window.innerWidth - 20);
    menu.style.width = ancho + 'px';
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    menu.style.left = Math.round(Math.max(10, Math.min(r.right - ancho, window.innerWidth - ancho - 10))) + 'px';
    const fuera = e => { if(!menu.contains(e.target) && !boton.contains(e.target)) cerrarMenuGrupos(); };
    menuAbierto = { menu, boton, fuera };
    boton.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', fuera, true);
    window.addEventListener('resize', cerrarMenuGrupos);
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('[role^="menuitem"]:not(:disabled)')];
      const i = items.indexOf(document.activeElement);
      if(e.key === 'Escape'){ e.preventDefault(); cerrarMenuGrupos(true); }
      else if(e.key === 'ArrowDown'){ e.preventDefault(); if(items.length) items[(i + 1) % items.length].focus(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); if(items.length) items[(i - 1 + items.length) % items.length].focus(); }
      else if(e.key === 'Tab'){ cerrarMenuGrupos(); }
    });

    let grupos = [];
    try { const rg = await client.rpc('mis_grupos'); if(rg.error) throw rg.error; grupos = rg.data || []; } catch(e){}
    if(!menuAbierto || menuAbierto.menu !== menu) return;   // se cerró mientras cargaba
    menu.innerHTML = '<div class="cg-gmenu-t">Tus grupos</div>'
      + (grupos.length ? grupos.map(g => '<button type="button" role="menuitemradio" class="cg-gmenu-i' + (g.activo ? ' on' : '') + '" aria-checked="' + (g.activo ? 'true' : 'false') + '" data-g="' + esc(g.id) + '">'
          + '<span class="cg-gmenu-check" aria-hidden="true">' + (g.activo ? '✓' : '') + '</span>'
          + '<span class="cg-gmenu-n"><b>' + esc(g.nombre) + '</b><small>' + (g.admins && g.admins.length ? 'De ' + esc(g.admins.join(', ')) : (g.es_admin ? 'Eres el administrador' : 'Grupo')) + (g.activo ? ' · Estás aquí' : '') + '</small></span></button>').join('')
        : '<div class="cg-gmenu-cargando">No se pudieron cargar tus grupos. Revisa la conexión.</div>')
      + '<div class="cg-gmenu-msg" role="status"></div>'
      + '<button type="button" role="menuitem" class="cg-gmenu-gest">Gestionar grupos<small>Unirte con un código, crear o borrar un grupo</small></button>';
    menu.querySelectorAll('.cg-gmenu-i').forEach(it => it.onclick = async () => {
      if(it.classList.contains('on')){ cerrarMenuGrupos(true); return; }
      menu.querySelectorAll('.cg-gmenu-i').forEach(x => x.disabled = true);
      const sub = it.querySelector('small'), antes = sub.textContent;
      sub.textContent = 'Cambiando…';
      const { error } = await client.rpc('cambiar_grupo', { p_grupo: it.dataset.g });
      if(error){
        menu.querySelectorAll('.cg-gmenu-i').forEach(x => x.disabled = false);
        sub.textContent = antes;
        menu.querySelector('.cg-gmenu-msg').textContent = traducir(error);
        return;
      }
      location.reload();
    });
    menu.querySelector('.cg-gmenu-gest').onclick = () => { cerrarMenuGrupos(); pantallaMisGrupos(perfil); };
    const primero = menu.querySelector('.cg-gmenu-i.on') || menu.querySelector('[role^="menuitem"]');
    if(primero) primero.focus({ preventScroll: true });
  }

  // ---------- Arranque ----------
  mostrar('<div class="cg-head">' + LOGO_APP + '<p class="cg-sub">Cargando…</p></div>');
  let recuperando = /type=recovery/.test(location.hash);
  if(client) client.auth.onAuthStateChange(ev => { if(ev === 'PASSWORD_RECOVERY'){ recuperando = true; pantallaNuevaClave(); } });

  (async function arrancar(){
    if(!client){ mostrar(cabecera('Sin conexión', 'No se ha podido conectar. Revisa la cobertura.') + '<button type="button" class="cg-btn" onclick="location.reload()">Reintentar</button>'); return; }
    let session = null, sinCuentaAviso = '';
    try { ({ data:{ session } } = await client.auth.getSession()); } catch(e){}
    if(recuperando && session){ pantallaNuevaClave(); return; }
    if(enlaceFallido && !session){ pantallaEnlaceFallido(); return; }
    // Ya no se puede jugar sin registro: una sesión anónima antigua se cierra
    if(session && session.user && session.user.is_anonymous){ try { await client.auth.signOut(); } catch(e){} session = null; sinCuentaAviso = 'Esta app ahora es solo con cuenta. Crea la tuya, es gratis y se hace en un minuto.'; }
    if(!session){ try { localStorage.removeItem('acgolfEsAdmin'); } catch(e){} if(yaEntroAntes() || codigoAdmin()) pantallaEntrar(sinCuentaAviso); else pantallaCrear(sinCuentaAviso); return; }
    const { data: perfil, error } = await client.rpc('mi_perfil');
    if(error){ mostrar(cabecera('Sin conexión', traducir(error)) + '<button type="button" class="cg-btn" onclick="location.reload()">Reintentar</button>'); return; }
    // Cuenta nueva (con Google o con correo): se apunta aquí para que cuente siempre, venga por donde venga
    if(!perfil){ evento('registro'); pantallaCompletar(session.user && session.user.email); return; }
    if(perfil.es_prueba){ try { await client.auth.signOut(); } catch(e){} pantallaCrear('Esta app ahora es solo con cuenta. Crea la tuya, es gratis y se hace en un minuto.'); return; }   // cuentas de «probar sin registro»: ya no existen
    if(!perfil.es_prueba){
      try { localStorage.setItem('acgolfYaEntro', '1'); } catch(e){}
      let falta = false; try { falta = localStorage.getItem('acgolfFaltaClave') === '1'; localStorage.removeItem('acgolfFaltaClave'); } catch(e){}
      if(falta){ pantallaNuevaClave(); return; }
    }
    if(codigoAdmin()){ pantallaCodigoAdmin(perfil.email, perfil, codigoAdmin()); return; }
    if(invitacion()){ pantallaUnirse(perfil.email, invitacion()); return; }
    const eraAdmin = esAdminGuardado();
    let eraYo = ''; try { eraYo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
    try { localStorage.setItem('acgolfEsAdmin', perfil.es_admin ? '1' : '0'); } catch(e){}
    // "quién soy" = el de la cuenta. En un grupo ajeno (super administrador revisando) no es nadie: no sale en ninguna lista
    try { if(perfil.solo_control) localStorage.removeItem('golfAppConvMe'); else localStorage.setItem('golfAppConvMe', perfil.player_name); } catch(e){}
    window.miPerfil = perfil;
    document.documentElement.classList.toggle('es-super', !!perfil.es_super); // los greens solo los toca el super administrador
    window.miPerfilId = session.user && session.user.id;
    // si cambian los permisos o "quién soy", se recarga una vez para que toda la app lo tenga en cuenta
    if(eraAdmin !== !!perfil.es_admin || eraYo !== (perfil.solo_control ? '' : perfil.player_name)){ location.reload(); return; }
    botonMiCuenta(perfil);
    // Grupo nuevo: el administrador elige su plan y paga antes de entrar
    if(perfil.es_admin && perfil.grupo_tipo === 'liga'){
      let plan = null;
      try { const r = await client.rpc('mi_plan'); if(!r.error) plan = r.data; } catch(e){}
      if(plan && (plan.estado === 'elegir' || plan.estado === 'pendiente_pago')){ pantallaPlanes(plan); return; }
    }
    const P = window.acgolfPortada;
    if(P){
      const pintar = () => P.aplicar(perfil);
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();
      // Grupo recién creado: el administrador monta la portada e invita a los demás
      // (antes salía el asistente de la portada; ahora una bienvenida sencilla y la portada se cambia luego desde «Mi cuenta»)
      if(perfil.es_admin && !perfil.solo_control && perfil.grupo_tipo === 'liga' && !(perfil.grupo_marca || {}).hecho && !P.esPortadaOriginal(perfil) && !bienvenidaVista(perfil)){
        bienvenidaGrupo(perfil); return;
      }
    }
    ocultar();
    tarjetaInvitar(perfil);
  })();
})();
