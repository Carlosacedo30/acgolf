/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Enlace directo a una partida: .../pruebas/?partida=CODIGO abre esa partida en cuanto el jugador ha entrado con su cuenta.
(function(){
  const code = (new URLSearchParams(location.search).get('partida') || '').trim().toUpperCase();
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
