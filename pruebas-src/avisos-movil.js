/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Avisos en el móvil (notificaciones), como los de WhatsApp, aunque la app esté cerrada.
// - Se activan en «Mi cuenta» → «Avisos en el móvil». El móvil pregunta una vez «¿Permitir avisos?».
// - iPhone: solo funcionan con la app instalada en la pantalla de inicio (lo pide Apple).
// - De momento: aviso de «Nueva partida» a los apuntados (lo manda el servidor, función «avisar-movil»).
(function(){
  const LLAVE = 'BBAJE9Q8buIbOXVbOvfYsizs9nDzgqnz9J05v8KCkncx96wE1rXcVzgHp1d_qAaFA0Ap531_a-4x1YlQsROwPIg';
  const ua = navigator.userAgent || '';
  const iphone = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const puede = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const base = () => location.origin + location.pathname.replace(/[^/]*$/, '');

  function llaveBytes(b64){
    const p = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(p); const out = new Uint8Array(raw.length);
    for(let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function registro(){
    const r = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    return r;
  }
  async function suscripcion(){
    if(!puede()) return null;
    try { const r = await navigator.serviceWorker.getRegistration(); return r ? await r.pushManager.getSubscription() : null; } catch(e){ return null; }
  }

  async function activar(){
    const permiso = await Notification.requestPermission();   // tiene que ir justo al tocar (si no, el iPhone no pregunta)
    if(permiso !== 'granted') throw new Error('permiso');
    const r = await registro();
    let s = await r.pushManager.getSubscription();
    if(!s) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveBytes(LLAVE) });
    const j = s.toJSON();
    const { error } = await initSupabase().rpc('movil_guardar', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    if(error) throw error;
  }
  async function desactivar(){
    const s = await suscripcion();
    if(!s) return;
    try { await initSupabase().rpc('movil_quitar', { p_endpoint: s.endpoint }); } catch(e){}
    try { await s.unsubscribe(); } catch(e){}
  }

  // Pinta la opción en «Mi cuenta»: tarjeta oscura con campana lima e interruptor (diseño A, elegido por Carlos)
  const CAMPANA = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/><path d="M21 6.73a9 9 0 0 0 -2.5 -3.73"/><path d="M3 6.73a9 9 0 0 1 2.5 -3.73"/></svg>';
  function tarjeta(sub, derecha){
    return '<div class="am-card"><div class="am-ico">' + CAMPANA + '</div>'
      + '<div class="am-txt"><b>Avisos en el móvil</b><span>' + sub + '</span></div>' + (derecha || '') + '</div>';
  }
  async function pintar(box, perfil, msg){
    if(!box) return;
    if(iphone && !instalada()){
      box.innerHTML = tarjeta('Instala la app en la pantalla de inicio para activarlos');
      return;
    }
    if(!puede()){ box.innerHTML = tarjeta('Este móvil no permite avisos'); return; }
    if(Notification.permission === 'denied'){
      box.innerHTML = tarjeta('Bloqueados. Actívalos en ' + (iphone ? 'Ajustes → Notificaciones → acgolf' : 'la información de la app → Notificaciones'));
      return;
    }
    const s = await suscripcion();
    const activos = !!s && Notification.permission === 'granted';
    box.innerHTML = '<label class="am-lbl">' + tarjeta(activos ? 'Partidas, recordatorios y premios' : 'Actívalos para no perderte nada',
        '<span class="am-sw"><input type="checkbox" id="amMovil" role="switch"' + (activos ? ' checked' : '') + ' aria-label="Avisos en el móvil"><i></i></span>') + '</label>'
      + (perfil && perfil.es_super && activos ? '<button type="button" class="cg-btn ghost" id="amPrueba">📳 Mandarme un aviso de prueba</button>' : '');
    const cb = box.querySelector('#amMovil');
    cb.onchange = async () => {
      cb.disabled = true;
      try {
        if(cb.checked){ await activar(); msg('Avisos activados en este móvil.', true); }
        else { await desactivar(); msg('Ya no te llegarán avisos a este móvil.', true); }
      } catch(e){
        console.error('Avisos al móvil', e);
        cb.checked = !cb.checked;
        msg(e && e.message === 'permiso' ? 'Para recibir avisos tienes que tocar «Permitir» cuando el móvil lo pregunte.' : 'No se pudieron cambiar los avisos. Inténtalo otra vez.');
      }
      cb.disabled = false;
      pintar(box, perfil, msg);
    };
    const bp = box.querySelector('#amPrueba');
    if(bp) bp.onclick = async () => {
      bp.disabled = true;
      try {
        const { data, error } = await initSupabase().functions.invoke('avisar-movil', { body: { prueba: true, web: base() } });
        if(error || !data || !data.enviados) throw new Error((data && data.error) || (error && error.message) || 'sin móviles');
        msg('Aviso enviado. Te llegará en unos segundos' + (instalada() ? ' (mejor con la app cerrada).' : '.'), true);
      } catch(e){ msg('No se pudo mandar el aviso. ' + (e.message || '')); }
      bp.disabled = false;
    };
  }

  // Partida nueva: avisa al móvil de los apuntados (lo llama aviso-partida.js)
  async function partidaNueva(code){
    const client = initSupabase();
    if(!client || !client.functions) return 0;
    try {
      const { data, error } = await client.functions.invoke('avisar-movil', { body: { code, web: base() } });
      if(error) throw error;
      return (data && data.enviados) || 0;
    } catch(e){ console.error('No se pudo avisar al móvil', e); return 0; }
  }

  // Pregunta una sola vez en cada móvil «¿Quieres recibir avisos?» (el móvil obliga a que lo acepte cada uno)
  const VISTO = 'acgolfPreguntaAvisos';
  const hayVentana = () => document.body.classList.contains('cg-open')
    || document.querySelector('.iv, .pb-velo, .pd-bienv, .ay-aviso, .am-preg');
  async function preguntar(intento){
    try { if(localStorage.getItem(VISTO)) return; } catch(e){ return; }
    if(!puede() || (iphone && !instalada()) || Notification.permission !== 'default') return;
    const client = typeof initSupabase === 'function' && initSupabase();
    if(!client) return;
    try { const { data } = await client.auth.getSession(); if(!data || !data.session) return; } catch(e){ return; }
    if(await suscripcion()) return;
    if(hayVentana()){ if((intento || 0) < 40) setTimeout(() => preguntar((intento || 0) + 1), 4000); return; }
    const caja = document.createElement('div');
    caja.className = 'am-preg'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-label', 'Avisos de tus partidas');
    caja.innerHTML = '<div class="am-preg-c"><div class="am-ico">' + CAMPANA + '</div>'
      + '<h2>¿Quieres que acgolf te avise de tus partidas?</h2>'
      + '<p>Te llegará un aviso al móvil.</p>'
      + '<p class="am-preg-n">Al tocar «Sí, quiero» el móvil te preguntará: toca <b>«Permitir»</b>.</p>'
      + '<button type="button" class="am-preg-si">Sí, quiero</button>'
      + '<button type="button" class="am-preg-no">Ahora no</button>'
      + '<small>Puedes cambiarlo cuando quieras en «Mi cuenta».</small></div>';
    document.body.appendChild(caja);
    const fin = () => { try { localStorage.setItem(VISTO, '1'); } catch(e){} caja.remove(); };
    caja.querySelector('.am-preg-no').onclick = fin;
    caja.querySelector('.am-preg-si').onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Un momento…';
      try { await activar(); caja.querySelector('.am-preg-c').innerHTML = '<div class="am-ico">' + CAMPANA + '</div><h2>¡Avisos activados!</h2><p>Ya te llegarán a este móvil.</p><button type="button" class="am-preg-si">Vale</button>';
        caja.querySelector('.am-preg-si').onclick = fin; try { localStorage.setItem(VISTO, '1'); } catch(_){} }
      catch(err){ console.error('Avisos al móvil', err); fin(); }
    };
  }
  setTimeout(() => preguntar(0), 6000);

  window.acgolfAvisosMovil = { pintar, partidaNueva };
})();
