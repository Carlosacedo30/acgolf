/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Aviso «Disponible manual de ayuda» al abrir la app, botón «Visto» y soporte por correo ---
// El aviso sale al abrir la app hasta que el jugador pulsa «Visto» en el manual.
// EDICION: al cambiarla, el aviso vuelve a salir a todos con las novedades (aunque ya hubieran pulsado «Visto»).
// «Visto» se guarda en su cuenta (le vale en cualquier móvil) y también en este móvil.
// Soporte: abre el correo para escribir a avisos@acgolf.es (nunca un correo personal).
(function(){
  const CLAVE = 'acgolfManualVisto';
  const EDICION = '2026-10b';
  const AVISO = { t: 'Novedades en la app', s: 'Curro, el caddie andaluz, «¿Cómo jugué?» con gráficas, campos nuevos y más.' };
  const SOPORTE = 'avisos@acgolf.es';
  const client = (typeof initSupabase === 'function') ? initSupabase() : null;
  const enMovil = () => { try { return localStorage.getItem(CLAVE) === EDICION; } catch(e){ return false; } };
  let enCuenta = false;

  const correoSoporte = () => {
    const grupo = window.miPerfil && window.miPerfil.grupo ? ' (' + window.miPerfil.grupo + ')' : '';
    return 'mailto:' + SOPORTE + '?subject=' + encodeURIComponent('Ayuda con acgolf' + grupo);
  };
  const visto = () => enMovil() || enCuenta;

  async function marcarVisto(){
    try { localStorage.setItem(CLAVE, EDICION); } catch(e){}
    enCuenta = true;
    quitarAviso();
    if(client){ try { await client.auth.updateUser({ data: { manual_visto: EDICION } }); } catch(e){} }
  }

  function quitarAviso(){ const a = document.getElementById('ayAviso'); if(a) a.remove(); }

  function ponerAviso(){
    if(visto() || document.getElementById('ayAviso')) return;
    try { if(sessionStorage.getItem('acgolfManualLuego') === '1') return; } catch(e){}
    const a = document.createElement('div');
    a.id = 'ayAviso'; a.className = 'ay-aviso'; a.setAttribute('role', 'status');
    a.innerHTML = '<div class="ay-aviso-txt"><b>' + AVISO.t + '</b><span>' + AVISO.s + '</span></div>'
      + '<button type="button" class="ay-aviso-abrir" id="ayAbrir">Ver</button>'
      + '<button type="button" class="ay-aviso-cerrar" id="ayLuego">Luego</button>';
    document.body.appendChild(a);
    document.getElementById('ayAbrir').onclick = () => { quitarAviso(); if(window.acgolfManual) window.acgolfManual.abrir(); };
    document.getElementById('ayLuego').onclick = () => { try { sessionStorage.setItem('acgolfManualLuego', '1'); } catch(e){} quitarAviso(); };
  }

  // Esperar a que el jugador haya entrado (y no esté en la pantalla de la cuenta)
  async function arrancar(){
    for(let i = 0; i < 60 && !window.miPerfil; i++) await new Promise(r => setTimeout(r, 500));
    if(!window.miPerfil) return;
    if(client){
      try { const { data } = await client.auth.getUser(); enCuenta = !!(data && data.user && data.user.user_metadata && data.user.user_metadata.manual_visto === EDICION); } catch(e){}
    }
    if(enCuenta){ try { localStorage.setItem(CLAVE, EDICION); } catch(e){} return; }
    for(let i = 0; i < 40; i++){
      const gate = document.getElementById('cuentaGate');
      if(!gate || gate.hidden) break;
      await new Promise(r => setTimeout(r, 500));
    }
    setTimeout(ponerAviso, 800);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();

  window.acgolfAyuda = { marcarVisto, visto, correoSoporte, SOPORTE };
})();
