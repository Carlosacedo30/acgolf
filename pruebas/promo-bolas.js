/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// --- Promoción: pack de 3 bolas TaylorMade SpeedSoft Ink gratis con cualquier pedido en Bolarecuperada ---
// · Tarjeta en el Inicio (debajo de Crear partida y del próximo partido). Al tocarla se abre el anuncio completo.
// · Aviso al abrir la app: una sola vez por jugador, después del video y de la bienvenida del patrocinador.
// · Botón grande «Ir a la tienda» (Bolarecuperada) y botón grande «Cerrar».
// · Se quita sola el 1 de enero de 2027: no hay que acordarse de borrarla.
(function(){
  const FIN = new Date(2027, 0, 1);              // a partir de este día ya no sale nada
  if(new Date() >= FIN) return;
  const WEB = 'https://bolarecuperada.com';
  const IMG = 'promo-bolas.jpg?v=1';
  const MINI = 'promo-bolas-mini.jpg?v=1';
  const VISTO = 'acgolfPromoBolas2026';         // el aviso ya salió una vez a este jugador

  function abrir(){
    if(document.getElementById('pbAnuncio')) return;
    const el = document.createElement('div');
    el.id = 'pbAnuncio'; el.className = 'pb-velo';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '3 bolas gratis con tu pedido');
    el.innerHTML = '<div class="pb-caja">'
      + '<img class="pb-img" src="' + IMG + '" alt="Pack de 3 bolas TaylorMade SpeedSoft Ink gratis con cualquier pedido. Escribe acgolf en observaciones. Válido hasta el 31 de diciembre de 2026.">'
      + '<a class="pb-ir" href="' + WEB + '" target="_blank" rel="noopener sponsored">Ir a la tienda</a>'
      + '<button type="button" class="pb-cerrar">Cerrar</button>'
      + '</div>';
    document.body.appendChild(el);
    const cerrar = () => { el.classList.add('fuera'); setTimeout(() => el.remove(), 300); };
    el.querySelector('.pb-cerrar').addEventListener('click', cerrar);
    el.querySelector('.pb-ir').addEventListener('click', () => setTimeout(cerrar, 300));
    el.addEventListener('click', e => { if(e.target === el) cerrar(); });
  }

  // ---------- Tarjeta en el Inicio ----------
  function tarjeta(){
    const conv = document.getElementById('convHome');
    if(!conv) return;
    let t = document.getElementById('pbTarjeta');
    if(!t){
      t = document.createElement('button');
      t.type = 'button'; t.id = 'pbTarjeta'; t.className = 'pb-tarjeta';
      // Pequeña y sin detalle: el detalle sale al tocarla
      t.innerHTML = '<span class="pb-txt"><span class="pb-tit">🎁 Regalo: 3 bolas GRATIS</span></span>'
        + '<span class="pb-flecha" aria-hidden="true">›</span>';
      t.addEventListener('click', abrir);
    }
    if(conv.nextElementSibling !== t) conv.parentNode.insertBefore(t, conv.nextSibling);
  }

  // ---------- Aviso al abrir la app (una sola vez) ----------
  function aviso(){
    try { if(localStorage.getItem(VISTO) === '1') return; } catch(e){ return; }
    // después de la bienvenida del patrocinador (dura unos 2 segundos)
    setTimeout(() => {
      // si se ha abierto directamente una partida, no se molesta: saldrá la próxima vez
      const s3 = document.querySelector('.screen[data-screen="3"]');
      if(s3 && s3.offsetParent !== null) return;
      try { localStorage.setItem(VISTO, '1'); } catch(e){}
      abrir();
    }, 2700);
  }

  function arrancar(){
    tarjeta();
    setInterval(tarjeta, 1000);
    (window.acgolfIntro || Promise.resolve()).then(aviso);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
