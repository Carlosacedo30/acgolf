/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Enlace directo a una partida: .../pruebas/?partida=CODIGO abre esa partida en cuanto el jugador ha entrado con su cuenta.
// También .../pruebas/?conv=CODIGO abre la convocatoria (si al cargar todavía no había sesión, se abre al entrar).
(function(){
  const qs = new URLSearchParams(location.search);
  const convCode = (qs.get('conv') || '').trim().toUpperCase();
  if(convCode){
    let n = 0;
    const tc = setInterval(async ()=>{
      if(++n > 120){ clearInterval(tc); return; }
      if(!window.miPerfil || typeof convFetch !== 'function') return;
      clearInterval(tc);
      const ov = document.getElementById('convOverlay');
      if(ov && !ov.hidden && typeof conv !== 'undefined' && conv && conv.code === convCode) return; // ya está abierta
      const c = await convFetch(convCode).catch(()=> null);
      if(!c){ alert('No se pudo abrir la convocatoria.'); return; }
      conv = c;
      if(typeof convWatch === 'function') convWatch();
      openConv(false);
    }, 500);
  }
  const code = (qs.get('partida') || '').trim().toUpperCase();
  if(!code) return;
  let intentos = 0;
  const t = setInterval(async ()=>{
    intentos++;
    if(intentos > 120){ clearInterval(t); return; } // 60 segundos como máximo
    if(!window.miPerfil || typeof joinSharedRound !== 'function') return;
    clearInterval(t);
    const res = await joinSharedRound(code);
    try { history.replaceState(null, '', location.pathname); } catch(e){}
    if(res && res.ok){ if(typeof goTo === 'function') goTo(3); }
    else alert((res && res.msg) || 'No se pudo abrir la partida.');
  }, 500);
})();
