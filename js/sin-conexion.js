/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// Aviso de «Sin conexión»: la app sigue funcionando y lo que se apunta se sube solo al volver la cobertura.
(function(){
  let barra = null, quitar = null;
  function pintar(texto, ok){
    clearTimeout(quitar);
    if(!barra){
      barra = document.createElement('div');
      barra.setAttribute('role', 'status');
      barra.style.cssText = 'position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top, 0px) + 10px);z-index:10002;padding:12px 14px;border-radius:14px;font:700 15px/1.35 Archivo, Barlow, sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45)';
      document.body.appendChild(barra);
    }
    barra.style.background = ok ? '#1E3A24' : '#3A2410';
    barra.style.color = ok ? '#C6F24E' : '#FFD9A8';
    barra.style.boxShadow = '0 8px 24px rgba(0,0,0,.45), inset 0 0 0 1.5px ' + (ok ? '#C6F24E' : '#F2A007');
    barra.textContent = texto;
    barra.hidden = false;
    if(ok) quitar = setTimeout(() => { if(barra) barra.hidden = true; }, 3500);
  }
  window.addEventListener('offline', () => pintar('Sin conexión. Puedes seguir apuntando: se guarda en el móvil y se sube solo al volver la cobertura.', false));
  window.addEventListener('online', () => pintar('Conexión recuperada. Subiendo lo pendiente…', true));
  if(navigator.onLine === false) (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => pintar('Sin conexión. Puedes seguir apuntando: se guarda en el móvil y se sube solo al volver la cobertura.', false)) : pintar('Sin conexión. Puedes seguir apuntando: se guarda en el móvil y se sube solo al volver la cobertura.', false));
})();
