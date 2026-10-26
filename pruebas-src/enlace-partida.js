/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Enlace directo a una partida: .../pruebas/?partida=CODIGO abre esa partida en cuanto el jugador ha entrado con su cuenta.
// También .../pruebas/?conv=CODIGO abre la convocatoria (si al cargar todavía no había sesión, se abre al entrar).
// Y los avisos del móvil: ?ver=ganadores&semana=AAAA-MM-DD abre los Ganadores de esa semana; ?ver=handicap abre Mi hándicap.
(function(){
  const qs = new URLSearchParams(location.search);
  const ver = (qs.get('ver') || '').trim().toLowerCase();
  if(ver){
    const semana = (qs.get('semana') || '').trim();
    let nv = 0;
    const tv = setInterval(()=>{
      if(++nv > 120){ clearInterval(tv); return; }
      if(!window.miPerfil || typeof goTo !== 'function') return;
      clearInterval(tv);
      try { history.replaceState(null, '', location.pathname); } catch(e){}
      if(ver === 'ganadores'){
        goTo(0);
        if(typeof homeFoco === 'function') homeFoco('premios');
        if(/^\d{4}-\d{2}-\d{2}$/.test(semana) && typeof window.gnVerSemana === 'function') window.gnVerSemana(semana);
        window.scrollTo(0, 0);
      } else if(ver === 'handicap'){
        goTo(0);
        const bt = document.getElementById('hmHcp');   // lo mismo que tocar «Mi hándicap» en el Inicio
        if(bt) bt.click(); else if(typeof hcpAbrir === 'function') hcpAbrir();
      } else if(ver === 'liga'){
        goTo(6);
      }
    }, 500);
  }
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
