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
  try {
    const inv = new URLSearchParams(location.search).get('unirse');
    if(inv){ localStorage.setItem('acgolfInvitacion', inv.trim().toUpperCase()); history.replaceState(null, '', location.pathname); }
  } catch(e){}
  const invitacion = () => { try { return localStorage.getItem('acgolfInvitacion') || ''; } catch(e){ return ''; } };
  const olvidarInvitacion = () => { try { localStorage.removeItem('acgolfInvitacion'); } catch(e){} };

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

  const aceptoHtml = '<label class="cg-acepto"><input type="checkbox" id="cgAcepto"><span>He leído y acepto la <a href="privacidad.html" target="_blank" rel="noopener">política de privacidad</a> y las <a href="condiciones.html" target="_blank" rel="noopener">condiciones de uso</a>.</span></label>';
  const leerHcp = id => { const v = parseFloat(String(($(id) || {}).value || '').replace(',', '.')); return isNaN(v) ? null : v; };

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
    mostrar(cabecera('Te unes a «' + esc(info.grupo) + '»', libres.length ? 'Toca tu nombre. Si no estás en la lista, escríbelo abajo.' : 'Escribe tu nombre y tu hándicap.')
      + (libres.length ? '<div class="cg-nombres">' + libres.map(n => '<button type="button" class="cg-nombre" data-n="' + esc(n) + '">' + esc(n) + '</button>').join('') + '</div>'
          + '<div class="cg-sep">¿No estás en la lista?</div>' : '')
      + '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name"></label>'
      + '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4</small><input id="cgHcp" type="text" inputmode="decimal"></label>'
      + aceptoHtml + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgEmpezar">Entrar en el grupo</button>'
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    gate.querySelectorAll('.cg-nombre').forEach(b => b.onclick = () => {
      elegido = elegido === b.dataset.n ? '' : b.dataset.n;
      gate.querySelectorAll('.cg-nombre').forEach(x => x.classList.toggle('on', x.dataset.n === elegido));
      if(elegido){ $('cgNombre').value = ''; $('cgHcp').value = ''; }
    });
    $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
    $('cgEmpezar').onclick = e => ocupado(e.target, async () => {
      const nombre = elegido || $('cgNombre').value.trim();
      if(!nombre){ msg('Toca tu nombre o escríbelo.'); return; }
      const hcp = elegido ? null : leerHcp('cgHcp');
      if(!elegido && hcp === null){ msg('Escribe tu hándicap.'); return; }
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

  // Cuenta nueva sin invitación: empezar gratis (espacio personal), Los Iscariotes o crear un grupo
  function pantallaBienvenida(email){
    mostrar(cabecera('Bienvenido', 'Elige cómo quieres empezar. Solo se hace una vez.')
      + '<div class="cg-opcion"><b>⛳ Empezar gratis</b><span>Apunta tus partidas, lleva tu hándicap y usa el caddie. Solo lo ves tú.</span>'
      +   '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" autocomplete="name"></label>'
      +   '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4</small><input id="cgHcp" type="text" inputmode="decimal"></label>'
      +   aceptoHtml + '<div id="cgMsg" class="cg-msg"></div>'
      +   '<button type="button" class="cg-btn" id="cgPersonal">Empezar</button></div>'
      + '<div class="cg-sep">¿Juegas con un grupo de amigos?</div>'
      + '<p class="cg-p" style="font-size:14px;">Si te han mandado un enlace de invitación, ábrelo desde el mensaje y entrarás en tu grupo.</p>'
      + '<button type="button" class="cg-btn ghost" id="cgIscariotes">Soy de Los Iscariotes</button>'
      + '<button type="button" class="cg-btn ghost" id="cgNuevoGrupo">Crear un grupo con liga</button>'
      + '<button type="button" class="cg-link" id="cgSalir">No soy ' + esc(email || 'yo') + ': salir</button>');
    $('cgIscariotes').onclick = () => pantallaCompletar(email, true);
    $('cgNuevoGrupo').onclick = () => pantallaCrearGrupo(email);
    $('cgSalir').onclick = async () => { await client.auth.signOut(); location.reload(); };
    $('cgPersonal').onclick = e => ocupado(e.target, async () => {
      const nombre = $('cgNombre').value.trim(), hcp = leerHcp('cgHcp');
      if(!nombre){ msg('Escribe tu nombre.'); return; }
      if(hcp === null){ msg('Escribe tu hándicap.'); return; }
      if(!$('cgAcepto').checked){ msg('Para seguir tienes que aceptar la política de privacidad.'); return; }
      const { error } = await client.rpc('empezar_personal', { p_player: nombre, p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    });
  }

  // Mis grupos: cambiar de grupo, crear uno, unirse con un código o empezar el espacio personal
  async function pantallaMisGrupos(perfil){
    mostrar(cabecera('Mis grupos', 'Cargando…'));
    let grupos = [];
    try { const r = await client.rpc('mis_grupos'); if(r.error) throw r.error; grupos = r.data || []; } catch(e){}
    const tienePersonal = grupos.some(g => g.tipo === 'personal');
    mostrar(cabecera('Mis grupos', 'Toca un grupo para entrar en él. Cada grupo solo ve lo suyo.')
      + '<div class="cg-grupos">' + grupos.map(g => '<button type="button" class="cg-grupo' + (g.activo ? ' on' : '') + '" data-g="' + esc(g.id) + '">'
          + '<b>' + (g.tipo === 'personal' ? '⛳ ' : '🏆 ') + esc(g.nombre) + '</b>'
          + '<span>' + (g.tipo === 'personal' ? 'Tu espacio personal (gratis)' : 'Grupo con liga') + ' · ' + esc(g.jugador) + (g.es_admin && g.tipo !== 'personal' ? ' · Administrador' : '') + '</span>'
          + (g.activo ? '<i>Estás aquí</i>' : '') + '</button>').join('') + '</div>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<div class="cg-sep">Unirme a otro grupo</div>'
      + '<label class="cg-lbl">Código de invitación<small>Viene al final del enlace que te mandaron</small><input id="cgCodigo" type="text" autocapitalize="characters" maxlength="12"></label>'
      + '<button type="button" class="cg-btn ghost" id="cgUnirme">Unirme</button>'
      + '<button type="button" class="cg-btn ghost" id="cgNuevoGrupo">Crear un grupo con liga</button>'
      + (tienePersonal ? '' : '<button type="button" class="cg-btn ghost" id="cgPersonal">Empezar mi espacio personal</button>')
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    gate.querySelectorAll('.cg-grupo').forEach(b => b.onclick = async () => {
      if(b.classList.contains('on')){ ocultar(); return; }
      b.disabled = true;
      const { error } = await client.rpc('cambiar_grupo', { p_grupo: b.dataset.g });
      if(error){ b.disabled = false; msg(traducir(error)); return; }
      location.reload();
    });
    $('cgUnirme').onclick = () => {
      const c = $('cgCodigo').value.trim().toUpperCase().replace(/.*UNIRSE=/, '');
      if(!c){ msg('Escribe el código.'); return; }
      try { localStorage.setItem('acgolfInvitacion', c); } catch(e){}
      pantallaUnirse(perfil.email, c);
    };
    $('cgNuevoGrupo').onclick = () => pantallaCrearGrupo(perfil.email, true);
    const pp = $('cgPersonal'); if(pp) pp.onclick = () => pantallaPersonalExtra(perfil);
  }

  function pantallaPersonalExtra(perfil){
    mostrar(cabecera('Mi espacio personal', 'Tus partidas, tu hándicap y tu caddie, solo para ti.')
      + '<label class="cg-lbl">Tu nombre y apellidos<input id="cgNombre" type="text" value="' + esc(perfil.player_name) + '"></label>'
      + '<label class="cg-lbl">Tu hándicap<small>Por ejemplo 18,4</small><input id="cgHcp" type="text" inputmode="decimal"></label>'
      + '<div id="cgMsg" class="cg-msg"></div>'
      + '<button type="button" class="cg-btn" id="cgPersonal">Crear mi espacio</button>'
      + '<button type="button" class="cg-link" id="cgVolver">Volver</button>');
    $('cgVolver').onclick = () => pantallaMisGrupos(perfil);
    $('cgPersonal').onclick = e => ocupado(e.target, async () => {
      const hcp = leerHcp('cgHcp');
      if(hcp === null){ msg('Escribe tu hándicap.'); return; }
      const { error } = await client.rpc('empezar_personal', { p_player: $('cgNombre').value.trim(), p_hcp: hcp, p_version: VERSION_PRIVACIDAD });
      if(error){ msg(traducir(error)); return; }
      location.reload();
    });
  }

  async function pantallaCompletar(email, iscariotes){
    if(invitacion()){ pantallaUnirse(email, invitacion()); return; }
    if(!iscariotes){ pantallaBienvenida(email); return; }
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
        const texto = '⛳ Te invito a «' + inv.grupo + '» en la app de golf. Crea tu cuenta desde este enlace y entrarás directamente en el grupo:\n' + enlace;
        box.innerHTML = '<b>Invitar a «' + esc(inv.grupo) + '»</b>'
          + '<div class="cg-enlace">' + esc(enlace) + '</div>'
          + '<a class="cg-btn" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
          + '<button type="button" class="cg-btn ghost" id="cgCopiar">Copiar el enlace</button>'
          + '<p class="cg-p" style="font-size:16px;margin-top:4px;">Este enlace también lo tienes siempre en «Mi cuenta».</p>';
        $('cgCopiar').onclick = async () => { try { await navigator.clipboard.writeText(enlace); msg('Enlace copiado.', true); } catch(e){ prompt('Copia el enlace:', enlace); } };
      } catch(e){ const box = $('cgInvita'); if(box) box.remove(); }
    }

    paso1();
  }

  // ---------- Mi cuenta ----------
  function panelMiCuenta(perfil){
    mostrar('<div class="cg-head"><div class="cg-eyebrow">Mi cuenta</div><h1 class="cg-title">' + esc(perfil.player_name) + '</h1>'
      + '<p class="cg-sub">' + (perfil.grupo ? 'Grupo <b>' + esc(perfil.grupo) + '</b><br>' : '') + esc(perfil.email) + (perfil.es_admin ? ' · <b>Administrador</b>' : '') + '</p></div>'
      + (perfil.es_admin ? '<div class="cg-invita" id="cgInvita"><b>Invitar a tu grupo</b><div class="cg-p" style="margin:6px 0;">Cargando enlace…</div></div>' : '')
      + '<div id="cgMsg" class="cg-msg"></div>'
      + (perfil.es_admin && perfil.grupo_tipo === 'liga' ? '<button type="button" class="cg-btn ghost" id="cgPortada">Cambiar la portada del grupo</button>' : '')
      + '<button type="button" class="cg-btn" id="cgMisGrupos">Mis grupos' + (perfil.num_grupos > 1 ? ' (' + perfil.num_grupos + ')' : '') + '</button>'
      + '<button type="button" class="cg-btn ghost" id="cgDatos">Descargar mis datos</button>'
      + '<button type="button" class="cg-btn ghost" id="cgClave">Cambiar mi contraseña</button>'
      + '<button type="button" class="cg-btn ghost" id="cgSalir">Cerrar sesión en este móvil</button>'
      + '<button type="button" class="cg-btn danger" id="cgBorrar">Borrar mi cuenta</button>'
      + '<p class="cg-legal"><a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a> · <a href="condiciones.html" target="_blank" rel="noopener">Condiciones de uso</a><br>Aceptadas el ' + esc(new Date(perfil.privacidad_aceptada_en).toLocaleDateString('es-ES')) + '</p>'
      + '<button type="button" class="cg-btn" id="cgCerrar">Volver a la app</button>');
    $('cgCerrar').onclick = ocultar;
    $('cgMisGrupos').onclick = () => pantallaMisGrupos(perfil);
    if($('cgPortada')) $('cgPortada').onclick = () => asistentePortada(perfil, true);
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
        const texto = '⛳ Te invito a «' + inv.grupo + '» en la app de golf. Crea tu cuenta desde este enlace y entrarás directamente en el grupo:\n' + enlace;
        box.innerHTML = '<b>Invitar a «' + esc(inv.grupo) + '»</b>'
          + '<div class="cg-p" style="margin:6px 0;">Manda este enlace a los de tu grupo. Al abrirlo y crear su cuenta, entran directamente.</div>'
          + '<div class="cg-enlace">' + esc(enlace) + '</div>'
          + '<a class="cg-btn" href="https://wa.me/?text=' + encodeURIComponent(texto) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>'
          + '<button type="button" class="cg-btn ghost" id="cgCopiar">Copiar el enlace</button>'
          + '<button type="button" class="cg-link" id="cgNuevoEnlace">Cambiar el enlace (el anterior deja de valer)</button>';
        $('cgCopiar').onclick = async () => { try { await navigator.clipboard.writeText(enlace); msg('Enlace copiado.', true); } catch(e){ prompt('Copia el enlace:', enlace); } };
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

  function botonMiCuenta(perfil){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cg-mi'; b.setAttribute('aria-label', 'Mi cuenta');
    b.textContent = '👤 ' + String(perfil.player_name).split(' ')[0];
    b.onclick = () => panelMiCuenta(perfil);
    document.body.appendChild(b);
    const sg = document.createElement('button');
    sg.type = 'button'; sg.className = 'cg-selgrupo'; sg.setAttribute('aria-label', 'Cambiar de grupo');
    sg.textContent = (perfil.grupo_tipo === 'personal' ? '⛳ ' : '🏆 ') + (perfil.grupo || 'Mi grupo') + ' ▾';
    sg.onclick = () => pantallaMisGrupos(perfil);
    document.body.appendChild(sg);
  }

  // ---------- Arranque ----------
  mostrar('<div class="cg-head">' + LOGO_APP + '<p class="cg-sub">Cargando…</p></div>');
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
    if(invitacion()){ pantallaUnirse(perfil.email, invitacion()); return; }
    const eraAdmin = esAdminGuardado();
    let eraYo = ''; try { eraYo = localStorage.getItem('golfAppConvMe') || ''; } catch(e){}
    try { localStorage.setItem('acgolfEsAdmin', perfil.es_admin ? '1' : '0'); } catch(e){}
    try { localStorage.setItem('golfAppConvMe', perfil.player_name); } catch(e){} // "quién soy" = el de la cuenta
    window.miPerfil = perfil;
    // si cambian los permisos o "quién soy", se recarga una vez para que toda la app lo tenga en cuenta
    if(eraAdmin !== !!perfil.es_admin || eraYo !== perfil.player_name){ location.reload(); return; }
    botonMiCuenta(perfil);
    const P = window.acgolfPortada;
    if(P){
      const pintar = () => P.aplicar(perfil);
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintar); else pintar();
      // Grupo recién creado: el administrador monta la portada e invita a los demás
      if(perfil.es_admin && perfil.grupo_tipo === 'liga' && !(perfil.grupo_marca || {}).hecho && !P.esPortadaOriginal(perfil)){
        asistentePortada(perfil, false); return;
      }
    }
    ocultar();
  })();
})();
