/* © 2026 Carlos Acedo Domínguez. Todos los derechos reservados. Ver LICENSE. */
// acgolf como app: guarda la app en el móvil y explica cómo instalarla según el móvil y el navegador.
// - Dentro de WhatsApp, Instagram o Facebook no se puede instalar: se pide abrirla en Chrome o Safari.
// - Android con Chrome: botón «Instalar» (o, si Chrome no lo ofrece, el camino por el menú ⋮).
// - iPhone con Safari: Compartir → «Añadir a pantalla de inicio».
(function(){
  if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if(instalada) return;

  const ua = navigator.userAgent || '';
  const iphone = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  const movil = iphone || android;
  const dentroDeApp = /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|Telegram|; wv\)/i.test(ua);
  const iphoneNoSafari = iphone && /CriOS|FxiOS|EdgiOS/i.test(ua);

  // Si lo cierra, no se le vuelve a enseñar en 3 días
  const HOY = Date.now();
  let cerradoHasta = 0; try { cerradoHasta = +localStorage.getItem('acgolfInstalarCerrado') || 0; } catch(e){}

  let aviso = null, eventoInstalar = null;
  const ICO_COMPARTIR = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Compartir"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  function pintar(titulo, texto, boton){
    if(aviso) aviso.remove();
    aviso = document.createElement('div');
    aviso.className = 'ins-aviso';
    aviso.setAttribute('role', 'dialog');
    aviso.innerHTML = '<img src="icon-192.png" alt="" width="44" height="44"><div class="ins-txt"><b>' + titulo + '</b><span>' + texto + '</span></div>'
      + (boton ? '<button type="button" class="ins-si">' + boton.texto + '</button>' : '')
      + '<button type="button" class="ins-no" aria-label="Cerrar">✕</button>';
    document.body.appendChild(aviso);
    if(boton) aviso.querySelector('.ins-si').onclick = boton.accion;
    aviso.querySelector('.ins-no').onclick = () => {
      aviso.remove(); aviso = null;
      try { localStorage.setItem('acgolfInstalarCerrado', String(Date.now() + 3 * 24 * 3600 * 1000)); } catch(e){}
    };
  }

  function explicar(){
    if(dentroDeApp){
      pintar('Ábrela en el navegador',
        iphone ? 'Desde WhatsApp no se puede instalar. Toca <b>⋯</b> o el icono de <b>Safari</b> y elige <b>«Abrir en Safari»</b>.'
               : 'Desde WhatsApp no se puede instalar. Toca <b>⋮</b> arriba a la derecha y elige <b>«Abrir en Chrome»</b>.',
        { texto: 'Copiar', accion: copiarEnlace });
      return true;
    }
    if(iphoneNoSafari){
      pintar('Instala acgolf', 'En iPhone se instala desde <b>Safari</b>: abre acgolf.es en Safari, toca ' + ICO_COMPARTIR + ' y <b>«Añadir a pantalla de inicio»</b>.', { texto: 'Copiar', accion: copiarEnlace });
      return true;
    }
    if(iphone){
      pintar('Instala acgolf', 'Toca ' + ICO_COMPARTIR + ' <b>Compartir</b> (abajo) y después <b>«Añadir a pantalla de inicio»</b>.');
      return true;
    }
    if(android && !eventoInstalar){
      pintar('Instala acgolf', 'Toca <b>⋮</b> arriba a la derecha de Chrome y elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.');
      return true;
    }
    return false;
  }

  async function copiarEnlace(){
    const b = aviso && aviso.querySelector('.ins-si');
    try { await navigator.clipboard.writeText('https://acgolf.es'); if(b) b.textContent = 'Copiado'; }
    catch(e){ prompt('Copia esta dirección y pégala en el navegador:', 'https://acgolf.es'); }
  }

  // Android con Chrome: el botón de verdad
  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    eventoInstalar = ev;
    if(cerradoHasta > HOY) return;
    pintar('Instala acgolf', 'Tendrás el icono en el móvil, como cualquier app.', { texto: 'Instalar', accion: async () => {
      try { eventoInstalar.prompt(); await eventoInstalar.userChoice; } catch(e){}
      if(aviso){ aviso.remove(); aviso = null; }
    }});
  });
  window.addEventListener('appinstalled', () => { if(aviso){ aviso.remove(); aviso = null; } });

  // Para que se pueda pedir desde cualquier botón de la app («Instalar la app»)
  window.acgolfInstalar = function(){
    if(eventoInstalar){ eventoInstalar.prompt(); return; }
    if(!explicar()) pintar('Instala acgolf', 'Abre <b>acgolf.es</b> en el móvil, con Chrome (Android) o Safari (iPhone), y sigue los pasos que salen abajo.');
  };

  // Si en unos segundos el móvil no ha ofrecido «Instalar» por su cuenta, se explica cómo hacerlo
  if(movil && cerradoHasta <= HOY) setTimeout(() => { if(!aviso) explicar(); }, 3500);
})();
