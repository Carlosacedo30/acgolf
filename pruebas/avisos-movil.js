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

  // Pinta la opción en «Mi cuenta»
  async function pintar(box, perfil, msg){
    if(!box) return;
    const titulo = '<b>Avisos en el móvil</b><br>';
    if(iphone && !instalada()){
      box.innerHTML = '<div class="cg-acepto" style="margin:4px 0 2px;display:block;"><span>' + titulo
        + 'En el iPhone los avisos solo llegan con la app instalada en la pantalla de inicio. Instálala y vuelve aquí para activarlos.</span></div>';
      return;
    }
    if(!puede()){
      box.innerHTML = '<div class="cg-acepto" style="margin:4px 0 2px;display:block;"><span>' + titulo + 'Este móvil o navegador no permite avisos.</span></div>';
      return;
    }
    if(Notification.permission === 'denied'){
      box.innerHTML = '<div class="cg-acepto" style="margin:4px 0 2px;display:block;"><span>' + titulo
        + 'Los avisos están bloqueados en este móvil. Para activarlos: ' + (iphone ? 'Ajustes del iPhone → Notificaciones → acgolf → Permitir notificaciones.' : 'mantén pulsado el icono de acgolf → Información de la app → Notificaciones.') + '</span></div>';
      return;
    }
    const s = await suscripcion();
    const activos = !!s && Notification.permission === 'granted';
    box.innerHTML = '<label class="cg-acepto" style="margin:4px 0 2px;"><input type="checkbox" id="amMovil"' + (activos ? ' checked' : '') + '><span>' + titulo
      + 'Te llega un aviso al móvil cuando te apuntan en una partida.</span></label>'
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

  window.acgolfAvisosMovil = { pintar, partidaNueva };
})();
