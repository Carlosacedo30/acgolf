/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Jugador invitado (entró con «Probar sin registrarme") ---
// · Puede crear partidas, apuntar golpes, ver la tarjeta y terminar la partida (y oír a Curro y Lola).
// · Clasificación, medallas, gráficas, historial, derbi, ligas y grupo se ven con candado 🔒 (no se esconden):
//   al tocarlos sale una ventana para guardar la cuenta.
// · Al terminar su PRIMERA partida sale una sola vez la ventana «¡Partida terminada!». Nada de avisos fijos.
// cuenta.js pone <html class="es-invitado"> y deja window.acgolfGuardarCuenta para guardar la cuenta.
(function(){
  'use strict';
  const BLOQUEADOS = [
    { sel: '#hmLiga, #homeLigaSemana, [data-foco="premios"], [data-foco="medallas"]', que: 'la clasificación, los ganadores y las medallas' },
    { sel: '#hmDiagnostico', que: '«¿Cómo jugué?» con tus gráficas y tu evolución' },
    { sel: '#homeRecientes, [data-foco="recientes"]', que: 'el historial de tus partidas' },
    { sel: '#hmDerbi', que: 'el derbi contra otros jugadores' },
    { sel: '#hmLigas, #hmRyder', que: 'las ligas y la Ryder' },
    { sel: '#homeVivoBtn', que: 'las partidas en directo de tu grupo' },
    { sel: '.cg-selgrupo, #convHomeNew', que: 'los grupos, la liga y organizar partidos con tus amigos' },
  ];
  const esInvitado = () => document.documentElement.classList.contains('es-invitado');
  const CLAVE_PRIMERA = 'acgolfInvitadoPrimeraHecha';

  function ventana(titulo, texto){
    let ov = document.getElementById('invOverlay');
    if(!ov){
      ov = document.createElement('div'); ov.id = 'invOverlay'; ov.className = 'inv-ov';
      document.body.appendChild(ov);
    }
    ov.innerHTML = '<div class="inv-card" role="dialog" aria-modal="true">'
      + '<div class="inv-pareja"><img src="curro.webp?v=1" alt=""><img src="lola.webp?v=1" alt=""></div>'
      + '<h2>' + titulo + '</h2><p>' + texto + '</p>'
      + '<button type="button" class="inv-si">Guardar mi cuenta</button>'
      + '<button type="button" class="inv-no">Luego</button>'
      + '<small>Gratis. Tus partidas de prueba se quedan guardadas.</small></div>';
    ov.hidden = false;
    ov.querySelector('.inv-no').onclick = () => { ov.hidden = true; };
    ov.onclick = e => { if(e.target === ov) ov.hidden = true; };
    ov.querySelector('.inv-si').onclick = () => { ov.hidden = true; if(window.acgolfGuardarCuenta) window.acgolfGuardarCuenta(); };
  }

  // Candados: al tocar algo bloqueado, en lugar de abrirlo sale la ventana
  document.addEventListener('click', e => {
    if(!esInvitado() || !e.target || !e.target.closest) return;
    for(const b of BLOQUEADOS){
      if(e.target.closest(b.sel)){
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        ventana('🔒 Esto es para jugadores con cuenta', 'Guarda tu cuenta gratis para ver ' + b.que + '.');
        return;
      }
    }
  }, true);

  // Al terminar la primera partida (de la tarjeta a los resultados), una sola vez
  function vigilarFinal(){
    if(typeof window.goTo !== 'function' || window.goTo.__inv) return;
    const orig = window.goTo;
    let pantalla = null;
    const nuevo = function(n){
      const antes = pantalla; pantalla = n;
      const r = orig.apply(this, arguments);
      try {
        if(esInvitado() && +n === 4 && +antes === 3 && localStorage.getItem(CLAVE_PRIMERA) !== '1'){
          localStorage.setItem(CLAVE_PRIMERA, '1');
          setTimeout(() => ventana('¡Partida terminada! ⛳', 'Guarda tus partidas y desbloquea la clasificación, las medallas y tu evolución con gráficas.'), 1200);
        }
      } catch(x){}
      return r;
    };
    nuevo.__inv = true;
    window.goTo = nuevo;
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilarFinal); else vigilarFinal();
  window.addEventListener('load', vigilarFinal);
})();
