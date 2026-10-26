/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Inicio: botón «Ir App Hato Verde», discreto, debajo del menú del inicio ---
// Solo en los grupos Los Iscariotes y Cajapollos (juegan en Club Hato Verde).
// Abre la app oficial del club (Hato Verde Club de Golf, de Golfmanager):
// · Android: abre la app si está instalada; si no, su ficha de Google Play para instalarla.
// · iPhone, iPad y Mac: la ficha de la App Store, que pone «Abrir» si ya la tienes (iOS no deja abrir otra app directamente).
(function(){
  const APPLE = 'https://apps.apple.com/es/app/hato-verde-club-de-golf/id6791977609';
  const PAQUETE = 'app.hatoverde.golfmanager';
  const PLAY = 'https://play.google.com/store/apps/details?id=' + PAQUETE;
  const GRUPOS = /^(los iscariotes|cajapollos?)$/i;
  const esAndroid = /android/i.test(navigator.userAgent);
  const DESTINO = esAndroid ? 'intent://#Intent;package=' + PAQUETE + ';S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end' : APPLE;

  function grupoActual(){
    return String(window.acgolfGrupo || (window.miPerfil && window.miPerfil.grupo) || '').trim();
  }

  function poner(){
    const crear = document.getElementById('prAbrirBtn');
    const menu = document.querySelector('#homeAhora .home-menu');
    let b = document.getElementById('irHatoBtn');
    if(!crear || !GRUPOS.test(grupoActual())){ if(b) b.remove(); return; }
    if(!b){
      b = document.createElement('a');
      b.id = 'irHatoBtn'; b.className = 'ih-btn';
      b.href = DESTINO; b.rel = 'noopener';
      if(!esAndroid) b.target = '_blank';
      b.innerHTML = '<span class="ih-logo"><img src="logo-hato-verde.png?v=1" alt=""></span>'
        + '<span class="ih-txt">Ir App Hato Verde<small>Reservas y carnet del club</small></span>'
        + '<span class="ih-flecha" aria-hidden="true">›</span>';
    }
    // Va después del menú (Clasificación, Ganadores…): ya no compite con CREAR PARTIDA
    if(menu){ if(menu.nextElementSibling !== b) menu.parentNode.insertBefore(b, menu.nextSibling); }
    else if(crear.parentNode.lastElementChild !== b) crear.parentNode.appendChild(b);
  }

  function arrancar(){ poner(); setInterval(poner, 1000); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
