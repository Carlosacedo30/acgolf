/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Inscripción a una Ryder por equipos (ej. Sevilla – Betis) ---
// El administrador abre la inscripción y manda por WhatsApp un mensaje con DOS enlaces, uno por equipo.
// Quien pulsa su enlace entra en acgolf (si no tiene sesión, primero entra) y ve una pantalla con un solo botón
// para apuntarse a ese equipo. Todos ven los dos equipos con los nombres completos. El administrador puede
// pasar a alguien de equipo, quitarlo, cerrar la lista o borrar la inscripción.
// Se guarda como una fila de «rounds» sin campo (igual que las convocatorias): no sale en «Últimas partidas» ni cuenta para la liga.
(function(){
  const TAG = 'Inscripción Ryder';
  const COLORES = ['#D7263D', '#2E9E4F'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const admin = () => !!(window.miPerfil && window.miPerfil.es_admin);
  const yo = () => (window.miPerfil && window.miPerfil.player_name) || '';
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = () => location.origin + location.pathname;
  const enlaceEquipo = (r, i) => base() + '?ryder=' + r.code + '&equipo=' + norm(r.equipos[i].nombre);

  let r = null;          // la inscripción que se está viendo
  let canal = null;
  let elegido = '';      // equipo que venía en el enlace (se guarda sin acentos ni espacios)
  let creando = false;
  let editando = false;   // el administrador cambia el día y el campo
  let pedida = false;    // se pidió una inscripción concreta (por enlace)
  const esInvitado = () => document.documentElement.classList.contains('es-invitado');
  const PEND = 'acgolfRyderPendiente';
  const leerPend = () => { try { const v = JSON.parse(localStorage.getItem(PEND) || 'null'); return v && Date.now() - v.t < 7 * 864e5 ? v : null; } catch(e){ return null; } };
  const borrarPend = () => { try { localStorage.removeItem(PEND); } catch(e){} };
  let ov = null;

  function deFila(row){
    const mg = Array.isArray(row.match_groups) ? row.match_groups : [];
    const meta = (mg.find(g => g && g.meta) || {}).meta || {};
    const eqs = mg.filter(g => g && g.equipo).slice(0, 2).map((g, i) => ({ nombre: String(g.nombre || ('Equipo ' + (i + 1))), color: g.color || COLORES[i], capitan: String(g.capitan || ''), players: Array.isArray(g.players) ? g.players.slice() : [] }));
    while(eqs.length < 2) eqs.push({ nombre: 'Equipo ' + (eqs.length + 1), color: COLORES[eqs.length], capitan: '', players: [] });
    return { id: row.id, code: row.code, updatedAt: row.updated_at, titulo: meta.titulo || '', fecha: meta.fecha || '', campo: meta.campo || '', cerrada: !!meta.cerrada, equipos: eqs };
  }
  function aGrupos(x){
    return x.equipos.map((e, i) => ({ equipo: String(i + 1), nombre: e.nombre, color: e.color, capitan: e.capitan || '', players: e.players, handicaps: [], scores: {} }))
      .concat([{ players: [], handicaps: [], scores: {}, meta: { titulo: x.titulo, fecha: x.fecha, campo: x.campo, cerrada: !!x.cerrada } }]);
  }
  const esCap = (x, n) => x.equipos.some(e => e.capitan && norm(e.capitan) === norm(n));
  const tituloDe = x => x.titulo || (x.equipos[0].nombre + ' – ' + x.equipos[1].nombre);
  function fechaLarga(iso){
    if(!iso) return '';
    const s = new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const datosTxt = x => 'Fecha: ' + (fechaLarga(x.fecha) || 'por confirmar') + ' · Campo: ' + (x.campo || 'por confirmar');

  // Se lee con una función de la base: así la ven jugadores de cualquier grupo (el mismo WhatsApp va a varios grupos)
  const ULTIMA = 'acgolfRyderUltima';
  async function traer(code){
    const client = initSupabase(); if(!client) return null;
    const { data, error } = await client.rpc('ryder_ins_leer', { p_code: code || null });
    if(error || !data) return null;
    return deFila(data);
  }
  // Cambia la inscripción sin pisar lo que haga otro a la vez (se relee, se aplica y se guarda si nadie la tocó)
  async function cambiar(fn){
    const client = initSupabase(); if(!client || !r) return false;
    for(let n = 0; n < 4; n++){
      const fresca = await traer(r.code); if(!fresca) return false;
      const msg = fn(fresca);
      if(msg){ r = fresca; pintar(); alert(msg); return false; }
      const ahora = new Date().toISOString();
      const { data, error } = await client.from('rounds').update({ match_groups: aGrupos(fresca), updated_at: ahora }).eq('id', fresca.id).eq('updated_at', fresca.updatedAt).select('id');
      if(error){ console.error(error); break; }
      if(data && data.length){ fresca.updatedAt = ahora; r = fresca; pintar(); return true; }
    }
    alert('No se pudo guardar. Revisa la conexión e inténtalo otra vez.');
    return false;
  }
  function vigilar(){
    const client = initSupabase(); if(!client || !r) return;
    if(canal){ try { client.removeChannel(canal); } catch(e){} }
    canal = client.channel('ryins-' + r.id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.' + r.id }, p => {
      if(p.new && ov && !ov.hidden && !creando && !editando){ r = deFila(p.new); pintar(); }
    }).subscribe();
  }

  const dondeEstoy = x => x.equipos.findIndex(e => e.players.some(n => norm(n) === norm(yo())));
  // Apuntarse, cambiarse o quitarse uno mismo: lo hace la base con el nombre del perfil (equipo 1 o 2; 0 = quitarse)
  async function conmigo(equipo){
    const client = initSupabase(); if(!client || !r) return false;
    if(!yo()){ alert('Primero completa tu nombre en «Mi cuenta».'); return false; }
    const { data, error } = await client.rpc('ryder_ins_apuntar', { p_code: r.code, p_equipo: equipo });
    if(error){ alert(error.message || 'No se pudo guardar. Revisa la conexión e inténtalo otra vez.'); const f = await traer(r.code).catch(() => null); if(f){ r = f; pintar(); } return false; }
    r = deFila(data); pintar(); return true;
  }
  const apuntar = i => conmigo(i + 1);
  async function quitar(nombre){
    await cambiar(x => { if(esCap(x, nombre)) return 'Un capitán no se puede quitar de la lista.'; x.equipos.forEach(e => { e.players = e.players.filter(n => n !== nombre); }); return null; });
  }
  async function pasar(nombre, i){
    await cambiar(x => { if(esCap(x, nombre)) return 'Un capitán no se puede pasar de equipo.'; x.equipos.forEach(e => { e.players = e.players.filter(n => n !== nombre); }); x.equipos[i].players.push(nombre); return null; });
  }

  // ---------- Pantalla ----------
  function ventana(){
    if(ov) return ov;
    ov = document.createElement('div'); ov.className = 'ri-ov'; ov.id = 'riOverlay'; ov.hidden = true;
    ov.addEventListener('click', alTocar);
    document.body.appendChild(ov);
    return ov;
  }
  function cabecera(x){
    return '<button type="button" class="ri-x" data-ri="cerrar" aria-label="Cerrar">✕</button><div class="ri-k">Ryder Cup</div>'
      + '<h1 class="ri-h">' + esc(x ? tituloDe(x) : 'Ryder Cup') + '</h1>' + (x ? '<div class="ri-dat">' + esc(datosTxt(x)) + '</div>' : '');
  }
  function pintar(){
    const o = ventana();
    if(creando){ pintarCrear(o); return; }
    if(editando && r){ pintarEditar(o); return; }
    if(esInvitado()){
      o.innerHTML = '<div class="ri-in">' + cabecera(null) + '<div class="ri-tj"><b style="font:900 21px Archivo,system-ui,sans-serif">Para apuntarte necesitas tu cuenta</b>'
        + '<div class="ri-dat" style="color:#F2F4F5">En la Ryder no se admiten invitados. Crea tu cuenta en acgolf (es gratis y lleva un minuto) y vuelve a pulsar tu enlace de WhatsApp. Si ya la has creado y confirmado, te llevaremos a tu equipo.</div></div>'
        + '<button type="button" class="ri-btn ri-pri" data-ri="cuenta">Crear mi cuenta</button></div>';
      return;
    }
    if(!r){
      o.innerHTML = '<div class="ri-in">' + cabecera(null) + '<div class="ri-vacio">' + (pedida
        ? 'No encontramos esta inscripción.<br>Puede que el organizador la haya borrado o que el enlace esté cortado. Pídele que te lo mande otra vez.'
        : 'Todavía no hay ninguna inscripción abierta.') + '</div>'
        + (admin() ? '<button type="button" class="ri-btn ri-pri" data-ri="nueva">Abrir una inscripción</button>' : '') + '</div>';
      return;
    }
    const mi = dondeEstoy(r), x = r;
    const idxElegido = elegido ? x.equipos.findIndex(e => norm(e.nombre) === elegido) : -1;
    let h = '<div class="ri-in">' + cabecera(x) + bandaCapitanes(x);
    if(x.cerrada && mi < 0){
      h += '<div class="ri-tj"><b style="font:900 19px Archivo,system-ui,sans-serif">La lista está cerrada</b><div class="ri-dat">Ya no se admiten más jugadores. Habla con el organizador.</div></div>';
    } else if(mi >= 0){
      h += '<div class="ri-tj ri-ok"><b>¡Estás apuntado con el ' + esc(x.equipos[mi].nombre.toUpperCase()) + '!</b><span>Te avisaremos cuando se cierre la lista.</span></div>';
      if(!x.cerrada) h += '<button type="button" class="ri-btn ri-sec" data-ri="ap" data-i="' + (1 - mi) + '">Cambiarme al ' + esc(x.equipos[1 - mi].nombre.toUpperCase()) + '</button>'
        + '<button type="button" class="ri-link" data-ri="salir">Quitarme de la lista</button>';
    } else {
      const i = idxElegido >= 0 ? idxElegido : -1;
      if(i >= 0){
        h += '<div class="ri-tj"><div class="ri-eq"><span class="ri-pt" style="background:' + esc(x.equipos[i].color) + '"></span><div><b>Vas con el ' + esc(x.equipos[i].nombre.toUpperCase()) + '</b><small>Equipo elegido desde el enlace</small></div></div>'
          + '<div class="ri-nom">' + esc(yo() || 'Falta tu nombre') + '</div></div>'
          + '<button type="button" class="ri-btn ri-pri" data-ri="ap" data-i="' + i + '">Apuntarme al ' + esc(x.equipos[i].nombre.toUpperCase()) + '</button>'
          + '<button type="button" class="ri-btn ri-sec" data-ri="ap" data-i="' + (1 - i) + '">Cambiar al ' + esc(x.equipos[1 - i].nombre.toUpperCase()) + '</button>';
      } else {
        h += '<div class="ri-tj"><div class="ri-nom" style="margin-top:0">¿Con quién juegas?</div><div class="ri-dat">' + esc(yo()) + '</div></div>'
          + x.equipos.map((e, k) => '<button type="button" class="ri-btn ' + (k ? 'ri-sec' : 'ri-pri') + '" data-ri="ap" data-i="' + k + '">Soy del ' + esc(e.nombre.toUpperCase()) + '</button>').join('');
      }
    }
    h += '<div class="ri-dos">' + x.equipos.map((e, k) => '<div class="ri-tj"><div class="ri-eq"><span class="ri-pt" style="background:' + esc(e.color) + '"></span><b style="font-size:18px">' + esc(e.nombre.toUpperCase()) + '</b></div>'
      + '<div class="ri-cnt">' + e.players.length + '</div><div class="ri-li">'
      + (e.players.filter(n => !(e.capitan && norm(n) === norm(e.capitan))).length ? e.players.filter(n => !(e.capitan && norm(n) === norm(e.capitan))).map(n => '<div><span class="' + (norm(n) === norm(yo()) ? 'yo' : '') + '">' + esc(n) + '</span>'
        + (admin() ? '<span><button type="button" class="ri-mini" data-ri="pasar" data-n="' + esc(n) + '" data-i="' + (1 - k) + '" title="Pasar al otro equipo">↔</button> <button type="button" class="ri-mini" data-ri="quitar" data-n="' + esc(n) + '" title="Quitar">✕</button></span>' : '') + '</div>').join('') : '<div class="vacio">Nadie más todavía</div>')
      + '</div></div>').join('') + '</div>';
    if(admin()){
      h += '<div class="ri-adm"><h3>Solo administrador</h3>'
        + '<button type="button" class="ri-btn ri-pri" data-ri="wa">Mandar al WhatsApp</button>'
        + '<button type="button" class="ri-btn ri-sec" data-ri="copiar">Copiar el mensaje</button>'
        + '<button type="button" class="ri-btn ri-sec" data-ri="editar">Cambiar día y campo</button>'
        + '<button type="button" class="ri-btn ri-sec" data-ri="cerrarlista">' + (x.cerrada ? 'Abrir la lista otra vez' : 'Cerrar la lista') + '</button>'
        + '<button type="button" class="ri-link" data-ri="borrar">Borrar esta inscripción</button></div>';
    }
    o.innerHTML = h + '</div>';
  }
  const iniciales = n => String(n || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  function bandaCapitanes(x){
    if(!x.equipos.some(e => e.capitan)) return '';
    return '<div class="ri-caps">' + x.equipos.map(e => e.capitan
      ? '<div class="ri-capt" style="--c:' + esc(e.color) + '"><span class="ri-ini">' + esc(iniciales(e.capitan)) + '</span>'
        + '<small>Capitán del ' + esc(e.nombre) + '</small><b>' + esc(e.capitan) + '</b></div>' : '').join('<span class="ri-vs">VS</span>') + '</div>';
  }
  function pintarEditar(o){
    const hoy = new Date().toISOString().slice(0, 10);
    o.innerHTML = '<div class="ri-in">' + cabecera(r).replace('Ryder Cup</div>', 'Cambiar día y campo</div>')
      + '<label class="ri-lab">Día (déjalo vacío si aún no se sabe)<input id="riF" type="date" class="ri-inp" value="' + esc(r.fecha) + '" min="' + hoy + '"></label>'
      + '<label class="ri-lab">Campo (déjalo vacío si aún no se sabe)<input id="riC" class="ri-inp" maxlength="60" placeholder="Por confirmar" value="' + esc(r.campo) + '"></label>'
      + '<button type="button" class="ri-btn ri-pri" data-ri="guardarEd">Guardar</button>'
      + '<button type="button" class="ri-link" data-ri="volverEd">Volver</button></div>';
  }
  function pintarCrear(o){
    const hoy = new Date().toISOString().slice(0, 10);
    o.innerHTML = '<div class="ri-in">' + cabecera(null).replace('Ryder Cup</h1>', 'Nueva inscripción</h1>')
      + '<label class="ri-lab">Equipo 1<input id="riE1" class="ri-inp" maxlength="24" value="Sevilla"></label>'
      + '<label class="ri-lab">Capitán del equipo 1 (nombre completo)<input id="riK1" class="ri-inp" maxlength="60" value="Juan Ramon Burgos Cantos"></label>'
      + '<label class="ri-lab">Equipo 2<input id="riE2" class="ri-inp" maxlength="24" value="Betis"></label>'
      + '<label class="ri-lab">Capitán del equipo 2 (nombre completo)<input id="riK2" class="ri-inp" maxlength="60" value="Jose Moises Romero Martinez"></label>'
      + '<label class="ri-lab">Día (puedes dejarlo vacío)<input id="riF" type="date" class="ri-inp" min="' + hoy + '"></label>'
      + '<label class="ri-lab">Campo (puedes dejarlo vacío)<input id="riC" class="ri-inp" maxlength="60" placeholder="Por confirmar"></label>'
      + '<button type="button" class="ri-btn ri-pri" data-ri="crear">Abrir la inscripción</button>'
      + '<button type="button" class="ri-link" data-ri="atras">Volver</button></div>';
  }
  function mensaje(){
    const e = r.equipos;
    return '¡Se abre la Ryder ' + e[0].nombre + ' – ' + e[1].nombre + '! Elige tu equipo y apúntate en acgolf. Un toque y listo:\n\n'
      + '👉 Soy del ' + e[0].nombre.toUpperCase() + ': ' + enlaceEquipo(r, 0) + '\n'
      + '👉 Soy del ' + e[1].nombre.toUpperCase() + ': ' + enlaceEquipo(r, 1) + '\n\n'
      + '¿No tienes cuenta? Créala gratis en acgolf.es y vuelve a pulsar tu enlace. No se admiten invitados.\n\n'
      + (e[0].capitan && e[1].capitan ? 'Capitanes: ' + e[0].capitan + ' (' + e[0].nombre + ') y ' + e[1].capitan + ' (' + e[1].nombre + ')\n' : '') + datosTxt(r);
  }
  async function crear(){
    const client = initSupabase(); if(!client) return;
    const n1 = (document.getElementById('riE1').value || '').trim(), n2 = (document.getElementById('riE2').value || '').trim();
    if(!n1 || !n2 || norm(n1) === norm(n2)){ alert('Pon dos nombres de equipo distintos.'); return; }
    const x = { titulo: '', fecha: document.getElementById('riF').value || '', campo: (document.getElementById('riC').value || '').trim(), cerrada: false,
      equipos: [{ nombre: n1, color: COLORES[0] }, { nombre: n2, color: COLORES[1] }].map((e, k) => { const c = (document.getElementById(k ? 'riK2' : 'riK1').value || '').trim(); return Object.assign(e, { capitan: c, players: c ? [c] : [] }); }) };
    const { data, error } = await client.from('rounds').insert({ code: genRoundCode(), course_id: null, course_name: 'Ryder Cup', round_name: TAG, scoring_type: 'stableford', match_groups: aGrupos(x) })
      .select('id, code, match_groups, updated_at').single();
    if(error){ console.error(error); alert('No se pudo abrir la inscripción. Revisa la conexión.'); return; }
    r = deFila(data); creando = false; vigilar(); pintar();
  }
  async function alTocar(ev){
    const b = ev.target.closest('[data-ri]'); if(!b) return;
    const a = b.dataset.ri, i = Number(b.dataset.i);
    if(a === 'cerrar') return cerrar();
    if(a === 'cuenta'){ if(window.acgolfGuardarCuenta){ cerrar(); window.acgolfGuardarCuenta(); } return; }
    if(a === 'nueva'){ creando = true; return pintar(); }
    if(a === 'atras'){ creando = false; return pintar(); }
    if(a === 'crear') return crear();
    if(a === 'editar'){ editando = true; return pintar(); }
    if(a === 'volverEd'){ editando = false; return pintar(); }
    if(a === 'guardarEd'){
      const f = document.getElementById('riF').value || '', c = (document.getElementById('riC').value || '').trim();
      b.disabled = true;
      const ok = await cambiar(x => { x.fecha = f; x.campo = c; return null; });
      if(ok) editando = false; else b.disabled = false;
      return pintar();
    }
    if(b.dataset.busy) return; b.dataset.busy = '1';
    try {
      if(a === 'ap') await apuntar(i);
      else if(a === 'salir'){ if(confirm('¿Quitarte de la lista?')) await conmigo(0); }
      else if(a === 'quitar'){ if(confirm('¿Quitar a ' + b.dataset.n + ' de la lista?')) await quitar(b.dataset.n); }
      else if(a === 'pasar') await pasar(b.dataset.n, i);
      else if(a === 'cerrarlista') await cambiar(x => { x.cerrada = !x.cerrada; return null; });
      else if(a === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(mensaje()), '_blank');
      else if(a === 'copiar'){ try { await navigator.clipboard.writeText(mensaje()); b.textContent = '¡Copiado!'; } catch(e){ prompt('Copia este mensaje:', mensaje()); } }
      else if(a === 'borrar'){
        if(confirm('¿Borrar la inscripción?\nDesaparece para todos y no se puede deshacer.')){
          const res = await deleteSharedRound(r.code);
          if(!res || !res.ok) alert((res && res.msg) || 'No se pudo borrar');
          else { r = null; pintar(); }
        }
      }
    } finally { delete b.dataset.busy; }
  }

  async function abrir(code, equipo, porEnlace){
    const o = ventana(); o.hidden = false; document.body.style.overflow = 'hidden'; creando = false; editando = false;
    if(equipo !== undefined) elegido = norm(equipo);
    o.innerHTML = '<div class="ri-in"><div class="ri-vacio">Cargando…</div></div>';
    pedida = !!code && !!porEnlace;
    if(esInvitado()){ r = null; pedida = false; pintar(); return; }
    try { r = await traer(code || null); if(!r && code && !porEnlace) r = await traer(null); } catch(e){ r = null; }
    if(r){ vigilar(); try { localStorage.setItem(ULTIMA, r.code); } catch(e){} }
    borrarPend();
    pintar();
  }
  function cerrar(){
    if(ov) ov.hidden = true; document.body.style.overflow = '';
    if(/[?&]ryder=/.test(location.search)){ try { history.replaceState(null, '', location.pathname); } catch(e){} }
  }
  window.acgolfRyderIns = { abrir: () => { let u = ''; try { u = localStorage.getItem(ULTIMA) || ''; } catch(e){} return abrir(u || null, ''); }, cerrar };

  // Enlace de WhatsApp: ?ryder=CODIGO&equipo=betis. Se recuerda en el móvil (como la invitación del grupo) porque quien
  // no tiene cuenta tiene que registrarse y confirmar su correo, y en esa vuelta el enlace se pierde. Se abre en cuanto hay sesión.
  const qs = new URLSearchParams(location.search), cq = (qs.get('ryder') || '').trim().toUpperCase();
  if(cq){ try { localStorage.setItem(PEND, JSON.stringify({ c: cq, e: (qs.get('equipo') || ''), t: Date.now() })); } catch(e){} }
  const pend = leerPend();
  if(pend){
    let n = 0;
    const t = setInterval(() => {
      if(++n > 120){ clearInterval(t); return; }
      if(typeof initSupabase !== 'function' || !(window.miPerfil || esInvitado())) return;
      clearInterval(t);
      abrir(pend.c, pend.e || '', true);
    }, 500);
  }
  // Botón en el menú del Inicio, junto a «Ryder Cup» (en la app nueva de pruebas lo cubre la fila de «Jugar»)
  function ponerBoton(){
    if(document.getElementById('hmRyderIns')) return true;
    const ref = document.getElementById('hmRyder'); if(!ref) return false;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-menu-btn hm-ryder'; b.id = 'hmRyderIns';
    b.innerHTML = '<svg class="ico ry-ico" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 2.5a9.5 9.5 0 0 0 0 19z" fill="#C8102E"/><path d="M12 2.5a9.5 9.5 0 0 1 0 19z" fill="#1F4E9C"/><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Apuntarme a la Ryder</span>' + (typeof icono === 'function' ? icono('flecha', 'hm-flecha') : '');
    b.onclick = () => window.acgolfRyderIns.abrir();
    ref.parentNode.insertBefore(b, ref.nextSibling);
    return true;
  }
  let nb = 0;
  const tb = setInterval(() => { if(ponerBoton() || ++nb > 120) clearInterval(tb); }, 1000);
  // Quien es de otro grupo no recibe avisos en directo: se refresca solo cada 10 segundos mientras está abierta
  setInterval(async () => {
    if(document.hidden || !r || !ov || ov.hidden || creando || editando) return;
    const f = await traer(r.code).catch(() => null);
    if(f && f.updatedAt !== r.updatedAt){ r = f; pintar(); }
  }, 10000);
  // Al volver a la app desde WhatsApp se refresca
  document.addEventListener('visibilitychange', async () => {
    if(document.hidden || !r || !ov || ov.hidden || creando || editando) return;
    const f = await traer(r.code).catch(() => null); if(f){ r = f; pintar(); }
  });
})();
